// Server-rendered About — Letterboxd-style sectioned FAQ (clear hierarchy, no info dump).
import { FaArrowRight } from "react-icons/fa";
import Link from "next/link";
import { TmdbAttribution } from "@/components/attribution/TmdbAttribution";
import { RATING_CRITERIA } from "@/lib/rating";

const GOLD =
  "linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)";
const PLAYFAIR: React.CSSProperties = {
  fontFamily: 'var(--font-playfair-display), "Playfair Display", Georgia, serif',
};
const SANS: React.CSSProperties = {
  fontFamily: "var(--font-geist-sans), var(--font-sans), system-ui, sans-serif",
};

/** Sidebar mirrors Letterboxd about topics — one topic per section, no duplicate FAQ pile */
const NAV = [
  { id: "about", label: "About ActorRating" },
  { id: "membership", label: "Membership" },
  { id: "general-use", label: "General use" },
  { id: "ratings", label: "Ratings" },
  { id: "film-data", label: "Film data" },
] as const;

/** Labels match the in-depth sliders on the rate page */
const CRITERIA = [
  {
    title: "Emotional Impact",
    description: RATING_CRITERIA.emotionalRangeDepth.description,
  },
  {
    title: "Character Depth",
    description: RATING_CRITERIA.characterBelievability.description,
  },
  {
    title: "Technical Skill",
    description: RATING_CRITERIA.technicalSkill.description,
  },
  {
    title: "Screen Presence",
    description: RATING_CRITERIA.screenPresence.description,
  },
  {
    title: "Originality",
    description: RATING_CRITERIA.chemistryInteraction.description,
  },
] as const;

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-8 sm:mb-10">
      <h2
        className="text-xs font-semibold tracking-[0.18em] uppercase text-[#FFD700]"
        style={SANS}
      >
        {children}
      </h2>
      <div className="mt-3 h-px w-full bg-zinc-700" aria-hidden />
    </div>
  );
}

function Question({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h3
      id={id}
      className="text-[1.5rem] sm:text-[1.75rem] md:text-[1.875rem] font-bold text-white leading-[1.25] tracking-tight"
      style={PLAYFAIR}
    >
      {children}
    </h3>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mt-4 text-[15px] sm:text-[16px] text-zinc-400 leading-[1.75] max-w-prose space-y-4"
      style={SANS}
    >
      {children}
    </div>
  );
}

/** One Q + A unit — Letterboxd stacks these with generous space, not hairline spam */
function Entry({
  question,
  children,
  questionId,
}: {
  question: string;
  children: React.ReactNode;
  questionId?: string;
}) {
  return (
    <article className="mb-12 sm:mb-14 last:mb-0">
      <Question id={questionId}>{question}</Question>
      <Body>{children}</Body>
    </article>
  );
}

function AboutNav({ className }: { className?: string }) {
  return (
    <nav className={className} aria-label="About topics" style={SANS}>
      <ul className="flex flex-col gap-0.5">
        {NAV.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="block px-2 py-2 text-sm text-zinc-500 hover:text-[#FFD700] transition-colors rounded-md"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function AboutContent() {
  return (
    <div className="min-h-screen bg-black w-full" style={SANS}>
      <div className="max-w-5xl mx-auto px-5 sm:px-8 lg:px-10 pt-28 sm:pt-32 pb-20 sm:pb-28">
        <div className="lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-14 xl:gap-20 lg:items-start">
          {/* Topic nav — sticky on desktop; stacked list on mobile */}
          <aside className="mb-10 lg:mb-0 lg:sticky lg:top-28 lg:self-start lg:z-20">
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-zinc-600 mb-3 px-2">
              About
            </p>
            <AboutNav className="border-b border-white/[0.08] pb-5 lg:border-0 lg:pb-0" />
          </aside>

          <div className="min-w-0 max-w-2xl">
            {/* ── About ActorRating ───────────────────────────── */}
            <section id="about" className="scroll-mt-28 mb-16 sm:mb-20">
              <SectionTitle>About ActorRating</SectionTitle>

              <Entry question="What is ActorRating?">
                <p>
                  ActorRating is a community for rating acting performances —
                  individual turns in specific films, not overall movies.
                </p>
                <p>
                  Browse hundreds of thousands of performances, score the ones
                  you&apos;ve seen, and see how your take compares with everyone
                  else. Think of it as a home for people who care more about the
                  craft than the poster.
                </p>
              </Entry>

              <Entry question="Why rate acting instead of movies?">
                <p>
                  A great performance can live in a mediocre film. A weak one can
                  hide inside a classic. Rating the movie as a whole buries craft
                  under writing, design, and marketing.
                </p>
                <p>
                  Scoring the performance lets you compare actors across roles and
                  careers, and surface work that deserved more attention.
                </p>
              </Entry>
            </section>

            {/* ── Membership ──────────────────────────────────── */}
            <section id="membership" className="scroll-mt-28 mb-16 sm:mb-20">
              <SectionTitle>Membership</SectionTitle>

              <Entry question="Do I need an account?">
                <p>
                  No. You can browse performances, actors, and lists freely. Create
                  a free account when you want to submit ratings and keep a history
                  of what you&apos;ve scored.
                </p>
              </Entry>

              <Entry question="Does it cost anything?">
                <p>
                  No. ActorRating is free to use — and will stay that way. We&apos;re
                  building around craft, not a paywall.
                </p>
              </Entry>

              <Entry question="Who can submit ratings?">
                <p>
                  Anyone with an account. Ratings are community-driven, with shared
                  criteria so scores stay comparable across performances.
                </p>
              </Entry>
            </section>

            {/* ── General use ─────────────────────────────────── */}
            <section id="general-use" className="scroll-mt-28 mb-16 sm:mb-20">
              <SectionTitle>General use</SectionTitle>

              <Entry question="How should I use ActorRating?">
                <p>
                  However you like. Rate as you watch, back-fill career-defining
                  turns, hunt for underrated work, or keep a personal record of the
                  performances that floored you.
                </p>
              </Entry>

              <Entry question="How do I rate a performance?">
                <p>
                  Find an actor&apos;s role in a film — from{" "}
                  <Link
                    href="/performances"
                    className="text-[#FFD700] hover:underline underline-offset-2"
                  >
                    All Performances
                  </Link>
                  , search, or the homepage — then score it with a quick 0–10 slider,
                  or open the five optional dimensions for a fuller take. Most
                  ratings take a couple of minutes.
                </p>
              </Entry>

              <Entry question="Can I change a rating later?">
                <p>
                  Yes. Updating your score replaces the previous one, so the
                  community average always reflects each member&apos;s current take.
                </p>
              </Entry>
            </section>

            {/* ── Ratings ─────────────────────────────────────── */}
            <section id="ratings" className="scroll-mt-28 mb-16 sm:mb-20">
              <SectionTitle>Ratings</SectionTitle>

              <Entry question="Are ratings for movies or performances?">
                <p>
                  Performances only. One film can have many ratings — one per actor
                  in a significant role — so a brilliant turn can stand out even
                  when the film doesn&apos;t.
                </p>
              </Entry>

              <Entry question="How does scoring work?">
                <p>
                  Use a single 0–10 slider, or score five criteria (0–100 each).
                  Multi-criteria scores are averaged into a 0–10 performance score,
                  then combined with the community.
                </p>
              </Entry>

              <Entry question="What are the five dimensions?">
                <p>
                  Optional, Oscar-inspired criteria when you want a more deliberate
                  read:
                </p>
                <dl className="mt-2 space-y-5">
                  {CRITERIA.map((c) => (
                    <div key={c.title}>
                      <dt className="text-zinc-200 font-medium text-[15px]">
                        {c.title}
                      </dt>
                      <dd className="mt-1 text-zinc-500 text-[14px] sm:text-[15px] leading-relaxed">
                        {c.description}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Entry>

              <Entry question="How is bias reduced?">
                <p>
                  Shared criteria, community aggregation, and judging the
                  performance — not the actor&apos;s fame — so overlooked work can
                  still rise.
                </p>
              </Entry>
            </section>

            {/* ── Film data ───────────────────────────────────── */}
            <section id="film-data" className="scroll-mt-28 mb-16 sm:mb-20">
              <SectionTitle>Film data</SectionTitle>

              <Entry question="Where does film and cast data come from?">
                <p>
                  Metadata, cast, posters, and photos come from{" "}
                  <Link
                    href="https://www.themoviedb.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#01b4e4] hover:underline underline-offset-2"
                  >
                    The Movie Database (TMDB)
                  </Link>
                  . Ratings on ActorRating are ours — created by members — and are
                  separate from TMDB scores.
                </p>
                <div className="pt-8">
                  <TmdbAttribution variant="about" />
                </div>
              </Entry>
            </section>

            {/* ── CTA ─────────────────────────────────────────── */}
            <section className="pt-10 sm:pt-12 border-t border-white/[0.08]">
              <h2
                className="text-2xl sm:text-[1.75rem] font-bold text-white tracking-tight"
                style={PLAYFAIR}
              >
                Ready to start?
              </h2>
              <p className="mt-3 text-zinc-500 text-[15px] max-w-md leading-relaxed">
                Rate performances you&apos;ve seen. It&apos;s free.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link href="/performances" className="inline-flex">
                  <span
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-md text-black text-[15px] font-bold min-h-[44px] transition-transform hover:scale-[1.02]"
                    style={{ background: GOLD }}
                  >
                    Start rating
                    <FaArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center justify-center px-6 py-3.5 rounded-md text-sm font-semibold text-zinc-400 hover:text-white border border-white/10 min-h-[44px] transition-colors"
                >
                  Sign in
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
