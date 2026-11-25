import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { AuthProvider } from "../lib/auth/auth-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const footerLinkClass = "rounded-sm text-sm font-semibold underline underline-offset-4 hover:text-rb-brand-hover";

export const metadata: Metadata = {
  title: "ResearchBridge | The Research Ambassadors",
  description: "Connecting students with faculty research opportunities.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
        <footer className="mt-auto border-t border-rb-border bg-rb-surface text-rb-brand">
          <nav aria-label="Footer" className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-5 py-5 text-center sm:px-8">
            <Link href="/about" className={footerLinkClass}>About us</Link>
            <a href="https://groupme.com/join_group/116904303/xAbyAXFI" className={footerLinkClass}>GroupMe</a>
            <a href="https://www.instagram.com/tulaneresearchambassadors/" className={footerLinkClass}>Instagram</a>
          </nav>
        </footer>
      </body>
    </html>
  );
}
