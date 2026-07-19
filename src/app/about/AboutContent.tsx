// Server-rendered About content (no client JS). Renders immediately as HTML.
import {
  FaStar,
  FaChartLine,
  FaArrowRight,
  FaTheaterMasks,
  FaHeart,
  FaBolt,
  FaEye,
  FaHandshake,
} from "react-icons/fa";
import Link from "next/link";
import { TmdbAttribution } from "@/components/attribution/TmdbAttribution";

const GOLD =
  "linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)";
const GOLD_TEXT: React.CSSProperties = {
  background: GOLD,
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};
const CINZEL: React.CSSProperties = {
  fontFamily: "var(--font-cinzel), serif",
};
const CARD_SHADOW = `
  0 35px 90px -20px rgba(0,0,0,0.95),
  0 20px 50px -10px rgba(0,0,0,0.8),
  0 0 0 1px rgba(255,255,255,0.06),
  inset 0 1px 0 rgba(255,255,255,0.1),
  inset 0 -1px 0 rgba(0,0,0,0.4)
`.trim();
const CARD_BG =
  "linear-gradient(135deg, rgba(26,26,26,0.95) 0%, rgba(15,15,15,0.95) 50%, rgba(0,0,0,0.95) 100%)";

function GoldDivider({ width = 180 }: { width?: number }) {
  return (
    <div className="mx-auto my-6" style={{ width, height: 2 }}>
      <div
        className="h-full w-full"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,200,0,0.4) 15%, rgba(255,180,0,0.9) 40%, rgba(255,165,0,1) 50%, rgba(255,180,0,0.9) 60%, rgba(255,200,0,0.4) 85%, transparent 100%)",
          boxShadow:
            "0 0 20px rgba(255,165,0,0.6), 0 0 40px rgba(255,165,0,0.3)",
        }}
      />
    </div>
  );
}

const CRITERIA = [
  {
    icon: FaHeart,
    title: "Emotional Range & Depth",
    description:
      "Does the actor access and convey a full spectrum of emotion? Can they hold grief, joy, rage, and tenderness simultaneously?",
  },
  {
    icon: FaTheaterMasks,
    title: "Character Believability",
    description:
      "Do you forget you're watching an actor? The best performances make the character feel like a real person, not a performance.",
  },
  {
    icon: FaBolt,
    title: "Technical Skill & Authenticity",
    description:
      "Voice, physicality, accent, movement — the craft beneath the surface. Mastery that serves the character, not the actor's ego.",
  },
  {
    icon: FaEye,
    title: "Screen Presence & Impact",
    description:
      "The ineffable quality of commanding the frame. Some actors hold your attention even when standing still.",
  },
  {
    icon: FaHandshake,
    title: "Chemistry & Interaction",
    description:
      "Great performances are often defined by how an actor elevates those around them. The ensemble dimension of the craft.",
  },
];

const STATS = [
  { value: "570K+", label: "Performances" },
  { value: "208K+", label: "Actors" },
  { value: "5", label: "Rating Dimensions" },
  { value: "Free", label: "Always" },
];

const WHY_POINTS = [
  "Compare actors across different roles and entire careers",
  "Identify career-defining performances that transcend their films",
  "Surface overlooked or underappreciated work from any era",
  "Build a comprehensive, community-driven database of acting quality",
];

const STEPS = [
  {
    icon: FaTheaterMasks,
    label: "01",
    title: "Select",
    desc: "Choose any actor's role in a specific film from our database of 570K+ performances.",
  },
  {
    icon: FaStar,
    label: "02",
    title: "Rate",
    desc: "Use the quick single-slider or score across five Oscar-inspired criteria. Takes 2 minutes.",
  },
  {
    icon: FaChartLine,
    label: "03",
    title: "Compare",
    desc: "See how your rating compares to the community. Explore actor career trajectories.",
  },
];

const FAQ = [
  {
    q: "Are ratings based on movies or performances?",
    a: "Ratings are based on individual acting performances, not the overall movie. A single film may have multiple performance ratings — one for each actor in a significant role. This lets great performances shine even in mediocre films, and vice versa.",
  },
  {
    q: "Who can submit ratings?",
    a: "Anyone can create a free account and start rating. Our community-driven approach ensures diverse perspectives while standardized criteria maintain consistency across all ratings.",
  },
  {
    q: "How does the scoring work?",
    a: "You can rate with a quick single slider (0–10) or across five criteria scored 0–100 each. Multi-criteria scores are normalized and averaged into a final 0–10 performance score, then aggregated with community ratings.",
  },
  {
    q: "How is bias reduced?",
    a: "Through standardized criteria, community aggregation, and anonymous rating — so an actor's fame doesn't inflate their score. The focus on specific performance qualities rather than overall popularity helps surface overlooked work.",
  },
];

export function AboutContent() {
  return (
    <div
      className="min-h-screen bg-black w-full"
      style={{ maxWidth: "100vw", overflowX: "hidden" }}
    >
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-[#FFC800]/15 rounded-full blur-[200px]" />
      </div>

      <div
        className="w-full px-4 sm:px-6 lg:px-8 pt-28 sm:pt-32 md:pt-36 pb-16 sm:pb-24 md:pb-32 relative"
        style={{ maxWidth: "1024px", margin: "0 auto" }}
      >
        {/* Hero */}
        <div className="text-center mb-16 sm:mb-20 md:mb-24">
          <p className="text-[10px] sm:text-xs font-bold tracking-[0.35em] uppercase text-[#FFD700] opacity-60 mb-6">
            About ActorRating
          </p>
          <h1
            className="text-4xl xs:text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-4 tracking-tight leading-[1.05]"
            style={CINZEL}
          >
            Rate the{" "}
            <span
              style={{
                ...GOLD_TEXT,
                filter: "drop-shadow(0 0 40px rgba(255,215,0,0.35))",
              }}
            >
              Acting
            </span>
          </h1>
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-white opacity-20 mt-2 mb-0">
            Not the movie
          </p>
          <GoldDivider />
          <p className="text-base sm:text-lg md:text-xl text-[#a0a0a0] font-light leading-relaxed max-w-2xl mx-auto mt-2">
            The world&apos;s leading platform to rate, rank, and celebrate the
            greatest acting performances in cinema history.
          </p>
        </div>

        {/* Mission card */}
        <div className="mb-10 sm:mb-12">
          <div
            className="group relative p-8 sm:p-12 md:p-16 rounded-[2rem] overflow-hidden transition-all duration-300 hover:shadow-[0_0_50px_rgba(255,215,0,0.12)] text-center"
            style={{
              background: CARD_BG,
              boxShadow: CARD_SHADOW,
              transform: "translateY(-4px) perspective(1000px) rotateX(1deg)",
              transformStyle: "preserve-3d",
            }}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2rem] overflow-hidden pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#FFD700]/10 rounded-full blur-3xl" />
            </div>
            <div className="relative z-10 space-y-5 max-w-2xl mx-auto">
              <p className="text-xl sm:text-2xl md:text-3xl text-[#e4e4e7] font-light leading-relaxed italic">
                <span className="text-[#FFD700] mr-1">&ldquo;</span>
                A great performance can exist in a mediocre movie.
                <span className="text-[#FFD700] ml-1">&rdquo;</span>
              </p>
              <p className="text-xl sm:text-2xl md:text-3xl text-[#e4e4e7] font-light leading-relaxed italic">
                <span className="text-[#FFD700] mr-1">&ldquo;</span>
                A weak performance can exist in a great one.
                <span className="text-[#FFD700] ml-1">&rdquo;</span>
              </p>
              <p
                className="text-lg sm:text-xl md:text-2xl font-bold pt-2"
                style={GOLD_TEXT}
              >
                ActorRating exists to separate the two.
              </p>
            </div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-tl from-[#FFD700]/5 to-transparent rounded-tl-[100px] pointer-events-none" />
          </div>
        </div>

        {/* Stats strip */}
        <div className="mb-10 sm:mb-12">
          <div
            className="rounded-[2rem] overflow-hidden"
            style={{ background: CARD_BG, boxShadow: CARD_SHADOW }}
          >
            <div className="grid grid-cols-2 sm:grid-cols-4">
              {STATS.map((s, i) => (
                <div
                  key={i}
                  className="relative flex flex-col items-center justify-center py-8 sm:py-10"
                >
                  {i > 0 && (
                    <div
                      className="absolute left-0 top-[20%] h-[60%] w-px"
                      style={{ background: "rgba(255,215,0,0.1)" }}
                    />
                  )}
                  <span
                    className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-1.5"
                    style={GOLD_TEXT}
                  >
                    {s.value}
                  </span>
                  <span className="text-[10px] sm:text-xs text-[#555] font-medium tracking-[0.15em] uppercase">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Why it matters */}
        <section className="mb-10 sm:mb-12">
          <div
            className="group relative p-8 sm:p-12 rounded-[2rem] overflow-hidden transition-all duration-300 hover:shadow-[0_0_50px_rgba(255,215,0,0.1)]"
            style={{
              background: CARD_BG,
              boxShadow: CARD_SHADOW,
              transform: "translateY(-4px) perspective(1000px) rotateX(1deg)",
              transformStyle: "preserve-3d",
            }}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-[2rem]">
              <div className="absolute top-0 right-0 w-96 h-96 bg-[#FFD700]/8 rounded-full blur-3xl" />
            </div>
            <div className="relative z-10">
              <div className="text-center mb-8 sm:mb-10">
                <p className="text-[10px] sm:text-xs font-bold tracking-[0.25em] uppercase text-[#FFD700] opacity-60 mb-3">
                  Our Difference
                </p>
                <h2
                  className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2"
                  style={CINZEL}
                >
                  Why This <span style={GOLD_TEXT}>Matters</span>
                </h2>
                <GoldDivider width={120} />
                <div className="mt-4 text-center">
                  <p className="text-lg sm:text-xl md:text-2xl text-[#e4e4e7] font-light mb-2">
                    Most platforms rate{" "}
                    <span className="line-through opacity-30">movies</span>
                  </p>
                  <p
                    className="text-lg sm:text-xl md:text-2xl font-semibold"
                    style={GOLD_TEXT}
                  >
                    ActorRating rates acting
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {WHY_POINTS.map((point, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-4 p-5 sm:p-6 rounded-[1.5rem]"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <span
                      className="flex-shrink-0 w-2 h-2 rounded-full bg-[#FFD700] mt-2"
                      style={{
                        boxShadow: "0 0 8px rgba(255,215,0,0.5)",
                      }}
                    />
                    <p className="text-sm sm:text-base text-[#e4e4e7] font-light leading-relaxed">
                      {point}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-[#FFD700]/5 to-transparent rounded-tr-[100px] pointer-events-none" />
          </div>
        </section>

        {/* How it works */}
        <section className="mb-10 sm:mb-12">
          <div className="text-center mb-8 sm:mb-10">
            <p className="text-[10px] sm:text-xs font-bold tracking-[0.25em] uppercase text-[#FFD700] opacity-60 mb-3">
              Simple Process
            </p>
            <h2
              className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2"
              style={CINZEL}
            >
              <span style={GOLD_TEXT}>How</span> It Works
            </h2>
            <GoldDivider width={100} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={i}
                  className="group relative p-8 rounded-[2rem] overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,215,0,0.1)] text-center"
                  style={{
                    background: CARD_BG,
                    boxShadow: CARD_SHADOW,
                    transform:
                      "translateY(-4px) perspective(1000px) rotateX(1deg)",
                    transformStyle: "preserve-3d",
                  }}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem] overflow-hidden pointer-events-none">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-[#FFD700]/10 rounded-full blur-3xl" />
                  </div>
                  <div className="relative z-10">
                    <div
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-[0.2em] mb-5"
                      style={{
                        color: "#FFD700",
                        background: "rgba(255,215,0,0.1)",
                        border: "1px solid rgba(255,215,0,0.25)",
                      }}
                    >
                      {step.label}
                    </div>
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                      style={{
                        background: "rgba(255,215,0,0.08)",
                        border: "2px solid rgba(255,215,0,0.25)",
                        boxShadow: "0 0 24px rgba(255,215,0,0.1)",
                      }}
                    >
                      <Icon className="w-7 h-7 text-[#FFD700]" />
                    </div>
                    <h3
                      className="text-xl font-bold text-white mb-3"
                      style={CINZEL}
                    >
                      {step.title}
                    </h3>
                    <p className="text-sm text-[#a0a0a0] leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                  <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-[#FFD700]/5 to-transparent rounded-tl-[60px] pointer-events-none" />
                </div>
              );
            })}
          </div>
        </section>

        {/* 5 Criteria */}
        <section className="mb-10 sm:mb-12">
          <div className="text-center mb-8 sm:mb-10">
            <p className="text-[10px] sm:text-xs font-bold tracking-[0.25em] uppercase text-[#FFD700] opacity-60 mb-3">
              Rating System
            </p>
            <h2
              className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2"
              style={CINZEL}
            >
              The <span style={GOLD_TEXT}>5 Dimensions</span>
            </h2>
            <GoldDivider width={100} />
            <p className="text-sm sm:text-base text-[#888] max-w-xl mx-auto mt-4">
              Rate with a quick single slider, or dive into all five
              Oscar-inspired criteria for a comprehensive assessment.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {CRITERIA.map((c, i) => {
              const Icon = c.icon;
              const isLast = i === CRITERIA.length - 1;
              return (
                <div
                  key={i}
                  className={`group relative p-7 sm:p-8 rounded-[2rem] overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,215,0,0.1)] ${
                    isLast
                      ? "sm:col-span-2 lg:max-w-lg lg:mx-auto lg:w-full"
                      : ""
                  }`}
                  style={{ background: CARD_BG, boxShadow: CARD_SHADOW }}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem] overflow-hidden pointer-events-none">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-[#FFD700]/8 rounded-full blur-3xl" />
                  </div>
                  <div className="relative z-10 flex items-start gap-5">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: "rgba(255,215,0,0.08)",
                        border: "2px solid rgba(255,215,0,0.25)",
                      }}
                    >
                      <Icon className="w-5 h-5 text-[#FFD700]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold tracking-[0.2em] text-[#FFD700] opacity-60">
                          0{i + 1}
                        </span>
                        <h3
                          className="text-base sm:text-lg font-bold text-white"
                          style={CINZEL}
                        >
                          {c.title}
                        </h3>
                      </div>
                      <p className="text-sm text-[#888] leading-relaxed">
                        {c.description}
                      </p>
                    </div>
                  </div>
                  <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-tl from-[#FFD700]/4 to-transparent rounded-tl-[50px] pointer-events-none" />
                </div>
              );
            })}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-10 sm:mb-12">
          <div className="text-center mb-8">
            <p className="text-[10px] sm:text-xs font-bold tracking-[0.25em] uppercase text-[#FFD700] opacity-60 mb-3">
              Questions
            </p>
            <h2
              className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2"
              style={CINZEL}
            >
              Frequently <span style={GOLD_TEXT}>Asked</span>
            </h2>
            <GoldDivider width={100} />
          </div>
          <div className="space-y-4">
            {FAQ.map((item, i) => (
              <div
                key={i}
                className="p-7 sm:p-8 rounded-[2rem] transition-all duration-200"
                style={{ background: CARD_BG, boxShadow: CARD_SHADOW }}
              >
                <h3
                  className="text-base sm:text-lg font-bold text-white mb-3"
                  style={CINZEL}
                >
                  {item.q}
                </h3>
                <p className="text-sm sm:text-base text-[#a0a0a0] leading-relaxed">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Credits / data attribution (TMDB API Terms) */}
        <section className="mb-16 sm:mb-20 md:mb-24 text-center">
          <p className="text-[10px] sm:text-xs font-bold tracking-[0.35em] uppercase text-[#FFD700] opacity-60 mb-6">
            Credits
          </p>
          <h2
            className="text-2xl sm:text-3xl font-bold text-white mb-4"
            style={CINZEL}
          >
            Data &amp; imagery
          </h2>
          <GoldDivider width={100} />
          <p className="text-sm sm:text-base text-[#a0a0a0] font-light leading-relaxed max-w-xl mx-auto mb-8 mt-4">
            Movie metadata, cast information, posters, and actor photos are provided
            via{" "}
            <Link
              href="https://www.themoviedb.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#01b4e4] hover:underline"
            >
              The Movie Database (TMDB)
            </Link>
            . Performance ratings on ActorRating are created by our community and are
            separate from TMDB scores.
          </p>
          <TmdbAttribution variant="about" />
        </section>

        {/* CTA */}
        <section className="text-center">
          <div
            className="group relative p-12 sm:p-16 rounded-[2rem] overflow-hidden transition-all duration-300 hover:shadow-[0_0_60px_rgba(255,215,0,0.15)]"
            style={{
              background: CARD_BG,
              boxShadow: CARD_SHADOW,
              transform: "translateY(-4px) perspective(1000px) rotateX(1deg)",
              transformStyle: "preserve-3d",
            }}
          >
            <div className="absolute inset-0 opacity-15 pointer-events-none rounded-[2rem] overflow-hidden">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#FFD700]/20 rounded-full blur-3xl" />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] sm:text-xs font-bold tracking-[0.35em] uppercase text-[#FFD700] opacity-60 mb-5">
                Get Started
              </p>
              <h2
                className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6"
                style={CINZEL}
              >
                Ready to <span style={GOLD_TEXT}>Start?</span>
              </h2>
              <GoldDivider width={100} />
              <p className="text-base sm:text-lg md:text-xl text-[#a0a0a0] font-light mb-10 leading-relaxed max-w-lg mx-auto mt-4">
                Join the community and start rating performances. It&apos;s free,
                forever.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/performances">
                  <button
                    className="group/btn inline-flex items-center justify-center gap-4 px-10 sm:px-14 py-4 sm:py-5 rounded-full text-black text-base sm:text-xl font-bold tracking-wider transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,215,0,0.4)] hover:scale-105"
                    style={{ background: GOLD }}
                  >
                    Start Rating
                    <FaArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 group-hover/btn:translate-x-2" />
                  </button>
                </Link>
                <Link
                  href="/auth/signin"
                  className="px-8 sm:px-10 py-4 sm:py-5 rounded-full text-sm sm:text-base font-semibold text-[#888] hover:text-white transition-all duration-200"
                  style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  Continue with Email
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
