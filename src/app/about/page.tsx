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
        <div className="min-h-screen bg-black w-full" style={{ maxWidth: '100vw', overflowX: 'hidden' }}>
          {/* Background glow */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-[#FFC800]/15 rounded-full blur-[200px]" />
          </div>

          <div className="w-full px-4 sm:px-6 lg:px-8 pt-28 sm:pt-32 md:pt-36 lg:py-40 pb-16 sm:pb-24 md:pb-32 relative" style={{ maxWidth: '1280px', margin: '0 auto' }}>
            <div className="grid grid-cols-12 gap-8">
              {/* Hero Section - Mobile Optimized */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="col-span-12 lg:col-span-8 lg:col-start-3 text-center mb-16 sm:mb-24 md:mb-32"
              >
              <h1 
                className="text-5xl xs:text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold text-white mb-6 sm:mb-8 md:mb-12 tracking-tight leading-tight relative px-4"
                style={{ 
                  fontFamily: 'var(--font-cinzel), serif'
                }}
              >
                <span 
                  style={{
                    background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%, #FF8C00 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    filter: 'drop-shadow(0 0 40px rgba(255, 215, 0, 0.3))',
                  }}
                >
                  About
                </span>{' '}
                ActorRating
              </h1>
              <div
                className="h-[2px] mx-auto mb-6 sm:mb-12 md:mb-16 relative w-[180px]"
              >
                <div 
                  className="h-full w-full"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,200,0,0.4) 15%, rgba(255,180,0,0.9) 40%, rgba(255,165,0,1) 50%, rgba(255,180,0,0.9) 60%, rgba(255,200,0,0.4) 85%, transparent 100%)',
                    boxShadow: '0 0 20px rgba(255, 165, 0, 0.6), 0 0 40px rgba(255, 165, 0, 0.3)',
                  }}
                />
              </div>
                <p className="text-lg xs:text-xl sm:text-2xl md:text-3xl lg:text-4xl text-[#e4e4e7] max-w-3xl mx-auto leading-relaxed font-light px-6 sm:px-4">
                  The world's first community-driven platform for rating acting performances
                </p>
              </motion.div>

              {/* Mission Statement - Simplified */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="col-span-12 lg:col-span-10 lg:col-start-2 mb-16 sm:mb-24"
              >
              <div 
                className="group relative p-8 xs:p-10 sm:p-14 md:p-16 lg:p-20 rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,215,0,0.12)]"
                style={{
                  boxShadow: `
                    0 25px 70px -15px rgba(0, 0, 0, 0.9),
                    0 15px 40px -10px rgba(0, 0, 0, 0.7),
                    0 0 0 1px rgba(255, 255, 255, 0.05),
                    inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                  `,
                  transform: 'translateY(-4px) perspective(1000px) rotateX(1deg)',
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* Glow effect - CLIPPED to card corners */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem] overflow-hidden pointer-events-none">
                  <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-[#FFD700]/10 rounded-full blur-3xl" />
                </div>
                
                <div className="relative z-10 text-center">
                  <h2 
                    className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 sm:mb-8"
                    style={{ fontFamily: 'var(--font-cinzel), serif' }}
                  >
                    Our Mission
                  </h2>
                  <p className="text-base xs:text-lg sm:text-xl md:text-2xl text-[#e4e4e7] leading-relaxed max-w-3xl mx-auto font-light">
                    Building the world's most comprehensive{" "}
                    <span className="text-[#FFD700] font-medium">community-driven platform</span>{" "}
                    for rating acting performances.
                  </p>
                </div>
              </div>
              </motion.div>

              {/* What Makes Us Different - Mobile Optimized (with gutters) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="col-span-12 lg:col-start-2 lg:col-span-10 mb-20 sm:mb-32"
              >
                <h2 
                  className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-12 sm:mb-20 text-center px-4 sm:px-0"
                  style={{ fontFamily: 'var(--font-cinzel), serif' }}
                >
                  What Makes Us Different
                </h2>

                <div className="space-y-6 xs:space-y-8 sm:space-y-10 max-w-4xl mx-auto px-4 sm:px-6 md:px-0">
                  {/* Clean, Mobile-First Cards with breathing room */}
                  <div className="group relative p-8 xs:p-10 sm:p-12 rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,215,0,0.12)]"
                    style={{
                      boxShadow: `
                        0 25px 70px -15px rgba(0, 0, 0, 0.9),
                        0 15px 40px -10px rgba(0, 0, 0, 0.7),
                        0 0 0 1px rgba(255, 255, 255, 0.05),
                        inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                        inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                      `,
                      transform: 'translateY(-4px) perspective(1000px) rotateX(1deg)',
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    {/* Glow effect - CLIPPED to card corners */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem] overflow-hidden pointer-events-none">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/10 rounded-full blur-3xl" />
                    </div>
                    <div className="flex flex-col items-center text-center space-y-5 sm:space-y-6 relative z-10">
                      <div className="p-4 sm:p-5 rounded-full bg-[#FFD700]/10 transition-transform duration-300 hover:scale-110">
                        <FaUsers className="w-8 h-8 sm:w-10 sm:h-10 text-[#FFD700]" />
                      </div>
                      <h3 className="text-xl xs:text-2xl sm:text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-cinzel), serif' }}>
                        Community-Driven
                      </h3>
                      <p className="text-base xs:text-lg sm:text-xl text-[#e4e4e7] leading-relaxed font-light max-w-2xl">
                        <span className="hidden sm:inline">Every rating comes from real movie enthusiasts who care about acting quality. Our community ensures diverse perspectives and authentic evaluations.</span>
                        <span className="sm:hidden">Real movie enthusiasts rating performances with diverse perspectives and authentic evaluations.</span>
                      </p>
                    </div>
                  </div>

                  <div className="group relative p-8 xs:p-10 sm:p-12 rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,215,0,0.12)]"
                    style={{
                      boxShadow: `
                        0 25px 70px -15px rgba(0, 0, 0, 0.9),
                        0 15px 40px -10px rgba(0, 0, 0, 0.7),
                        0 0 0 1px rgba(255, 255, 255, 0.05),
                        inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                        inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                      `,
                      transform: 'translateY(-4px) perspective(1000px) rotateX(1deg)',
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    {/* Glow effect - CLIPPED to card corners */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem] overflow-hidden pointer-events-none">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/10 rounded-full blur-3xl" />
                    </div>
                    <div className="flex flex-col items-center text-center space-y-5 sm:space-y-6 relative z-10">
                      <div className="p-4 sm:p-5 rounded-full bg-[#FFD700]/10 transition-transform duration-300 hover:scale-110">
                        <FaStar className="w-8 h-8 sm:w-10 sm:h-10 text-[#FFD700]" />
                      </div>
                      <h3 className="text-xl xs:text-2xl sm:text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-cinzel), serif' }}>
                        Performance-Focused
                      </h3>
                      <p className="text-base xs:text-lg sm:text-xl text-[#e4e4e7] leading-relaxed font-light max-w-2xl">
                        <span className="hidden sm:inline">We rate individual performances, not entire movies. This allows for precise evaluation of each actor's contribution to their role.</span>
                        <span className="sm:hidden">Rating individual performances for precise actor evaluation.</span>
                      </p>
                    </div>
                  </div>

                  <div className="group relative p-8 xs:p-10 sm:p-12 rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,215,0,0.12)]"
                    style={{
                      boxShadow: `
                        0 25px 70px -15px rgba(0, 0, 0, 0.9),
                        0 15px 40px -10px rgba(0, 0, 0, 0.7),
                        0 0 0 1px rgba(255, 255, 255, 0.05),
                        inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                        inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                      `,
                      transform: 'translateY(-4px) perspective(1000px) rotateX(1deg)',
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    {/* Glow effect - CLIPPED to card corners */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem] overflow-hidden pointer-events-none">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/10 rounded-full blur-3xl" />
                    </div>
                    <div className="flex flex-col items-center text-center space-y-5 sm:space-y-6 relative z-10">
                      <div className="p-4 sm:p-5 rounded-full bg-[#FFD700]/10 transition-transform duration-300 hover:scale-110">
                        <GiClapperboard className="w-8 h-8 sm:w-10 sm:h-10 text-[#FFD700]" />
                      </div>
                      <h3 className="text-xl xs:text-2xl sm:text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-cinzel), serif' }}>
                        Oscar-Inspired Criteria
                      </h3>
                      <p className="text-base xs:text-lg sm:text-xl text-[#e4e4e7] leading-relaxed font-light max-w-2xl">
                        <span className="hidden sm:inline">Our five-category rating system is inspired by Academy Award standards, ensuring professional-grade evaluation criteria.</span>
                        <span className="sm:hidden">Five-category rating inspired by Academy Award standards.</span>
                      </p>
                    </div>
                  </div>

                  <div className="group relative p-8 xs:p-10 sm:p-12 rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,215,0,0.12)]"
                    style={{
                      boxShadow: `
                        0 25px 70px -15px rgba(0, 0, 0, 0.9),
                        0 15px 40px -10px rgba(0, 0, 0, 0.7),
                        0 0 0 1px rgba(255, 255, 255, 0.05),
                        inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                        inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                      `,
                      transform: 'translateY(-4px) perspective(1000px) rotateX(1deg)',
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    {/* Glow effect - CLIPPED to card corners */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem] overflow-hidden pointer-events-none">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/10 rounded-full blur-3xl" />
                    </div>
                    <div className="flex flex-col items-center text-center space-y-5 sm:space-y-6 relative z-10">
                      <div className="p-4 sm:p-5 rounded-full bg-[#FFD700]/10 transition-transform duration-300 hover:scale-110">
                        <FaChartLine className="w-8 h-8 sm:w-10 sm:h-10 text-[#FFD700]" />
                      </div>
                      <h3 className="text-xl xs:text-2xl sm:text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-cinzel), serif' }}>
                        Data-Driven Insights
                      </h3>
                      <p className="text-base xs:text-lg sm:text-xl text-[#e4e4e7] leading-relaxed font-light max-w-2xl">
                        <span className="hidden sm:inline">Watch the evolution of actor careers through comprehensive performance data. Track ratings, compare performances, and discover patterns across filmographies.</span>
                        <span className="sm:hidden">Track actor careers with comprehensive performance data.</span>
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Call to Action - Mobile Optimized */}
              <div
                className="col-span-12 lg:col-span-10 lg:col-start-2 text-center mb-12 sm:mb-20"
              >
              <div 
                className="relative p-6 sm:p-10 md:p-14 lg:p-16 rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden"
                style={{
                  boxShadow: `
                    0 25px 70px -15px rgba(0, 0, 0, 0.9),
                    0 15px 40px -10px rgba(0, 0, 0, 0.7),
                    0 0 0 1px rgba(255, 255, 255, 0.05),
                    inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                  `,
                  transform: 'translateY(-6px) perspective(1000px) rotateX(1.5deg)',
                  transformStyle: 'preserve-3d',
                }}
              >
                <div className="absolute inset-0 opacity-15 pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 sm:w-96 sm:h-96 bg-[#FFD700]/20 rounded-full blur-3xl" />
                </div>
                
                <div className="relative z-10 px-2 sm:px-0">
                  <h2 
                    className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 sm:mb-6"
                    style={{ fontFamily: 'var(--font-cinzel), serif' }}
                  >
                    Join Our Community
                  </h2>
                  <p className="text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl text-[#e4e4e7] leading-relaxed mb-8 sm:mb-12 max-w-2xl mx-auto font-light">
                    Help us build the most comprehensive database of acting performance ratings.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center px-4 sm:px-0">
                    <Link href="/performances" className="w-full sm:w-auto">
                      <button 
                        className="group w-full sm:w-auto px-14 xs:px-16 sm:px-20 py-8 xs:py-9 sm:py-10 rounded-full text-black text-xl xs:text-2xl sm:text-3xl font-extrabold tracking-wider uppercase transition-all duration-400 hover:shadow-[0_0_40px_rgba(255,215,0,0.4)] min-h-[72px]"
                        style={{
                          background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
                          transform: 'scale(1)',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <span className="flex items-center justify-center gap-4 xs:gap-5 whitespace-nowrap">
                          Start Rating Now
                          <FaArrowRight className="w-6 h-6 xs:w-7 xs:h-7 transition-transform duration-300 group-hover:translate-x-2" />
                        </span>
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      </HomeLayout>
    </>
  );
}

function PremiumFeatureCard({ icon, title, description, variant = 'medium' }: { icon: React.ReactNode; title: string; description: string; variant?: 'wide' | 'medium' }) {
  const isWide = variant === 'wide';
  
  return (
    <div 
      className={`group relative rounded-xl sm:rounded-2xl border border-transparent bg-gradient-to-br from-[#1a1a1a]/80 to-black/80 backdrop-blur-xl overflow-hidden transition-all duration-300 ${
        isWide ? 'p-8 sm:p-10 md:p-12' : 'p-6 sm:p-8 md:p-10'
      }`}
      style={{
        boxShadow: `
          0 25px 70px -15px rgba(0, 0, 0, 0.9),
          0 15px 40px -10px rgba(0, 0, 0, 0.7),
          0 0 0 1px rgba(255, 255, 255, 0.05),
          inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
          inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
        `,
        transform: 'translateY(-6px) perspective(1000px) rotateX(1.5deg)',
        transformStyle: 'preserve-3d',
      }}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute top-1/2 left-0 w-48 h-48 sm:w-72 sm:h-72 bg-[#FFD700]/5 rounded-full blur-3xl" />
      </div>
      
      <div className={`relative z-10 flex ${isWide ? 'flex-row items-start' : 'flex-col sm:flex-row items-start'} gap-4 sm:gap-6`}>
        <div className={`flex-shrink-0 ${isWide ? 'w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24' : 'w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16'} rounded-lg sm:rounded-xl bg-gradient-to-br from-[#FFD700]/20 to-[#FFA500]/10 border border-[#FFD700]/30 flex items-center justify-center shadow-[0_0_30px_rgba(255,215,0,0.15)]`}>
          {icon}
        </div>
        
        <div className="flex-1">
          <h3 
            className={`${isWide ? 'text-2xl sm:text-3xl md:text-4xl' : 'text-xl sm:text-2xl md:text-3xl'} font-bold text-white mb-2 sm:mb-3`}
            style={{ fontFamily: 'var(--font-cinzel), serif' }}
          >
            {title}
          </h3>
          <p className={`${isWide ? 'text-base sm:text-lg md:text-xl' : 'text-sm sm:text-base md:text-lg'} text-[#e4e4e7] leading-relaxed font-light`}>
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
