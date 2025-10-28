// src/app/about/page.tsx
import type { Metadata } from "next";
import { HomeLayout } from "@/components/layout";
import { motion } from "framer-motion";
import { FaUsers, FaStar, FaChartLine } from "react-icons/fa";
import { GiClapperboard } from "react-icons/gi";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About ActorRating — Our Mission & Vision",
  description:
    "Learn about ActorRating's mission to create the world's most comprehensive and community-driven database of acting performance ratings. Discover what makes us different and how we bring movie lovers together.",
  keywords: [
    "about actor rating",
    "actor rating platform",
    "acting performance ratings",
    "rate actors",
    "actor ranking",
    "community-driven film platform",
  ],
  openGraph: {
    title: "About ActorRating — Our Mission & Vision",
    description:
      "ActorRating is the community-driven platform where fans rate and discover the best acting performances in cinema.",
    url: "https://www.actorrating.com/about",
    siteName: "ActorRating",
    images: [
      {
        url: "https://www.actorrating.com/logo.png",
        width: 1200,
        height: 630,
        alt: "ActorRating Logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About ActorRating — Our Mission & Vision",
    description:
      "Learn how ActorRating brings together a global community to rate acting performances across cinema.",
    images: ["https://www.actorrating.com/logo.png"],
  },
};

export default function AboutPage() {
  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About ActorRating",
    url: "https://www.actorrating.com/about",
    description:
      "ActorRating is a community-driven database for rating acting performances based on quality, depth, and authenticity.",
    publisher: {
      "@type": "Organization",
      name: "ActorRating",
      url: "https://www.actorrating.com",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <HomeLayout>
        <div className="min-h-screen bg-background">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16 lg:py-24">
            {/* Hero Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16 sm:mb-24"
            >
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 sm:mb-8 font-dm-serif-display">
                About ActorRating
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Our mission is to create the most comprehensive and reliable database
                of community-driven acting performance ratings.
              </p>
            </motion.div>

            {/* Mission Statement */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-16 sm:mb-24"
            >
              <div className="bg-secondary/30 backdrop-blur-sm rounded-2xl p-8 sm:p-12 border border-border">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-foreground mb-6 sm:mb-8 text-center">
                  Our Primary Goal
                </h2>
                <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed text-center max-w-3xl mx-auto">
                  We are dedicated to collecting{" "}
                  <strong className="text-foreground">
                    community-driven, high-quality rating data
                  </strong>{" "}
                  that provides meaningful insights into acting performances across cinema. By focusing on
                  specific performances rather than entire films, we create a nuanced
                  understanding of what makes great acting truly exceptional.
                </p>
              </div>
            </motion.div>

            {/* What Makes Us Different */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mb-16 sm:mb-24"
            >
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-foreground mb-8 sm:mb-12 text-center">
                What Makes Us Different
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                <FeatureCard
                  icon={<FaUsers className="w-8 h-8 text-primary mr-4" />}
                  title="Community-Driven"
                  description="Every rating comes from real movie enthusiasts who care about acting quality. Our community ensures diverse perspectives and authentic evaluations."
                />
                <FeatureCard
                  icon={<FaStar className="w-8 h-8 text-primary mr-4" />}
                  title="Performance-Focused"
                  description="We rate individual performances, not entire movies. This allows for precise evaluation of each actor's contribution to their role."
                />
                <FeatureCard
                  icon={<GiClapperboard className="w-8 h-8 text-primary mr-4" />}
                  title="Oscar-Inspired Criteria"
                  description="Our five-category rating system is inspired by Academy Award standards, ensuring professional-grade evaluation criteria."
                />
                <FeatureCard
                  icon={<FaChartLine className="w-8 h-8 text-primary mr-4" />}
                  title="Quality Data"
                  description="We prioritize data quality over quantity, ensuring each rating provides meaningful insights into acting excellence."
                />
              </div>
            </motion.div>

            {/* Call to Action */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="text-center"
            >
              <div className="bg-primary/10 backdrop-blur-sm rounded-2xl p-8 sm:p-12 border border-primary/20">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-foreground mb-6 sm:mb-8">
                  Join Our Community
                </h2>
                <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed mb-8 sm:mb-12 max-w-2xl mx-auto">
                  Help us build the most comprehensive database of acting performance ratings. Your insights matter in creating a valuable resource for movie enthusiasts worldwide.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/search"
                    className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    Start Rating Performances
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="inline-flex items-center justify-center px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
                  >
                    Create Account
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </HomeLayout>
    </>
  );
}

// ✅ Feature card component
function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-background p-6 sm:p-8 rounded-xl border border-border">
      <div className="flex items-center mb-4">{icon}<h3 className="text-xl sm:text-2xl font-semibold text-foreground">{title}</h3></div>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}