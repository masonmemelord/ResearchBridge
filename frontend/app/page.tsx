import Image from "next/image";
import Link from "next/link";
import logo from "./researchbridgelogo.jpeg";

type IconProps = { className?: string };

function CircuitIcon({ className }: IconProps) {
  return <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true"><rect x="20" y="20" width="24" height="24" rx="4" stroke="currentColor" strokeWidth="2.5" /><path d="M32 20V10M32 54V44M20 32H10M54 32H44M20 20L14 14M44 20L50 14M20 44L14 50M44 44L50 50" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /><circle cx="32" cy="8" r="3" fill="currentColor" /><circle cx="32" cy="56" r="3" fill="currentColor" /><circle cx="8" cy="32" r="3" fill="currentColor" /><circle cx="56" cy="32" r="3" fill="currentColor" /></svg>;
}

function MicroscopeIcon({ className }: IconProps) {
  return <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true"><path d="M28 12h12M34 12v11l9 9a14 14 0 0 1 4 10v2H23a14 14 0 0 1 4-10l9-9v-5M20 51h30M16 56h38M38 18l7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="31" cy="38" r="4" stroke="currentColor" strokeWidth="2.5" /></svg>;
}

function BrainIcon({ className }: IconProps) {
  return <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true"><path d="M32 53V20M32 43c-4 0-8-2-8-7 0-4-3-6-6-6-5 0-8-4-8-9 0-6 5-11 11-11 3 0 5 1 7 3 2-4 7-6 11-3 4 2 5 6 5 9 6 0 10 4 10 10 0 4-2 7-5 9 1 6-3 11-9 11-2 0-4 0-5-1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M32 31c4 0 8-2 8-7M32 39c5 0 9 2 9 7M24 21c-3 3-4 7-1 10M17 39c3 0 6 2 7 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>;
}

function SearchIcon({ className }: IconProps) {
  return <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true"><circle cx="21" cy="21" r="11" stroke="currentColor" strokeWidth="2.5" /><path d="m30 30 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>;
}

function MessageIcon({ className }: IconProps) {
  return <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true"><path d="M8 11a5 5 0 0 1 5-5h17a5 5 0 0 1 5 5v11a5 5 0 0 1-5 5H20l-7 7v-7a5 5 0 0 1-5-5V11Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /><path d="M15 16h13M15 21h9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>;
}

function GrowthIcon({ className }: IconProps) {
  return <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true"><path d="M8 35 19 24l7 7 14-16M31 15h9v9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function UniversityIcon({ className }: IconProps) {
  return <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true"><path d="m6 18 18-10 18 10M10 22h28M12 22v14m8-14v14m8-14v14m8-14v14M7 40h34" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function PeopleIcon({ className }: IconProps) {
  return <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true"><circle cx="24" cy="15" r="5" stroke="currentColor" strokeWidth="2.2" /><circle cx="10" cy="20" r="4" stroke="currentColor" strokeWidth="2.2" /><circle cx="38" cy="20" r="4" stroke="currentColor" strokeWidth="2.2" /><path d="M14 39c0-6 4-10 10-10s10 4 10 10M3 39c0-5 3-8 8-8M37 31c5 0 8 3 8 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>;
}

function FlaskIcon({ className }: IconProps) {
  return <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true"><path d="M18 6h12M22 6v12L11 37a4 4 0 0 0 4 5h18a4 4 0 0 0 4-5L26 18V6M16 31h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

const opportunities = [
  { department: "Computer Science", focus: "ML for Real-world Impact", description: "Building intelligent systems that solve meaningful problems.", tag: "Undergraduate · Data Science", icon: CircuitIcon, position: "lg:right-3 lg:top-2" },
  { department: "Biology", focus: "Genomics & Health", description: "Exploring the genetic basis of human health and disease.", tag: "Undergraduate · Wet Lab", icon: MicroscopeIcon, position: "lg:left-0 lg:top-48" },
  { department: "Psychology", focus: "Mind, Behavior, & Society", description: "Understanding how people think, feel, and interact.", tag: "Undergraduate · Behavioral", icon: BrainIcon, position: "lg:right-0 lg:bottom-0" },
];

const steps = [
  { number: "1", title: "Explore", description: "Browse opportunities that match your interests, skills, and goals.", icon: SearchIcon },
  { number: "2", title: "Connect", description: "Reach out to faculty and start meaningful conversations.", icon: MessageIcon },
  { number: "3", title: "Contribute", description: "Join the research, build your experience, and make an impact.", icon: GrowthIcon },
];

const featureItems = [
  { icon: PeopleIcon, text: "Empowering the next generation of researchers." },
  { icon: FlaskIcon, text: "Supporting innovation across disciplines." },
  { icon: GrowthIcon, text: "Strengthening communities through collaboration." },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f8eedf] text-[#211916]">
      <div className="paper-texture relative">
        <nav className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
          <Link href="/" aria-label="ResearchBridge home"><Image src={logo} alt="ResearchBridge" className="h-auto w-44 sm:w-56" priority /></Link>
          <div className="hidden items-center gap-12 text-[15px] font-semibold text-[#4e433c] lg:flex">
            <Link href="/opportunities" className="transition hover:text-[#b63d28]">Explore opportunities</Link>
            <Link href="/professor" className="transition hover:text-[#b63d28]">For PIs</Link>
            <a href="#how-it-works" className="transition hover:text-[#b63d28]">How it works</a>
          </div>
          <div className="flex items-center gap-3 sm:gap-6">
            <Link href="/sign-in" className="hidden text-[15px] font-semibold sm:block">Sign in</Link>
            <Link href="/sign-up" className="rounded-lg bg-[#b83e28] px-4 py-3 text-sm font-bold text-white shadow-[0_8px_18px_rgba(132,43,26,0.2)] transition hover:-translate-y-0.5 hover:bg-[#98301f] sm:px-6">Get started</Link>
          </div>
        </nav>

        <section className="mx-auto grid max-w-[1440px] gap-12 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-12 lg:pb-24 lg:pt-24">
          <div className="relative z-10 max-w-2xl self-center">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.22em] text-[#b83e28]">Find your research</p>
            <h1 className="font-serif text-5xl font-black leading-[0.98] tracking-[-0.035em] text-[#211916] sm:text-6xl lg:text-7xl xl:text-[82px]">Find the research that moves you <span className="text-[#b83e28]">forward.</span></h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[#675b53] sm:text-xl">ResearchBridge connects curious students with faculty and research opportunities that spark growth, impact, and discovery.</p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <Link href="/opportunities" className="rounded-lg bg-[#b83e28] px-7 py-4 text-center font-bold text-white shadow-[0_10px_22px_rgba(132,43,26,0.2)] transition hover:-translate-y-0.5 hover:bg-[#96301f]">Explore opportunities</Link>
              <Link href="/professor/opportunities/new" className="rounded-lg border-2 border-[#251c18] px-7 py-4 text-center font-bold transition hover:bg-[#251c18] hover:text-white">Post an opportunity</Link>
            </div>
          </div>

          <div className="relative lg:min-h-[560px]">
            <svg viewBox="0 0 660 560" className="pointer-events-none absolute inset-0 hidden h-full w-full text-[#c9aa85] lg:block" fill="none" aria-hidden="true">
              <path d="M372 91H466M371 92C322 92 297 130 297 184V244M297 306V360C297 403 333 429 382 429H468M466 91v98c0 45 33 63 82 63h31c43 0 61 31 61 67v54" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="372" cy="92" r="6" fill="#c44c2b" /><circle cx="297" cy="244" r="6" fill="#e79037" /><circle cx="382" cy="429" r="6" fill="#e79037" /><circle cx="548" cy="252" r="6" fill="#c44c2b" /><circle cx="609" cy="373" r="6" fill="#e79037" />
            </svg>
            <div className="relative space-y-5 lg:space-y-0">
              {opportunities.map(({ icon: Icon, position, ...opportunity }) => (
                <article key={opportunity.department} className={"group relative w-full rounded-[24px] border border-[#eadbca] bg-[#fffaf3]/95 p-6 shadow-[0_16px_34px_rgba(74,53,35,0.13)] transition hover:-translate-y-1 hover:shadow-[0_22px_42px_rgba(74,53,35,0.16)] sm:p-7 lg:absolute lg:w-[355px] " + position}>
                  <div className="flex gap-5"><div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#f9ecd9] text-[#bc4827]"><Icon className="h-11 w-11" /></div><div><h2 className="font-serif text-2xl font-bold tracking-tight">{opportunity.department}</h2><p className="mt-1 text-[15px] font-medium text-[#574941]">{opportunity.focus}</p><p className="mt-3 text-sm leading-5 text-[#6d6057]">{opportunity.description}</p><span className="mt-4 inline-flex rounded-md bg-[#fbe7cf] px-2.5 py-1 text-xs font-semibold text-[#c45a18]">{opportunity.tag}</span></div></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1400px] px-5 pb-20 sm:px-8 lg:px-12">
          <div className="grid overflow-hidden rounded-[22px] border border-[#eadcc9] bg-[#f3e5d1]/85 md:grid-cols-[1.7fr_1fr_1fr_1fr]">
            <div className="flex items-center gap-5 border-b border-[#e2cfb9] px-7 py-7 md:border-b-0 md:border-r"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f9eddb] text-[#c35b1d]"><UniversityIcon className="h-8 w-8" /></div><p className="font-serif text-xl font-bold leading-snug">Built for students, faculty, and research labs.</p></div>
            {featureItems.map(({ icon: Icon, text }, index) => <div key={text} className={"flex items-center gap-4 px-6 py-7 " + (index < 2 ? "border-b border-[#e2cfb9] md:border-b-0 md:border-r" : "")}><Icon className="h-8 w-8 shrink-0 text-[#d97923]" /><p className="text-sm leading-5 text-[#5d5048]">{text}</p></div>)}
          </div>
        </section>
      </div>

      <section id="how-it-works" className="bg-[#fff8ee] px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1240px]">
          <div className="text-center"><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#b83e28]">How it works</p><h2 className="mt-4 font-serif text-4xl font-black tracking-tight sm:text-5xl">From <span className="text-[#b83e28]">curiosity</span> to contribution.</h2><div className="mx-auto mt-5 flex items-center justify-center gap-2 text-[#d77425]"><span className="h-px w-20 bg-[#dfc6aa]" /><span className="h-2 w-2 rounded-full bg-current" /><span className="h-2 w-2 rounded-full bg-current" /><span className="h-2 w-2 rounded-full bg-current" /><span className="h-px w-20 bg-[#dfc6aa]" /></div></div>
          <div className="mt-14 grid gap-8 md:grid-cols-3 md:gap-0">
            {steps.map(({ icon: Icon, ...step }, index) => <article key={step.number} className="relative flex gap-5 px-2 md:px-8">{index < steps.length - 1 && <div className="absolute right-0 top-10 hidden h-px w-12 bg-[#dfc6aa] md:block" />}<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#b83e28] text-lg font-bold text-white">{step.number}</span><div><div className="flex items-center gap-3"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f9eddb] text-[#211916]"><Icon className="h-8 w-8" /></span><h3 className="font-serif text-2xl font-bold">{step.title}</h3></div><p className="mt-4 max-w-xs text-sm leading-6 text-[#675b53]">{step.description}</p></div></article>)}
          </div>
        </div>
      </section>
    </main>
  );
}

