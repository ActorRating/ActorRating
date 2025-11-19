// src/app/about/page.tsx
"use client"

import { HomeLayout } from "@/components/layout";
import { motion } from "framer-motion";
import { FaUsers, FaStar, FaChartLine, FaArrowRight } from "react-icons/fa";
import { GiClapperboard } from "react-icons/gi";
import Link from "next/link";
import Head from "next/head";
import React from "react";

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
      <Head>
        <title>About ActorRating — Our Mission & Vision</title>
        <meta
          name="description"
          content="Learn about ActorRating's mission to create the world's most comprehensive and community-driven database of acting performance ratings."
        />
        <meta name="robots" content="index, follow" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </Head>

      <HomeLayout>
        <div className="min-h-screen bg-black">
          {/* Background glow */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-[#FFC800]/15 rounded-full blur-[200px]" />
          </div>

          <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 py-16 sm:py-24 md:py-32 lg:py-40 relative">
            {/* Hero Section - Mobile Optimized */}
            <motion.div
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="text-center mb-20 sm:mb-32"
            >
              <h1 
                className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-6 sm:mb-8 md:mb-12 tracking-tight leading-tight relative px-4"
                style={{ 
                  fontFamily: 'var(--font-cinzel), serif',
                  textShadow: '0 0 60px rgba(255, 215, 0, 0.3), 0 0 30px rgba(255, 215, 0, 0.2)'
                }}
              >
                About ActorRating
              </h1>
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "180px", opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="h-1 bg-gradient-to-r from-transparent via-[#FFD700] to-transparent mx-auto shadow-[0_0_30px_rgba(255,215,0,0.6)] mb-6 sm:mb-12 md:mb-16"
              />
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-[#e4e4e7] max-w-3xl mx-auto leading-relaxed font-light px-6 sm:px-4">
                The definitive platform for rating acting performances
              </p>
            </motion.div>

            {/* Mission Statement - Simplified */}
            <motion.div
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="mb-20 sm:mb-32"
            >
              <div className="relative p-6 sm:p-10 md:p-12 rounded-2xl sm:rounded-3xl border border-[#FFD700]/30 bg-gradient-to-br from-[#1a1a1a]/90 to-black/90 backdrop-blur-2xl overflow-hidden">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                  <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-[#FFD700]/20 rounded-full blur-3xl" />
                </div>
                
                <div className="relative z-10 text-center px-4">
                  <h2 
                    className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4 md:mb-6"
                    style={{ fontFamily: 'var(--font-cinzel), serif' }}
                  >
                    Our Mission
                  </h2>
                  <p className="text-sm sm:text-base md:text-lg lg:text-xl text-[#e4e4e7] leading-relaxed max-w-2xl mx-auto font-light">
                    Building the world's most comprehensive{" "}
                    <span className="text-[#FFD700] font-medium">community-driven platform</span>{" "}
                    for rating acting performances.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* What Makes Us Different - Mobile Optimized */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="mb-20 sm:mb-32"
            >
              <h2 
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-12 sm:mb-20 text-center"
                style={{ fontFamily: 'var(--font-cinzel), serif' }}
              >
                What Makes Us Different
              </h2>

              <div className="space-y-6 sm:space-y-8">
                <PremiumFeatureCard
                  icon={<FaUsers className="w-8 h-8 sm:w-10 sm:h-10 text-[#FFD700]" />}
                  title="Community-Driven"
                  description="Every rating comes from real movie enthusiasts who care about acting quality. Our community ensures diverse perspectives and authentic evaluations."
                />
                <PremiumFeatureCard
                  icon={<FaStar className="w-8 h-8 sm:w-10 sm:h-10 text-[#FFD700]" />}
                  title="Performance-Focused"
                  description="We rate individual performances, not entire movies. This allows for precise evaluation of each actor's contribution to their role."
                />
                <PremiumFeatureCard
                  icon={<GiClapperboard className="w-8 h-8 sm:w-10 sm:h-10 text-[#FFD700]" />}
                  title="Oscar-Inspired Criteria"
                  description="Our five-category rating system is inspired by Academy Award standards, ensuring professional-grade evaluation criteria."
                />
                <PremiumFeatureCard
                  icon={<FaChartLine className="w-8 h-8 sm:w-10 sm:h-10 text-[#FFD700]" />}
                  title="Quality Data"
                  description="We prioritize data quality over quantity, ensuring each rating provides meaningful insights into acting excellence."
                />
              </div>
            </motion.div>

            {/* Call to Action - Mobile Optimized */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="text-center"
            >
              <div className="relative p-8 sm:p-12 md:p-16 rounded-2xl sm:rounded-3xl border border-[#FFD700]/40 bg-gradient-to-br from-[#1a1a1a]/95 to-black/95 backdrop-blur-2xl overflow-hidden">
                <div className="absolute inset-0 opacity-15 pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 sm:w-96 sm:h-96 bg-[#FFD700]/20 rounded-full blur-3xl" />
                </div>
                
                <div className="relative z-10">
                  <h2 
                    className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 sm:mb-6"
                    style={{ fontFamily: 'var(--font-cinzel), serif' }}
                  >
                    Join Our Community
                  </h2>
                  <p className="text-base sm:text-xl md:text-2xl text-[#e4e4e7] leading-relaxed mb-8 sm:mb-12 max-w-2xl mx-auto font-light">
                    Help us build the most comprehensive database of acting performance ratings.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/performances">
                      <button className="group px-8 sm:px-10 py-4 sm:py-5 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black text-base sm:text-lg font-bold tracking-wider uppercase transition-all duration-300 hover:shadow-[0_0_60px_rgba(255,215,0,0.5)] hover:scale-105">
                        <span className="flex items-center justify-center gap-3">
                          Start Rating Now
                          <FaArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 group-hover:translate-x-2" />
                        </span>
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </HomeLayout>
    </>
  );
}

function PremiumFeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="group relative p-6 sm:p-8 md:p-10 rounded-xl sm:rounded-2xl border border-[#FFD700]/20 bg-gradient-to-br from-[#1a1a1a]/80 to-black/80 backdrop-blur-xl overflow-hidden transition-all duration-300 hover:border-[#FFD700]/40 hover:shadow-[0_0_60px_rgba(255,215,0,0.15)]">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute top-1/2 left-0 w-48 h-48 sm:w-72 sm:h-72 bg-[#FFD700]/5 rounded-full blur-3xl" />
      </div>
      
      <div className="relative z-10 flex items-start gap-4 sm:gap-6">
        <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg sm:rounded-xl bg-gradient-to-br from-[#FFD700]/20 to-[#FFA500]/10 border border-[#FFD700]/30 flex items-center justify-center shadow-[0_0_30px_rgba(255,215,0,0.15)]">
          {icon}
        </div>
        
        <div className="flex-1">
          <h3 
            className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 sm:mb-3"
            style={{ fontFamily: 'var(--font-cinzel), serif' }}
          >
            {title}
          </h3>
          <p className="text-sm sm:text-base md:text-lg text-[#e4e4e7] leading-relaxed font-light">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
