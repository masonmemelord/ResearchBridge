"use client";

import {
  isAuthApiError,
  isAuthSessionMissingError,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getSupabaseBrowserClient } from "../supabase/client";
import {
  AUTH_MESSAGES,
  fetchProfileRole,
  type ProfileLookup,
  type SupportedRole,
} from "./profile";

type SessionUser = { userId: string; email: string | null };

export type AuthState =
  | { status: "loading" }
  /** `endedByUser` is true right after this tab's own sign-out, until the next navigation. */
  | { status: "signed-out"; endedByUser: boolean }
  | ({ status: "signed-in"; role: SupportedRole } & SessionUser)
  | ({ status: "profile-missing" } & SessionUser)
  | ({ status: "unsupported-role"; role: string } & SessionUser)
  | { status: "error"; message: string; hasSession: boolean };

export type SignOutResult = { ok: true } | { ok: false; message: string };

type AuthContextValue = {
  state: AuthState;
  isSigningOut: boolean;
  /** Re-runs the session and profile check after a recoverable failure. */
  retry: () => void;
  /** Ends the session and returns the user to the homepage. */
  signOut: () => Promise<SignOutResult>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const SIGN_OUT_FAILED =
  "Sign-out did not finish because Supabase could not be reached. Check your internet connection and try again.";

function toSessionUser(user: User): SessionUser {
  return { userId: user.id, email: user.email ?? null };
}

function stateFromProfile(user: SessionUser, profile: ProfileLookup): AuthState {
  switch (profile.kind) {
    case "role":
      return { status: "signed-in", role: profile.role, ...user };
    case "unsupported-role":
      return { status: "unsupported-role", role: profile.role, ...user };
    case "missing":
      return { status: "profile-missing", ...user };
    case "error":
      console.error("Profile lookup failed", profile.error);
      return { status: "error", message: AUTH_MESSAGES.profileUnavailable, hasSession: true };
  }
}

/**
 * Single source of client-side auth state: who is signed in and which
 * `profiles.role` they hold. This drives navigation and page guards only;
 * Supabase RLS is the authorization boundary for every read and write.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<AuthState>({ status: "loading" });
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [checkCount, setCheckCount] = useState(0);
  const [trackedPathname, setTrackedPathname] = useState(pathname);

  /** Incremented on every auth change so stale lookups cannot overwrite newer state. */
  const generationRef = useRef(0);
  const resolvedUserIdRef = useRef<string | null>(null);
  const signingOutRef = useRef(false);

  if (pathname !== trackedPathname) {
    setTrackedPathname(pathname);
    if (state.status === "signed-out" && state.endedByUser) {
      setState({ status: "signed-out", endedByUser: false });
    }
  }

  useEffect(() => {
    let active = true;

    async function resolve(client: SupabaseClient, generation: number) {
      const isCurrent = () => active && generation === generationRef.current;
      const { data, error } = await client.auth.getUser();
      if (!isCurrent()) return;

      if (!data.user) {
        if (!error || isAuthSessionMissingError(error)) {
          setState({ status: "signed-out", endedByUser: false });
        } else if (isAuthApiError(error) && [401, 403, 404].includes(error.status)) {
          // The stored session was rejected (expired, revoked, or deleted user).
          // Clearing it emits SIGNED_OUT, which moves the state to signed-out.
          console.warn("Stored Supabase session was rejected", error);
          await client.auth.signOut({ scope: "local" });
        } else {
          console.error("Supabase session check failed", error);
          setState({
            status: "error",
            message:
              "We could not confirm whether you are signed in. Check your internet connection and try again.",
            hasSession: true,
          });
        }
        return;
      }

      resolvedUserIdRef.current = data.user.id;
      const profile = await fetchProfileRole(client, data.user.id);
      if (!isCurrent()) return;
      setState(stateFromProfile(toSessionUser(data.user), profile));
    }

    let supabase: SupabaseClient;
    try {
      supabase = getSupabaseBrowserClient();
    } catch (configurationError) {
      console.error("Supabase is not configured", configurationError);
      void Promise.resolve().then(() => {
        if (active) {
          setState({ status: "error", message: AUTH_MESSAGES.notConfigured, hasSession: false });
        }
      });
      return () => {
        active = false;
      };
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        generationRef.current += 1;
        resolvedUserIdRef.current = null;
        setState({ status: "signed-out", endedByUser: signingOutRef.current });
        return;
      }
      if (
        (event === "SIGNED_IN" || event === "USER_UPDATED") &&
        session &&
        session.user.id !== resolvedUserIdRef.current
      ) {
        generationRef.current += 1;
        resolvedUserIdRef.current = session.user.id;
        setState({ status: "loading" });
        void resolve(supabase, generationRef.current);
      }
    });

    generationRef.current += 1;
    void resolve(supabase, generationRef.current);

    return () => {
      active = false;
      generationRef.current += 1;
      listener.subscription.unsubscribe();
    };
  }, [checkCount]);

  const retry = useCallback(() => {
    resolvedUserIdRef.current = null;
    setState({ status: "loading" });
    setCheckCount((count) => count + 1);
  }, []);

  const signOut = useCallback(async (): Promise<SignOutResult> => {
    let supabase: SupabaseClient;
    try {
      supabase = getSupabaseBrowserClient();
    } catch {
      return { ok: false, message: AUTH_MESSAGES.notConfigured };
    }

    signingOutRef.current = true;
    setIsSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        // supabase-js clears the local session for most failures. Only report
        // a failure when this browser is still signed in.
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          console.error("Supabase sign-out failed", error);
          return { ok: false, message: SIGN_OUT_FAILED };
        }
        console.warn("Signed out locally; the server could not revoke the session", error);
      }
      router.replace("/");
      return { ok: true };
    } catch (error) {
      console.error("Supabase sign-out failed", error);
      return { ok: false, message: SIGN_OUT_FAILED };
    } finally {
      signingOutRef.current = false;
      setIsSigningOut(false);
    }
  }, [router]);

  const value = useMemo(
    () => ({ state, isSigningOut, retry, signOut }),
    [state, isSigningOut, retry, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>.");
  return context;
}

/** True when a Supabase session exists, whatever the state of its profile. */
export function hasSession(state: AuthState): boolean {
  switch (state.status) {
    case "signed-in":
    case "profile-missing":
    case "unsupported-role":
      return true;
    case "error":
      return state.hasSession;
    default:
      return false;
  }
}
