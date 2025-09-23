"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { SearchBar } from "@/components/SearchBar"
import { HomeLayout } from "@/components/layout"
import { FaStar, FaHandshake, FaTheaterMasks, FaUsers, FaChartLine, FaPlay, FaArrowRight } from "react-icons/fa"
import { GiClapperboard, GiHeartWings } from "react-icons/gi"
import { motion } from "framer-motion"
import { fadeInUp, getMotionProps, staggerContainer, scaleIn } from "@/lib/animations"
import { Button } from "@/components/ui/Button"
import Link from "next/link"
import { PerformanceRatingPreview } from "@/components/rating/PerformanceRatingPreview"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Ensure page scrolls to top when component mounts
    const scrollToTop = () => {
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }
    
    // Immediate scroll
    scrollToTop()
    
    // Also scroll after a short delay to override any auto-focus behavior
    setTimeout(scrollToTop, 100)
  }, [])

  useEffect(() => {
    // Ensure page always loads to the top on mount and reload
    const scrollToTop = () => {
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }
    
    scrollToTop()
    
    // Also handle page visibility changes
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        scrollToTop()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (status === "authenticated") {
      router.replace("/dashboard")
    }
  }, [mounted, status, router])

  if (!mounted || status === "loading") {
    return (
      <HomeLayout>
        <div className="min-h-screen bg-background" />
      </HomeLayout>
    )
  }

  if (status === "authenticated") {
    return null
  }
  return (
    <HomeLayout>
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Gradient background overlays */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section - Mobile First Design */}
          <div className="flex flex-col justify-start text-center py-12 sm:py-16 md:py-20 lg:py-24">            
            <motion.h1 
              variants={fadeInUp}
              {...getMotionProps()}
              className="text-5xl sm:text-6xl md:text-6xl lg:text-7xl xl:text-7xl 2xl:text-8xl font-bold text-foreground mb-6 sm:mb-8 px-2 leading-tight"
            >
              <div className="bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent" style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Rate Acting
              </div>
              <div className="mt-3 sm:mt-4">
                <span className="text-foreground">Performances</span>
                <br />
                <span className="text-muted-foreground text-3xl sm:text-4xl md:text-4xl lg:text-5xl xl:text-5xl 2xl:text-6xl">Not Just Movies</span>
              </div>
            </motion.h1>
            
            <motion.p 
              variants={fadeInUp}
              {...getMotionProps()}
              className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-muted-foreground max-w-4xl mx-auto leading-relaxed mb-8 sm:mb-10 px-3"
            >
              The world's first platform for rating and analyzing 
              <span className="text-primary font-semibold"> acting performances</span> with our 
              <span className="text-accent font-semibold"> Oscar-inspired criteria</span>
            </motion.p>
            
            {/* Search Bar - Enhanced Design */}
            <motion.div 
              variants={scaleIn}
              {...getMotionProps()}
              className="max-w-lg sm:max-w-xl lg:max-w-2xl mx-auto mb-8 sm:mb-10 px-3"
            >
              <SearchBar 
                placeholder="Search actors, movies..."
                className="text-lg sm:text-xl shadow-2xl bg-transparent"
                onSearch={(query) => {
                  if (query.trim()) {
                    window.location.href = `/search?q=${encodeURIComponent(query.trim())}`
                  }
                }}
              />
            </motion.div>
            
            {/* CTA Buttons - Mobile Optimized */}
            <motion.div 
              variants={fadeInUp}
              {...getMotionProps()}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-8 sm:mb-12 px-4"
            >
              <Link href="/auth/signup" className="w-full sm:w-auto">
                <Button variant="premium" size="lg" className="group w-full sm:w-auto">
                  Get Started Free
                  <FaArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/auth/signin" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="group w-full sm:w-auto">
                  <FaPlay className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              </Link>
            </motion.div>
            
            {/* Stats - Mobile Optimized */}
            <motion.div 
              variants={staggerContainer}
              {...getMotionProps()}
              className="grid grid-cols-3 gap-4 sm:gap-6 max-w-lg sm:max-w-2xl mx-auto px-4"
            >
              <motion.div variants={fadeInUp} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-primary mb-1 sm:mb-2">5</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Oscar Criteria</div>
              </motion.div>
              <motion.div variants={fadeInUp} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-accent mb-1 sm:mb-2">∞</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Performances</div>
              </motion.div>
              <motion.div variants={fadeInUp} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-primary mb-1 sm:mb-2">100%</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Free</div>
              </motion.div>
            </motion.div>
          </div>

          {/* Interactive Sliders Preview (same style as rating page) */}
          <motion.div variants={fadeInUp} {...getMotionProps()} className="py-8 sm:py-10 px-4">
            <div className="text-center mb-6 sm:mb-8 lg:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6">
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent" style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Try Our
                </span>
                <br />
                Unique Rating System
              </h2>
            </div>
            <PerformanceRatingPreview />
            <div className="text-center mt-6 sm:mt-8">
              <Link href="/auth/signup" className="inline-block">
                <Button variant="premium" size="lg" className="group">
                  Start Rating
                  <FaArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Rating System Section */}
          <div className="py-12 sm:py-16 md:py-20 lg:py-24">
            <motion.div 
              variants={fadeInUp}
              {...getMotionProps()}
              className="text-center mb-6 sm:mb-8 lg:mb-12 px-4"
            >
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6">
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent" style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Oscar-Inspired
                </span>
                <br />
                Rating System
              </h2>
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
                Evaluate performances across five professional criteria used by industry experts and critics
              </p>
            </motion.div>
            
            <motion.div variants={staggerContainer} {...getMotionProps()} className="w-full px-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
                <motion.div 
                  variants={fadeInUp}
                  className="relative group safari-blur-fix"
                >
                  <div className="relative bg-secondary/50 backdrop-blur-sm p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl border border-border/50 text-center group-hover:border-primary/50 transition-all duration-300 h-full flex flex-col justify-center">
                    <div className="text-3xl sm:text-4xl mb-4 sm:mb-6 flex justify-center">
                      <GiHeartWings className="w-12 h-12 sm:w-16 sm:h-16 text-primary group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <h4 className="text-base sm:text-lg lg:text-xl font-bold text-foreground mb-2 sm:mb-3">Emotional Range & Depth</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed flex-1">How convincingly the actor portrays different emotions and complexity</p>
                  </div>
                </motion.div>
                
                <motion.div 
                  variants={fadeInUp}
                  className="relative group safari-blur-fix"
                >
                  <div className="relative bg-secondary/50 backdrop-blur-sm p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl border border-border/50 text-center group-hover:border-primary/50 transition-all duration-300 h-full flex flex-col justify-center">
                    <div className="text-3xl sm:text-4xl mb-4 sm:mb-6 flex justify-center">
                      <FaTheaterMasks className="w-12 h-12 sm:w-16 sm:h-16 text-primary group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <h4 className="text-base sm:text-lg lg:text-xl font-bold text-foreground mb-2 sm:mb-3">Character Believability</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed flex-1">How completely the actor transforms into and embodies the character</p>
                  </div>
                </motion.div>
                
                <motion.div 
                  variants={fadeInUp}
                  className="relative group sm:col-span-2 lg:col-span-1"
                >
                  <div className="relative bg-secondary/50 backdrop-blur-sm p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl border border-border/50 text-center group-hover:border-primary/50 transition-all duration-300 h-full flex flex-col justify-center">
                    <div className="text-3xl sm:text-4xl mb-4 sm:mb-6 flex justify-center">
                      <GiClapperboard className="w-12 h-12 sm:w-16 sm:h-16 text-primary group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <h4 className="text-base sm:text-lg lg:text-xl font-bold text-foreground mb-2 sm:mb-3">Technical Skill</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed flex-1">Voice work, physicality, timing, dialogue delivery, and overall craft</p>
                  </div>
                </motion.div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 max-w-3xl sm:max-w-4xl mx-auto">
                <motion.div 
                  variants={fadeInUp}
                  className="relative group safari-blur-fix"
                >
                  <div className="relative bg-secondary/50 backdrop-blur-sm p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl border border-border/50 text-center group-hover:border-primary/50 transition-all duration-300 h-full flex flex-col justify-center">
                    <div className="text-3xl sm:text-4xl mb-4 sm:mb-6 flex justify-center">
                      <FaStar className="w-12 h-12 sm:w-16 sm:h-16 text-primary group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <h4 className="text-base sm:text-lg lg:text-xl font-bold text-foreground mb-2 sm:mb-3">Screen Presence</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed flex-1">Charisma, magnetism, and ability to command attention on screen</p>
                  </div>
                </motion.div>
                
                <motion.div 
                  variants={fadeInUp}
                  className="relative group safari-blur-fix"
                >
                  <div className="relative bg-secondary/50 backdrop-blur-sm p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl border border-border/50 text-center group-hover:border-primary/50 transition-all duration-300 h-full flex flex-col justify-center">
                    <div className="text-3xl sm:text-4xl mb-4 sm:mb-6 flex justify-center">
                      <FaHandshake className="w-12 h-12 sm:w-16 sm:h-16 text-primary group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <h4 className="text-base sm:text-lg lg:text-xl font-bold text-foreground mb-2 sm:mb-3">Chemistry & Interaction</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed flex-1">How well they connect with other actors and work within scenes</p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
          {/* Mission Section */}
          <div className="py-12 sm:py-16 md:py-20 lg:py-24">
            <motion.div 
              variants={fadeInUp}
              {...getMotionProps()}
              className="relative group mx-4"
            >
              <div className="relative bg-secondary/40 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 xl:p-16 border border-border/50 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 sm:w-64 sm:h-64 bg-primary/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 left-0 w-32 h-32 sm:w-64 sm:h-64 bg-accent/5 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
                
                <div className="relative z-10">
                  <div className="text-center mb-8 sm:mb-12">
                    <motion.div 
                      variants={fadeInUp}
                      className="mb-4 sm:mb-6"
                    >
                      <span className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium border border-primary/20">
                        <FaStar className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1.5 sm:mr-2" />
                        Our Vision
                      </span>
                    </motion.div>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6">
                      <span className="bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent" style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Revolutionizing
                      </span>
                      <br />
                      Performance Analysis
                    </h2>
                    <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                      We're building the world's most comprehensive platform for 
                      <span className="text-primary font-semibold"> community-driven</span> acting performance analysis, 
                      powered by <span className="text-accent font-semibold">industry-standard criteria</span>
                    </p>
                  </div>
                  
                  <motion.div variants={staggerContainer} {...getMotionProps()} className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 max-w-4xl mx-auto mb-8 sm:mb-12">
                    <motion.div variants={fadeInUp} className="text-center group safari-blur-fix">
                      <div className="relative mb-4 sm:mb-6">
                        <div className="relative bg-primary/10 w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full mx-auto flex items-center justify-center border border-primary/30 group-hover:border-primary/50 transition-colors duration-300">
                          <FaUsers className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-primary group-hover:scale-110 transition-transform duration-300" />
                        </div>
                      </div>
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground mb-3 sm:mb-4">Community-Driven Excellence</h3>
                      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                        Every rating comes from passionate film enthusiasts and industry professionals, 
                        ensuring diverse perspectives and authentic evaluations.
                      </p>
                    </motion.div>
                    
                    <motion.div variants={fadeInUp} className="text-center group safari-blur-fix">
                      <div className="relative mb-4 sm:mb-6">
                        <div className="relative bg-accent/10 w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full mx-auto flex items-center justify-center border border-accent/30 group-hover:border-accent/50 transition-colors duration-300">
                          <FaChartLine className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-accent group-hover:scale-110 transition-transform duration-300" />
                        </div>
                      </div>
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground mb-3 sm:mb-4">Data-Driven Insights</h3>
                      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                        We prioritize quality over quantity, using advanced algorithms and professional 
                        criteria to ensure meaningful insights into acting excellence.
                      </p>
                    </motion.div>
                  </motion.div>
                  
                  <motion.div variants={fadeInUp} className="text-center">
                    <Link href="/about" className="inline-block w-full sm:w-auto">
                      <Button variant="premium" size="lg" className="group w-full sm:w-auto">
                        Discover Our Story
                        <FaArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      <style jsx global>{`
        html, body { overflow-x: hidden; max-width: 100vw; }
        body { background-color: var(--background); }
        .search-container { background-color: transparent !important; }
        input[type="text"] { background-color: var(--background) !important; border-color: var(--border) !important; }
      `}</style>
    </HomeLayout>
  )
}
