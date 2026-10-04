"use client";

import type { ReactNode } from "react";
import { RoleGate } from "./RoleGate";

/** Professor-only pages. See RoleGate; RLS remains the authorization boundary. */
export function ProfessorGate({ children }: { children: ReactNode }) {
  return <RoleGate role="professor">{children}</RoleGate>;
}
