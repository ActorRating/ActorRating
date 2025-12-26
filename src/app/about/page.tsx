// src/app/about/page.tsx
"use client"

import { HomeLayout } from "@/components/layout";
import { motion } from "framer-motion";
import { FaStar, FaChartLine, FaArrowRight, FaTheaterMasks } from "react-icons/fa";
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
      "ActorRating is a platform dedicated to evaluating individual acting performances, not overall films.",
    publisher: {
      "@type": "Organization",
      name: "ActorRating",
      url: "https://www.actorrating.com",
    },
  };

  return (
    <>
      <Head>
        <title>About ActorRating — Rate the acting, not the movie</title>
        <meta
          name="description"
          content="ActorRating is a platform dedicated to evaluating individual acting performances, not overall films."
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

          <div className="w-full px-4 sm:px-6 lg:px-8 pt-40 sm:pt-44 md:pt-48 lg:pt-56 pb-16 sm:pb-24 md:pb-32 lg:pb-40 relative" style={{ maxWidth: '1280px', margin: '0 auto' }}>
            
            {/* Hero Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="text-center mb-20 sm:mb-28"
            >
              <h1 
                className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-6 sm:mb-8 tracking-tight leading-[1.1]"
                style={{ 
                  fontFamily: 'var(--font-cinzel), serif'
                }}
              >
                Rate the{' '}
                <span 
                  style={{
                    background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%, #FF8C00 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    filter: 'drop-shadow(0 0 40px rgba(255, 215, 0, 0.3))',
                  }}
                >
                  acting
                </span>
              </h1>
            </motion.div>

            {/* Main Content Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="mb-16 sm:mb-20"
            >
              <div 
                className="group relative p-8 sm:p-12 md:p-16 lg:p-20 rounded-[2.5rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_50px_rgba(255,215,0,0.15)]"
                style={{
                  boxShadow: `
                    0 25px 70px -15px rgba(0, 0, 0, 0.9),
                    0 15px 40px -10px rgba(0, 0, 0, 0.7),
                    0 0 0 1px rgba(255, 255, 255, 0.05),
                    inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                  `,
                  transform: 'translateY(-6px) perspective(1000px) rotateX(1deg)',
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* Glow effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2.5rem] overflow-hidden pointer-events-none">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-[#FFD700]/10 rounded-full blur-3xl" />
                </div>
                
                <div className="relative z-10 text-center max-w-3xl mx-auto space-y-6">
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-[#e4e4e7] font-light leading-relaxed italic" style={{ fontFamily: 'var(--font-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                    <span className="text-[#FFD700] text-xl sm:text-2xl md:text-3xl leading-none mr-1">"</span>
                    A great performance can exist in a mediocre movie.
                    <span className="text-[#FFD700] text-xl sm:text-2xl md:text-3xl leading-none ml-1">"</span>
                  </p>
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-[#e4e4e7] font-light leading-relaxed italic" style={{ fontFamily: 'var(--font-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                    <span className="text-[#FFD700] text-xl sm:text-2xl md:text-3xl leading-none mr-1">"</span>
                    A weak performance can exist in a great one.
                    <span className="text-[#FFD700] text-xl sm:text-2xl md:text-3xl leading-none ml-1">"</span>
                  </p>
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold leading-relaxed pt-2" style={{ fontFamily: 'var(--font-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                    <span 
                      style={{
                        background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      ActorRating exists to separate the two.
                    </span>
                  </p>
                </div>
              </div>
            </motion.div>

            {/* How It Works - Three Cards */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="mb-16 sm:mb-20"
            >
              <h2 
                className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-12 sm:mb-16 text-center"
                style={{ fontFamily: 'var(--font-cinzel), serif' }}
              >
                <span 
                  style={{
                    background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%, #FF8C00 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  How
                </span>{' '}
                It Works
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                {/* Step 1 */}
                <div 
                  className="group relative p-8 sm:p-10 rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,215,0,0.12)]"
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
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem] overflow-hidden pointer-events-none">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/10 rounded-full blur-3xl" />
                  </div>
                  <div className="relative z-10 text-center space-y-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#FFD700]/10 border-2 border-[#FFD700]/30">
                      <FaTheaterMasks className="w-8 h-8 sm:w-10 sm:h-10 text-[#FFD700]" />
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-cinzel), serif' }}>
                      Select
                    </h3>
                    <p className="text-base sm:text-lg md:text-xl text-[#e4e4e7]/80 font-light leading-relaxed" style={{ fontFamily: 'var(--font-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                      Choose an actor's role in a specific film
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div 
                  className="group relative p-8 sm:p-10 rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,215,0,0.12)]"
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
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem] overflow-hidden pointer-events-none">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/10 rounded-full blur-3xl" />
                  </div>
                  <div className="relative z-10 text-center space-y-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#FFD700]/10 border-2 border-[#FFD700]/30">
                      <FaStar className="w-8 h-8 sm:w-10 sm:h-10 text-[#FFD700]" />
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-cinzel), serif' }}>
                      Rate
                    </h3>
                    <p className="text-base sm:text-lg md:text-xl text-[#e4e4e7]/80 font-light leading-relaxed" style={{ fontFamily: 'var(--font-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                      Score across five standardized categories
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div 
                  className="group relative p-8 sm:p-10 rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,215,0,0.12)]"
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
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem] overflow-hidden pointer-events-none">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/10 rounded-full blur-3xl" />
                  </div>
                  <div className="relative z-10 text-center space-y-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#FFD700]/10 border-2 border-[#FFD700]/30">
                      <FaChartLine className="w-8 h-8 sm:w-10 sm:h-10 text-[#FFD700]" />
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-cinzel), serif' }}>
                      Compare
                    </h3>
                    <p className="text-base sm:text-lg md:text-xl text-[#e4e4e7]/80 font-light leading-relaxed" style={{ fontFamily: 'var(--font-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                      View aggregated scores across films and actors
                    </p>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Why ActorRating Exists */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="mb-16 sm:mb-20"
            >
              <div 
                className="group relative p-8 sm:p-12 md:p-16 lg:p-20 rounded-[2.5rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_50px_rgba(255,215,0,0.15)]"
                style={{
                  boxShadow: `
                    0 25px 70px -15px rgba(0, 0, 0, 0.9),
                    0 15px 40px -10px rgba(0, 0, 0, 0.7),
                    0 0 0 1px rgba(255, 255, 255, 0.05),
                    inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                  `,
                  transform: 'translateY(-6px) perspective(1000px) rotateX(1deg)',
                  transformStyle: 'preserve-3d',
                }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2.5rem] overflow-hidden pointer-events-none">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-[#FFD700]/10 rounded-full blur-3xl" />
                </div>
                
                <div className="relative z-10 max-w-3xl mx-auto">
                  <h2 
                    className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-12 text-center"
                    style={{ fontFamily: 'var(--font-cinzel), serif' }}
                  >
                    Why This{' '}
                    <span 
                      style={{
                        background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%, #FF8C00 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      Matters
                    </span>
                  </h2>
                  <div className="text-center mb-12">
                    <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl text-[#e4e4e7] font-light mb-4" style={{ fontFamily: 'var(--font-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                      Most platforms rate <span className="line-through text-[#e4e4e7]/30">movies</span>
                    </p>
                    <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-light" style={{ fontFamily: 'var(--font-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                      <span 
                        style={{
                          background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                      >
                        ActorRating rates acting
                      </span>
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div 
                      className="group relative p-6 sm:p-8 rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden transition-all duration-300"
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
                      <div className="relative z-10 flex items-start gap-4">
                        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-[#FFD700] mt-2 group-hover:scale-125 transition-transform duration-300" />
                        <p className="text-base sm:text-lg md:text-xl text-[#e4e4e7] font-light leading-relaxed" style={{ fontFamily: 'var(--font-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                          Compare actors across different roles and eras
                        </p>
                      </div>
                    </div>
                    <div 
                      className="group relative p-6 sm:p-8 rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden transition-all duration-300"
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
                      <div className="relative z-10 flex items-start gap-4">
                        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-[#FFD700] mt-2 group-hover:scale-125 transition-transform duration-300" />
                        <p className="text-base sm:text-lg md:text-xl text-[#e4e4e7] font-light leading-relaxed" style={{ fontFamily: 'var(--font-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                          Identify career-defining performances
                        </p>
                      </div>
                    </div>
                    <div 
                      className="group relative p-6 sm:p-8 rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden transition-all duration-300"
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
                      <div className="relative z-10 flex items-start gap-4">
                        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-[#FFD700] mt-2 group-hover:scale-125 transition-transform duration-300" />
                        <p className="text-base sm:text-lg md:text-xl text-[#e4e4e7] font-light leading-relaxed" style={{ fontFamily: 'var(--font-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                          Surface overlooked or underappreciated work
                        </p>
                      </div>
                    </div>
                    <div 
                      className="group relative p-6 sm:p-8 rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden transition-all duration-300"
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
                      <div className="relative z-10 flex items-start gap-4">
                        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-[#FFD700] mt-2 group-hover:scale-125 transition-transform duration-300" />
                        <p className="text-base sm:text-lg md:text-xl text-[#e4e4e7] font-light leading-relaxed" style={{ fontFamily: 'var(--font-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                          Build a comprehensive database of acting quality
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* CTA */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="text-center"
            >
              <div 
                className="group relative p-12 sm:p-16 rounded-[2.5rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_50px_rgba(255,215,0,0.15)]"
                style={{
                  boxShadow: `
                    0 25px 70px -15px rgba(0, 0, 0, 0.9),
                    0 15px 40px -10px rgba(0, 0, 0, 0.7),
                    0 0 0 1px rgba(255, 255, 255, 0.05),
                    inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                  `,
                  transform: 'translateY(-6px) perspective(1000px) rotateX(1deg)',
                  transformStyle: 'preserve-3d',
                }}
              >
                <div className="absolute inset-0 opacity-15 pointer-events-none rounded-[2.5rem] overflow-hidden">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#FFD700]/20 rounded-full blur-3xl" />
                </div>
                
                <div className="relative z-10">
                  <h2 
                    className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6"
                    style={{ fontFamily: 'var(--font-cinzel), serif' }}
                  >
                    Ready to{' '}
                    <span 
                      style={{
                        background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%, #FF8C00 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      Start?
                    </span>
                  </h2>
                  <p className="text-lg sm:text-xl md:text-2xl text-[#e4e4e7]/80 font-light mb-10 leading-relaxed" style={{ fontFamily: 'var(--font-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                    Join the community and start rating performances
                  </p>
                  <Link href="/performances">
                    <button 
                      className="group/btn inline-flex items-center justify-center gap-4 px-10 sm:px-14 py-5 sm:py-6 rounded-full text-black text-lg sm:text-xl font-bold tracking-wider uppercase transition-all duration-400 hover:shadow-[0_0_40px_rgba(255,215,0,0.4)] hover:scale-105 group-hover:scale-105"
                      style={{
                        background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
                      }}
                    >
                      Start Rating
                      <FaArrowRight className="w-5 h-5 transition-transform duration-300 group-hover/btn:translate-x-2" />
                    </button>
                  </Link>
                </div>
              </div>
            </motion.section>

          </div>
        </div>
      </HomeLayout>
    </>
  );
}
