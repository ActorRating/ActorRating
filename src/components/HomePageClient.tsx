// src/components/HomePageClient.tsx
"use client";

import { useUser } from "@/components/providers/SessionProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FaStar, FaHandshake, FaTheaterMasks, FaUsers, FaChartLine, FaArrowRight, FaCheckCircle, FaRocket, FaCog, FaBolt, FaShieldAlt, FaMagic, FaGlobe, FaLightbulb, FaTrophy } from "react-icons/fa";
import { GiClapperboard, GiHeartWings } from "react-icons/gi";
import { motion } from "framer-motion";
import { fadeInUp, getMotionProps, staggerContainer, scaleIn } from "@/lib/animations";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

// How It Works Section - Clean Grid Layout (No Carousel)
function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      icon: FaTheaterMasks,
      title: "Discover",
      description: "Browse 25,000+ acclaimed performances across cinema history"
    },
    {
      number: "02",
      icon: FaStar,
      title: "Rate",
      description: "Evaluate using five professional criteria inspired by Academy standards"
    },
    {
      number: "03",
      icon: FaChartLine,
      title: "Compare",
      description: "Explore community consensus and discover new perspectives"
    }
  ];

  return (
    <div className="relative z-10 bg-black py-16 sm:py-40 md:py-48 lg:py-60" style={{ willChange: 'auto' }}>
      {/* Background ambient glow */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#FFC800]/20 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-[#FFB000]/15 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 relative">
        <div className="grid grid-cols-12 gap-8">
          {/* Title - Centered with gutters */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="col-span-12 lg:col-start-2 lg:col-span-10 text-center mb-24 sm:mb-32 lg:mb-40"
          >
            <h2 
              className="text-4xl xs:text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-8 tracking-tight px-4 sm:px-0"
              style={{ fontFamily: 'var(--font-cinzel), serif' }}
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
              How
            </span>{' '}
            It Works
          </h2>
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            whileInView={{ width: "220px", opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ willChange: 'width, opacity' }}
            className="h-[2px] mx-auto mb-8 relative"
          >
            <div 
              className="h-full w-full"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,200,0,0.4) 15%, rgba(255,180,0,0.9) 40%, rgba(255,165,0,1) 50%, rgba(255,180,0,0.9) 60%, rgba(255,200,0,0.4) 85%, transparent 100%)',
                boxShadow: '0 0 20px rgba(255, 165, 0, 0.6), 0 0 40px rgba(255, 165, 0, 0.3)',
              }}
            />
          </motion.div>
            <p className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl text-[#e4e4e7] max-w-4xl mx-auto font-light leading-relaxed px-6 sm:px-4">
              Three simple steps to join the world's most sophisticated acting rating platform
            </p>
          </motion.div>

          {/* Container for centered 3-column cards */}
          <div className="col-span-12 lg:col-start-2 lg:col-span-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15, margin: "0px 0px -50px 0px" }}
                  transition={{ duration: 0.5, delay: index * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
                  style={{ willChange: 'transform, opacity' }}
                  className="group relative"
                >
              {/* Premium Card - Clean & Centered */}
              <div 
                className="relative h-full p-8 sm:p-10 rounded-3xl border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0a0a0a]/90 to-black/95 backdrop-blur-2xl overflow-hidden transition-all duration-500 ease-out group-hover:scale-[1.02]"
                style={{
                  boxShadow: `
                    0 30px 80px -20px rgba(0, 0, 0, 0.9),
                    0 15px 40px -10px rgba(0, 0, 0, 0.7),
                    0 0 0 1px rgba(255, 255, 255, 0.05),
                    inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                  `,
                  transform: 'translateY(-8px) perspective(1200px) rotateX(2deg)',
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* Subtle glow effect on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <div 
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full rounded-full blur-2xl"
                    style={{
                      background: 'radial-gradient(circle, rgba(255, 215, 0, 0.08) 0%, rgba(255, 165, 0, 0.04) 50%, transparent 100%)',
                    }}
                  />
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center justify-center text-center h-full">
                  {/* Icon */}
                  <div className="mb-6">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#FFD700]/25 to-[#FFA500]/15 border-2 border-[#FFD700]/40 flex items-center justify-center shadow-[0_0_30px_rgba(255,215,0,0.2)] mx-auto">
                      <step.icon className="w-8 h-8 sm:w-10 sm:h-10 text-[#FFD700]" />
                    </div>
                  </div>

                  {/* Number Badge */}
                  <div className="mb-6">
                    <div className="inline-block px-4 py-2 rounded-full bg-black/50 border border-[#FFD700]/30">
                      <span 
                        className="text-2xl sm:text-3xl font-extrabold"
                        style={{ 
                          fontFamily: 'var(--font-cinzel), serif',
                          background: 'linear-gradient(135deg, #FFE55C, #FFD700)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                      >
                        {step.number}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 
                    className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight"
                    style={{ fontFamily: 'var(--font-cinzel), serif' }}
                  >
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-base sm:text-lg text-[#d4d4d8] leading-relaxed max-w-sm mx-auto">
                    {step.description}
                  </p>
                </div>

                {/* Decorative corner accent */}
                <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-tl from-[#FFD700]/8 to-transparent rounded-tl-[100px] pointer-events-none" />
                <div className="absolute top-0 left-0 w-40 h-40 bg-gradient-to-br from-[#FFA500]/5 to-transparent rounded-br-[100px] pointer-events-none" />
              </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Call to action */}
          <motion.div
            className="col-span-12 lg:col-start-2 lg:col-span-10 text-center mt-16 sm:mt-20 lg:mt-24"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ willChange: 'transform, opacity' }}
          >
          <Link href="/performances">
            <button 
              className="group px-12 sm:px-16 py-6 sm:py-7 rounded-full text-black text-lg sm:text-xl font-extrabold tracking-wider uppercase transition-all duration-500 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
              }}
            >
              <span className="flex items-center gap-4">
                Start Rating
                <FaArrowRight className="w-6 h-6 transition-transform duration-500 group-hover:translate-x-3" />
              </span>
            </button>
          </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// Performance Section with active card tracking
function PerformanceSection() {
  const [activeCard, setActiveCard] = useState(0);

  const highlights = [
    {
      actor: "Cillian Murphy",
      movie: "Oppenheimer",
      quote: "A haunting portrayal of genius and consequence",
      year: "2023",
      rating: "9.4"
    },
    {
      actor: "Heath Ledger",
      movie: "The Dark Knight",
      quote: "An iconic transformation that redefined villainy",
      year: "2008",
      rating: "9.8"
    },
    {
      actor: "Joaquin Phoenix",
      movie: "Joker",
      quote: "Raw intensity and psychological depth",
      year: "2019",
      rating: "9.6"
    },
    {
      actor: "Margot Robbie",
      movie: "Barbie",
      quote: "Effortless charm meets existential depth",
      year: "2023",
      rating: "9.1"
    },
    {
      actor: "Paul Mescal",
      movie: "Aftersun",
      quote: "Subtlety and heartbreak in perfect measure",
      year: "2022",
      rating: "9.3"
    },
    {
      actor: "Cate Blanchett",
      movie: "TÁR",
      quote: "A masterclass in power and vulnerability",
      year: "2022",
      rating: "9.5"
    }
  ];

  useEffect(() => {
    const container = document.querySelector('.performance-scroll-container');
    if (!container) return;

    const handleScroll = () => {
      const cardWidth = container.scrollWidth / highlights.length;
      const scrollPosition = container.scrollLeft;
      const newActiveCard = Math.round(scrollPosition / cardWidth);
      setActiveCard(newActiveCard);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [highlights.length]);

  // Auto-scroll animation on mobile when section comes into view
  useEffect(() => {
    // Only run on mobile (screen width < 1024px)
    if (typeof window === 'undefined' || window.innerWidth >= 1024) return;

    const section = document.querySelector('.performance-section-container');
    const container = document.querySelector('.performance-scroll-container') as HTMLElement;
    if (!section || !container) return;

    let hasAnimated = false;

    const performAnimation = () => {
      if (hasAnimated) return;
      hasAnimated = true;

      // Start at last card
      const cardWidth = container.scrollWidth / highlights.length;
      const lastCardPosition = cardWidth * (highlights.length - 1);
      
      // Instantly jump to last card without animation
      container.scrollLeft = lastCardPosition;
      
      // Then smoothly scroll back to first card
      setTimeout(() => {
        const startPosition = container.scrollLeft;
        const distance = -startPosition; // Distance to scroll back to 0
        const duration = 3500;
        let startTime: number | null = null;

        const animation = (currentTime: number) => {
          if (startTime === null) startTime = currentTime;
          const timeElapsed = currentTime - startTime;
          const progress = Math.min(timeElapsed / duration, 1);

          container.scrollLeft = startPosition + distance * progress;

          if (progress < 1) {
            requestAnimationFrame(animation);
          }
        };

        requestAnimationFrame(animation);
      }, 300);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            performAnimation();
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(section);
    
    return () => {
      observer.disconnect();
    };
  }, [highlights.length]);

  return (
    <div className="performance-section-container relative z-10 bg-black py-32 sm:py-40 md:py-48 lg:py-60 overflow-visible">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-[#0a0a0a] to-black" />

      <div className="max-w-7xl mx-auto px-4 relative overflow-visible">
        <div className="grid grid-cols-12 gap-8">
          {/* Title with gutters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3, margin: "0px 0px -100px 0px" }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ willChange: 'transform, opacity' }}
            className="col-span-12 lg:col-start-2 lg:col-span-10 text-center mb-24 sm:mb-32 lg:mb-40"
          >
            <h2 
              className="text-4xl xs:text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-6 tracking-tight px-4 sm:px-0"
              style={{ fontFamily: 'var(--font-cinzel), serif' }}
            >
              Performance{' '}
            <span 
              style={{
                background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%, #FF8C00 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 0 40px rgba(255, 215, 0, 0.3))',
              }}
            >
              Highlights
            </span>
            </h2>
            <p className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl text-[#e4e4e7] max-w-4xl mx-auto font-light leading-relaxed px-6 sm:px-4">
              Discover the performances that define cinematic excellence
            </p>
          </motion.div>

          {/* Quote Cards - 12-column grid system with gutters */}
          <div className="col-span-12 lg:col-start-2 lg:col-span-10 overflow-visible">
            <div className="performance-scroll-container flex lg:grid lg:grid-cols-2 gap-8 overflow-x-auto lg:overflow-visible pb-8 lg:pb-0 pt-4 snap-x snap-mandatory lg:snap-none scrollbar-hide -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
              {highlights.map((highlight, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15, margin: "0px 0px -50px 0px" }}
                transition={{ duration: 0.5, delay: index * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
                style={{ willChange: 'transform, opacity' }}
                className="group relative flex-shrink-0 w-[85vw] sm:w-[75vw] lg:w-auto snap-center"
              >
              {/* Premium Card - 3D Elevated */}
              <div 
                className="relative h-full p-8 sm:p-10 md:p-12 rounded-3xl border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-visible transition-all duration-700"
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
                {/* Glow effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/10 rounded-full blur-3xl" />
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex-1">
                    {/* Rating Badge */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/15 border border-[#FFD700]/40">
                        <FaStar className="w-4 h-4 text-[#FFD700]" />
                        <span className="text-xl font-bold text-[#FFD700]">{highlight.rating}</span>
                      </div>
                      <span className="text-base text-[#a1a1aa] font-medium">{highlight.year}</span>
                    </div>

                    {/* Actor Name */}
                    <h3 
                      className="text-2xl sm:text-3xl font-bold text-white mb-2"
                      style={{ fontFamily: 'var(--font-cinzel), serif' }}
                    >
                      {highlight.actor}
                    </h3>

                    {/* Movie Title */}
                    <div className="mb-4">
                      <span className="text-lg text-[#FFD700] font-semibold tracking-wide">
                        {highlight.movie}
                      </span>
                    </div>

                    {/* Quote */}
                    <div className="mb-6">
                      <p className="text-lg sm:text-xl text-[#e4e4e7] leading-relaxed italic font-light">
                        <span className="text-[#FFD700]/60">"</span>
                        {highlight.quote}
                        <span className="text-[#FFD700]/60">"</span>
                      </p>
                    </div>
                  </div>

                  {/* Rate Button - Always at bottom */}
                  <div className="mt-auto pt-4">
                    <Link href={`/performances`}>
                      <button 
                        className="w-full px-8 py-4 rounded-full text-black text-base font-bold tracking-wider uppercase transition-all duration-500 hover:scale-105"
                        style={{
                          background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
                        }}
                      >
                        <span className="flex items-center justify-center gap-2">
                          Rate
                          <FaStar className="w-4 h-4" />
                        </span>
                      </button>
                    </Link>
                  </div>
                </div>

                {/* Decorative accent */}
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[#FFD700]/5 to-transparent rounded-tr-[80px]" />
              </div>
            </motion.div>
            ))}
            </div>
          </div>

          {/* Navigation Dots - Mobile Only */}
          <div className="col-span-12 lg:col-start-2 lg:col-span-10 relative flex lg:hidden justify-center items-center mt-8 px-4">
            {/* 3D styled container matching cards */}
            <div className="relative px-6 py-3 rounded-2xl bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl border border-transparent"
              style={{
                boxShadow: `
                  0 25px 70px -15px rgba(0, 0, 0, 0.9),
                  0 15px 40px -10px rgba(0, 0, 0, 0.7),
                  0 0 0 1px rgba(255, 255, 255, 0.05),
                  inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                  inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                `,
                transform: 'translateY(-2px) perspective(1000px) rotateX(1deg)',
                transformStyle: 'preserve-3d',
              }}
            >
              <div className="performance-carousel-dots relative z-10 flex justify-center items-center gap-2.5">
                {highlights.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      const container = document.querySelector('.performance-scroll-container');
                      if (container) {
                        const cardWidth = container.scrollWidth / highlights.length;
                        container.scrollTo({ left: cardWidth * index, behavior: 'smooth' });
                      }
                    }}
                    className={`performance-dot rounded-full transition-all duration-300 ${
                      index === activeCard 
                        ? 'performance-dot-active' 
                        : 'performance-dot-inactive'
                    }`}
                    aria-label={`Go to card ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Features Section - Clean Vertical Stack (No Carousel)
function FeaturesSection() {
  const features = [
    {
      icon: FaUsers,
      title: "Community-driven precision",
      description: "Every rating shapes collective understanding of acting excellence.",
      descriptionFull: "Every rating shapes the collective understanding of acting excellence. Be part of building the definitive platform for analyzing cinematic performance.",
      stats: "Growing community"
    },
    {
      icon: FaChartLine,
      title: "Actor-by-actor insights",
      description: "Deep analysis across performances and career trajectories.",
      descriptionFull: "Deep analysis across performances, roles, and career trajectories. Track evolution, compare eras, and discover patterns in acting excellence across the history of cinema.",
      stats: "25K+ performances"
    },
    {
      icon: FaStar,
      title: "Thoughtful rating experience",
      description: "Five professional criteria ensure nuanced evaluations.",
      descriptionFull: "Five professional criteria ensure nuanced, meaningful evaluations. Emotional depth, technical skill, authenticity, impact, and overall performance combine for comprehensive analysis.",
      stats: "5-criteria system"
    }
  ];

  return (
    <div className="relative z-10 bg-black py-32 sm:py-40 md:py-48 lg:py-60">
      {/* Background glow */}
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-[700px] h-[700px] bg-[#FFC800]/20 rounded-full blur-[160px]" />
      </div>

      <div className="max-w-5xl mx-auto px-4 relative">
        <div className="grid grid-cols-12 gap-8 lg:gap-10">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3, margin: "0px 0px -100px 0px" }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ willChange: 'transform, opacity' }}
            className="col-span-12 text-center mb-16 sm:mb-24 lg:mb-32"
          >
          <h2 
            className="text-4xl xs:text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-8 tracking-tight px-4 sm:px-0"
            style={{ fontFamily: 'var(--font-cinzel), serif' }}
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
              Why
            </span>{' '}
            ActorRating
          </h2>
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            whileInView={{ width: "200px", opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ willChange: 'width, opacity' }}
            className="h-[2px] mx-auto relative"
          >
            <div 
              className="h-full w-full"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,200,0,0.4) 15%, rgba(255,180,0,0.9) 40%, rgba(255,165,0,1) 50%, rgba(255,180,0,0.9) 60%, rgba(255,200,0,0.4) 85%, transparent 100%)',
                boxShadow: '0 0 20px rgba(255, 165, 0, 0.6), 0 0 40px rgba(255, 165, 0, 0.3)',
              }}
            />
          </motion.div>
          </motion.div>

          {/* Features - Vertical Stack on all screen sizes */}
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15, margin: "0px 0px -50px 0px" }}
              transition={{ duration: 0.5, delay: index * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
              style={{ willChange: 'transform, opacity' }}
              className="col-span-12 group relative mb-6 last:mb-0"
            >
              {/* Premium Feature Card - 3D Elevated */}
              <div 
                className="relative p-8 sm:p-8 md:p-10 lg:p-16 rounded-3xl border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden transition-all duration-300"
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
                {/* Glow effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <div className="absolute top-1/2 left-0 w-96 h-96 bg-[#FFD700]/10 rounded-full blur-3xl" />
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col sm:flex-row items-start gap-4 sm:gap-6 md:gap-8">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-2xl bg-gradient-to-br from-[#FFD700]/25 to-[#FFA500]/15 border-2 border-[#FFD700]/40 flex items-center justify-center shadow-[0_0_40px_rgba(255,215,0,0.2)]">
                      <feature.icon className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 text-[#FFD700]" />
                    </div>
                  </div>

                  {/* Text Content */}
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-4 mb-5 sm:mb-6 md:mb-8">
                      <h3 
                        className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight"
                        style={{ fontFamily: 'var(--font-cinzel), serif' }}
                      >
                        {feature.title}
                      </h3>
                      <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/30 self-start sm:self-auto">
                        <FaCheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#FFD700]" />
                        <span className="text-xs font-semibold text-[#FFD700] whitespace-nowrap">{feature.stats}</span>
                      </div>
                    </div>
                    <p className="text-sm sm:text-base md:text-lg lg:text-xl text-[#e4e4e7] leading-relaxed">
                      <span className="hidden md:inline">{feature.descriptionFull}</span>
                      <span className="md:hidden">{feature.description}</span>
                    </p>
                  </div>
                </div>

                {/* Decorative accent */}
                <div className="absolute bottom-0 right-0 w-48 h-48 bg-gradient-to-tl from-[#FFD700]/5 to-transparent rounded-tl-[120px]" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// About Section - Visual & Minimal
function AboutSection() {
  return (
    <div className="relative z-10 bg-black py-32 sm:py-40 md:py-48 lg:py-60">
      {/* Background glow */}
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FFC800]/15 rounded-full blur-[180px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 text-center relative">
        <div className="grid grid-cols-12 gap-8">
          {/* Title with gutters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3, margin: "0px 0px -100px 0px" }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ willChange: 'transform, opacity' }}
            className="col-span-12 lg:col-start-2 lg:col-span-10 mb-20 sm:mb-24"
          >
          <h2 
            className="text-4xl xs:text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-10 tracking-tight px-4 sm:px-0"
            style={{ fontFamily: 'var(--font-cinzel), serif' }}
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
          </h2>
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            whileInView={{ width: "200px", opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ willChange: 'width, opacity' }}
            className="h-[2px] mx-auto relative"
          >
            <div 
              className="h-full w-full"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,200,0,0.4) 15%, rgba(255,180,0,0.9) 40%, rgba(255,165,0,1) 50%, rgba(255,180,0,0.9) 60%, rgba(255,200,0,0.4) 85%, transparent 100%)',
                boxShadow: '0 0 20px rgba(255, 165, 0, 0.6), 0 0 40px rgba(255, 165, 0, 0.3)',
              }}
            />
          </motion.div>
          </motion.div>

          {/* Container for centered 3-column stat cards */}
          <div className="col-span-12 lg:col-start-2 lg:col-span-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Stat Card 1 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3, margin: "0px 0px -50px 0px" }}
                transition={{ duration: 0.4, delay: 0.08, ease: [0.25, 0.1, 0.25, 1] }}
                style={{ 
                  willChange: 'transform, opacity',
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
                className="relative p-6 sm:p-8 rounded-3xl border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl"
              >
            <div className="text-5xl font-extrabold mb-3"
              style={{
                background: 'linear-gradient(135deg, #FFE55C, #FFD700)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              25K+
            </div>
            <div className="text-lg text-[#e4e4e7] font-semibold">
              Performances
            </div>
              </motion.div>

              {/* Stat Card 2 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3, margin: "0px 0px -50px 0px" }}
                transition={{ duration: 0.4, delay: 0.12, ease: [0.25, 0.1, 0.25, 1] }}
                style={{ 
                  willChange: 'transform, opacity',
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
                className="relative p-6 sm:p-8 rounded-3xl border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl"
              >
            <div className="text-5xl font-extrabold mb-3"
              style={{
                background: 'linear-gradient(135deg, #FFE55C, #FFD700)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              5
            </div>
            <div className="text-lg text-[#e4e4e7] font-semibold">
              Rating Criteria
            </div>
              </motion.div>

              {/* Stat Card 3 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3, margin: "0px 0px -50px 0px" }}
                transition={{ duration: 0.4, delay: 0.16, ease: [0.25, 0.1, 0.25, 1] }}
                style={{ 
                  willChange: 'transform, opacity',
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
                className="relative p-6 sm:p-8 rounded-3xl border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl"
              >
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-[#FFD700] animate-pulse" />
              <div className="text-3xl font-extrabold text-[#FFD700]">
                Live
              </div>
            </div>
            <div className="text-lg text-[#e4e4e7] font-semibold">
              Growing Daily
            </div>
              </motion.div>
            </div>
          </div>

          {/* Tagline */}
          <p className="col-span-12 lg:col-start-2 lg:col-span-10 text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl text-[#e4e4e7] leading-relaxed font-light mb-20 sm:mb-24 lg:mb-28 max-w-3xl mx-auto px-6 sm:px-4">
            Be among the first to join us and be a part of the journey
          </p>

          {/* Learn More Button */}
          <div className="col-span-12 lg:col-start-2 lg:col-span-10">
            <Link href="/about">
          <button 
            className="group px-10 py-4 rounded-full text-black text-base font-bold tracking-wider uppercase transition-all duration-300 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
            }}
          >
            <span className="flex items-center gap-3">
              Learn More
              <FaArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-2" />
            </span>
          </button>
        </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePageClient() {
  const user = useUser() || null;
  const router = useRouter();

  // If user is logged in, redirect to performances
  useEffect(() => {
    if (user) {
      router.replace('/performances');
    }
  }, [user, router]);

  // Fix scroll to top on mount
  useEffect(() => {
    // Ensure page starts at top
    if (typeof window !== 'undefined' && window.scrollY > 0) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, []);


  if (user) return null;

  return (
    <>
      <div className="hero min-h-[100vh] relative flex items-center justify-center bg-black" style={{ willChange: 'auto' }}>
        {/* Spotlight effect - Award show aesthetic with premium gold */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 0.15, scale: 1 }}
          transition={{ duration: 3, ease: [0.22, 1, 0.36, 1] }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[1100px] rounded-full blur-[140px] z-[1] pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255, 200, 0, 0.28) 0%, rgba(255, 180, 0, 0.18) 35%, rgba(255, 160, 0, 0.08) 55%, transparent 75%)',
            willChange: 'opacity, transform'
          }}
        />
        
        {/* Smooth fade to next section */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-10"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 50%, transparent 100%)'
          }}
        />
        
        <div className="hero-content max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 relative z-10 w-full flex items-center justify-center">
          {/* Hero Section - Award Show Caliber with 12-column grid */}
          <div className="grid grid-cols-12 gap-8 py-24 sm:py-28 md:py-32 lg:py-40 w-full">
            <div className="col-span-12 flex flex-col justify-center items-center text-center px-1">
            {/* Main Headline - MASSIVE & Centered */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.4, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="-mt-8 sm:-mt-8 md:mt-0 mb-8 sm:mb-10 md:mb-12 px-3 sm:px-4"
            >
              <h1 
                className="hero-tagline text-5xl xs:text-6xl sm:text-7xl md:text-8xl lg:text-9xl text-white mb-0 leading-[0.95] font-extrabold px-1 whitespace-nowrap sm:whitespace-normal"
                style={{ 
                  fontFamily: 'var(--font-cinzel), serif',
                  textShadow: '0 10px 40px rgba(0,0,0,0.7), 0 0 100px rgba(255,215,0,0.12)'
                }}
              >
                <span className="block sm:inline mb-2 sm:mb-0 sm:mr-3 md:mr-4">Rate the</span>
                <span 
                  className="block sm:inline"
                  style={{
                    background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%, #FF8C00 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    filter: 'drop-shadow(0 0 40px rgba(255, 215, 0, 0.3))',
                  }}
                >
                  Craft
                </span>
              </h1>
            </motion.div>

            {/* Gold Divider - Cinematic */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "180px", opacity: 1 }}
              transition={{ duration: 2, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="h-[2px] mx-auto mb-8 sm:mb-10 md:mb-12 relative"
            >
              <div 
                className="h-full w-full"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,229,92,0.4) 15%, rgba(255,215,0,0.9) 40%, rgba(255,215,0,1) 50%, rgba(255,215,0,0.9) 60%, rgba(255,229,92,0.4) 85%, transparent 100%)',
                  boxShadow: '0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.3)',
                }}
              />
            </motion.div>

            {/* Subtitle - Clear & Compelling */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, delay: 0.9, ease: 'easeOut' }}
              className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl max-w-4xl mx-auto leading-relaxed text-[#a3a3a3] px-5 sm:px-4 mb-14 sm:mb-16 md:mb-20 font-light"
              style={{ letterSpacing: '0.005em' }}
            >
              Judge performances like the Academy.
            </motion.p>

            {/* CTA Button - Convert with Elegance */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1.1, ease: [0.22, 1, 0.36, 1] }}
              className="px-5 sm:px-4 w-full sm:w-auto flex justify-center"
            >
              <Link href="/performances" className="w-full sm:w-auto max-w-sm">
                <button className="group relative w-full sm:w-auto min-w-[260px] xs:min-w-[280px] sm:min-w-[320px] px-8 xs:px-10 sm:px-14 py-4 xs:py-5 sm:py-6 overflow-hidden rounded-full transition-all duration-500 hover:scale-[1.06] active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
                    boxShadow: '0 10px 40px rgba(255, 215, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1) inset, 0 25px 70px rgba(255, 165, 0, 0.2)',
                  }}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2 xs:gap-3 text-black font-bold text-sm xs:text-base sm:text-lg tracking-[0.12em] xs:tracking-[0.15em] uppercase">
                    Start Rating Now
                    <svg 
                      className="w-5 h-5 transition-transform duration-500 group-hover:translate-x-2" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                  
                  {/* Premium Shimmer */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                    <div 
                      className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1200 ease-out"
                      style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
                      }}
                    />
                  </div>
                </button>
              </Link>
            </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <HowItWorksSection />

      {/* Performance Highlights Section */}
      <PerformanceSection />

      {/* Features Section */}
      <FeaturesSection />

      {/* About Section */}
      <AboutSection />
    </>
  );
}
