"use client";

import { motion } from "framer-motion";
import { FaStar, FaUsers, FaChartLine } from "react-icons/fa";
import { GiClapperboard } from "react-icons/gi";
import Link from "next/link";

export default function HomePageClient() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16 lg:py-24">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 sm:mb-24"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 sm:mb-8 font-dm-serif-display">
            Rate Acting Performances,
            <br />
            Not Just Movies
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8 sm:mb-12 leading-relaxed">
            The world's first community-driven platform dedicated to rating and
            analyzing acting performances using Oscar-inspired criteria.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/search"
              className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-primary text-primary-foreground rounded-lg text-base sm:text-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Start Rating Performances
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-secondary text-secondary-foreground rounded-lg text-base sm:text-lg font-medium hover:bg-secondary/80 transition-colors"
            >
              Learn More
            </Link>
          </div>
        </motion.div>

        {/* Key Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-16 sm:mb-24"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-foreground mb-8 sm:mb-12 text-center">
            Why ActorRating?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <FeatureCard
              icon={<FaStar className="w-10 h-10 sm:w-12 sm:h-12 text-primary mb-4" />}
              title="Performance-Focused"
              description="Rate individual acting performances, not entire movies. Recognize excellence in every role."
            />
            <FeatureCard
              icon={<GiClapperboard className="w-10 h-10 sm:w-12 sm:h-12 text-primary mb-4" />}
              title="Oscar-Inspired Criteria"
              description="Use professional evaluation standards: authenticity, emotional depth, technical skill, and more."
            />
            <FeatureCard
              icon={<FaUsers className="w-10 h-10 sm:w-12 sm:h-12 text-primary mb-4" />}
              title="Community-Driven"
              description="Join a passionate community of film enthusiasts sharing insights and discovering great performances."
            />
            <FeatureCard
              icon={<FaChartLine className="w-10 h-10 sm:w-12 sm:h-12 text-primary mb-4" />}
              title="Detailed Analytics"
              description="Explore comprehensive breakdowns and comparisons of acting performances across cinema."
            />
          </div>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-16 sm:mb-24"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-foreground mb-8 sm:mb-12 text-center">
            How It Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <StepCard
              number="1"
              title="Search & Discover"
              description="Find actors and their performances across thousands of films in our comprehensive database."
            />
            <StepCard
              number="2"
              title="Rate & Review"
              description="Evaluate performances using our five-category rating system inspired by Academy Award standards."
            />
            <StepCard
              number="3"
              title="Explore & Compare"
              description="Dive into detailed analytics, compare performances, and discover hidden gems recommended by the community."
            />
          </div>
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center"
        >
          <div className="bg-primary/10 backdrop-blur-sm rounded-2xl p-8 sm:p-12 border border-primary/20">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-foreground mb-4 sm:mb-6">
              Ready to Start Rating?
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto">
              Join our growing community of film enthusiasts and help build the
              most comprehensive database of acting performance ratings.
            </p>
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-primary text-primary-foreground rounded-lg text-base sm:text-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Create Free Account
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Feature Card Component
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-background p-6 sm:p-8 rounded-xl border border-border text-center hover:border-primary/50 transition-colors">
      <div className="flex justify-center">{icon}</div>
      <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4">
        {title}
      </h3>
      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}

// Step Card Component
function StepCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="relative bg-background p-6 sm:p-8 rounded-xl border border-border">
      <div className="absolute -top-4 left-6 w-10 h-10 sm:w-12 sm:h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold">
        {number}
      </div>
      <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4 mt-4">
        {title}
      </h3>
      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}
