import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import logo from "../../app/TRALogo.png";
import { AuthNav } from "../auth/AuthNav";
import { RoleGate } from "../auth/RoleGate";
import type { SupportedRole } from "../../lib/auth/profile";

/**
 * Shared frame for role-specific workspaces: brand bar, navigation, and the
 * role gate. RLS and admin functions still authorize every read and write.
 */
export function WorkspaceShell({
  role,
  portalLabel,
  wide = false,
  children,
}: {
  role: SupportedRole;
  portalLabel: string;
  /** Admin tables use a wider column than the professor pages. */
  wide?: boolean;
  children: ReactNode;
}) {
  const width = wide ? "max-w-[1100px]" : "max-w-[900px]";
  return (
    <main className="paper-texture min-h-screen pb-20">
      <div className="h-1.5 bg-[linear-gradient(90deg,#006747_0_72%,#418fde_72%_100%)]" aria-hidden="true" />
      <nav
        aria-label="Main"
        className={`mx-auto flex ${width} flex-wrap items-center justify-between gap-4 border-b border-rb-border px-5 py-4 sm:px-8`}
      >
        <Link href="/" aria-label="Research Ambassadors home" className="flex items-center gap-3">
          <Image src={logo} alt="The Research Ambassadors" className="h-14 w-14 rounded-full object-contain" priority />
          <span className="hidden leading-none sm:block">
            <span className="block font-serif text-base font-black tracking-tight text-rb-brand">Research Ambassadors</span>
            <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.18em] text-rb-muted">{portalLabel}</span>
          </span>
        </Link>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <AuthNav />
        </div>
      </nav>

      <div className={`mx-auto ${width} px-5 sm:px-8`}>
        <RoleGate role={role}>{children}</RoleGate>
      </div>
    </main>
  );
}
