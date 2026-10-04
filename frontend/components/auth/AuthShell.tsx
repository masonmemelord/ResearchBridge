import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import logo from "../../app/TRALogo.png";

/** Shared styles for the sign-in, sign-up, and email-confirmation pages. */
export const authStyles = {
  label: "text-sm font-bold text-rb-ink",
  input:
    "mt-2 w-full rounded-xl border border-rb-soft-border bg-white/80 px-4 py-3 text-rb-ink focus:border-rb-brand focus:ring-4 focus:ring-[rgba(0,103,71,0.22)] aria-[invalid=true]:border-[#b3412b]",
  hint: "mt-1.5 text-[13px] leading-5 text-rb-muted",
  fieldError: "mt-1.5 text-[13px] font-semibold leading-5 text-[#8f2d1c]",
  alert:
    "rounded-xl border border-[#e0b3a7] bg-[#fdf1ed] p-4 text-sm font-semibold leading-5 text-[#8f2d1c]",
  success:
    "rounded-xl border border-rb-soft-border bg-rb-surface p-4 text-sm font-semibold leading-5 text-rb-brand-active",
  primaryButton:
    "w-full rounded-lg bg-rb-brand px-6 py-3.5 font-bold text-white shadow-[4px_4px_0_#418fde] transition hover:-translate-y-0.5 hover:bg-rb-brand-hover disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0",
  secondaryButton:
    "w-full rounded-lg border-2 border-rb-brand px-6 py-3 font-bold text-rb-ink transition hover:bg-[rgba(0,103,71,0.08)] hover:text-rb-brand disabled:cursor-not-allowed disabled:opacity-60",
  textLink: "font-bold text-rb-brand underline underline-offset-2 hover:text-rb-brand-hover",
} as const;

type AuthShellProps = {
  /** Small caption under the logo, e.g. "Secure sign in". */
  caption: string;
  children: ReactNode;
  /** Optional content below the card, such as links to the other auth page. */
  footer?: ReactNode;
};

/** Logo header and card used by every authentication page. */
export function AuthShell({ caption, children, footer }: AuthShellProps) {
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
              {caption}
            </span>
          </span>
        </Link>

        <section className="mt-10 rounded-[24px] border border-rb-border bg-rb-card p-6 shadow-[0_16px_34px_rgba(17,17,17,0.10)] sm:p-8">
          {children}
        </section>

        {footer ? <div className="mt-6 text-center text-sm leading-6 text-rb-muted">{footer}</div> : null}
      </div>
    </main>
  );
}
