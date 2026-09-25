"use client";

import type { ReactNode } from "react";
import { useAuth } from "../../lib/auth/auth-context";

/**
 * Hides professor-oriented actions from signed-in students. Visitors who are
 * signed out still see them, since that is how professors find the sign-in
 * flow. While auth is loading, the content keeps its space but stays hidden.
 */
export function HiddenForStudents({ children }: { children: ReactNode }) {
  const { state } = useAuth();

  if (state.status === "signed-in" && state.role === "student") return null;
  if (state.status === "loading") {
    return (
      <div aria-hidden="true" inert className="invisible contents">
        {children}
      </div>
    );
  }
  return <>{children}</>;
}
