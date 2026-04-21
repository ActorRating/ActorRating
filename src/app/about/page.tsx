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

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeLayout>
        <AboutContent />
      </HomeLayout>
    </>
  );
}
