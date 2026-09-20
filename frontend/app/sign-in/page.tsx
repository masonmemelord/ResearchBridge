"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import logo from "../TRALogo.png";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError("The email or password was not accepted. Check both fields and try again.");
        return;
      }

      router.replace("/professor/opportunities/new");
      router.refresh();
    } catch (configurationError) {
      console.error("Supabase sign-in is not configured", configurationError);
      setError(
        "Supabase is not configured for this frontend. Check the public URL and anon-key environment variables.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="paper-texture min-h-screen px-5 py-12 sm:px-8">
      <div className="mx-auto max-w-md">
        <Link href="/" aria-label="Research Ambassadors home" className="flex items-center gap-3">
          <Image
            src={logo}
            alt="The Research Ambassadors"
            className="h-14 w-14 rounded-full object-contain"
            priority
          />
          <span>
            <span className="block font-serif text-lg font-black text-rb-brand">
              Research Ambassadors
            </span>
            <span className="block text-xs font-bold uppercase tracking-[0.16em] text-rb-muted">
              Secure sign in
            </span>
          </span>
        </Link>

        <section className="mt-10 rounded-[24px] border border-rb-border bg-rb-card p-6 shadow-[0_16px_34px_rgba(17,17,17,0.10)] sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-rb-brand">
            Welcome back
          </p>
          <h1 className="mt-3 font-serif text-4xl font-black tracking-tight text-rb-ink">
            Sign in
          </h1>
          <p className="mt-3 text-sm leading-6 text-rb-muted">
            Use the account connected to your ResearchBridge profile. Professor accounts can
            publish opportunities; student accounts can browse published work.
          </p>

          <form onSubmit={handleSubmit} aria-busy={isSubmitting} className="mt-7 space-y-5">
            <div>
              <label htmlFor="email" className="text-sm font-bold text-rb-ink">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-xl border border-rb-soft-border bg-white/80 px-4 py-3 text-rb-ink focus:border-rb-brand focus:ring-4 focus:ring-[rgba(0,103,71,0.22)]"
              />
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-bold text-rb-ink">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-rb-soft-border bg-white/80 px-4 py-3 text-rb-ink focus:border-rb-brand focus:ring-4 focus:ring-[rgba(0,103,71,0.22)]"
              />
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-xl border border-[#e0b3a7] bg-[#fdf1ed] p-4 text-sm font-semibold leading-5 text-[#8f2d1c]"
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-rb-brand px-6 py-3.5 font-bold text-white shadow-[4px_4px_0_#418fde] transition hover:-translate-y-0.5 hover:bg-rb-brand-hover disabled:cursor-wait disabled:opacity-60"
            >
              {isSubmitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-5 text-rb-muted">
            Account creation is currently managed by the ResearchBridge team.
          </p>
        </section>
      </div>
    </main>
  );
}
