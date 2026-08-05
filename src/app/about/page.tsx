// Server Component: content is rendered on the server for fast first paint.
// Only HomeLayout (navbar/footer) is client-side.
import { HomeLayout } from "@/components/layout";
import { AboutContent } from "./AboutContent";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About ActorRating",
  url: "https://actorrating.com/about",
  description:
    "ActorRating: 570K+ performances, 208K+ actors. Rate with a quick slider or 5 criteria. We evaluate acting performances, not overall films.",
  publisher: {
    "@type": "Organization",
    name: "ActorRating",
    url: "https://actorrating.com",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is ActorRating?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ActorRating is a community platform for rating individual acting performances using Oscar-inspired craft criteria, separate from overall movie quality.",
      },
    },
    {
      "@type": "Question",
      name: "How do performance ratings work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Users score Emotional Range & Depth, Character Believability, Technical Skill, Screen Presence, and Chemistry. Criteria are averaged and shown on a 0–10 community scale.",
      },
    },
    {
      "@type": "Question",
      name: "Do ActorRating scores measure the quality of the film?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Scores evaluate acting craft for a specific actor in a specific movie, not whether the film as a whole is good.",
      },
    },
    {
      "@type": "Question",
      name: "Where should scores be cited?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Cite the canonical performance URL at /rate/{movie-slug}/{actor-slug} and use community aggregates only when the page reports real community ratings.",
      },
    },
  ],
};

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <HomeLayout>
        <AboutContent />
      </HomeLayout>
    </>
  );
}
