"use client"

import { HomeLayout } from "@/components/layout"
import { motion } from "framer-motion"
import { FaUsers, FaStar, FaHandshake, FaChartLine } from "react-icons/fa"
import { GiClapperboard } from "react-icons/gi"
import Link from "next/link"

export default function AboutPage() {
  return (
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
              Our mission is to create the most comprehensive and reliable database of community-driven acting performance ratings.
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
                We are dedicated to collecting <strong className="text-foreground">community-driven, high-quality rating data</strong> that provides meaningful insights into acting performances across cinema. By focusing on specific performances rather than entire films, we create a nuanced understanding of what makes great acting truly exceptional.
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
              <div className="bg-background p-6 sm:p-8 rounded-xl border border-border">
                <div className="flex items-center mb-4">
                  <FaUsers className="w-8 h-8 text-primary mr-4" />
                  <h3 className="text-xl sm:text-2xl font-semibold text-foreground">Community-Driven</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Every rating comes from real movie enthusiasts who care about acting quality. Our community ensures diverse perspectives and authentic evaluations.
                </p>
              </div>

              <div className="bg-background p-6 sm:p-8 rounded-xl border border-border">
                <div className="flex items-center mb-4">
                  <FaStar className="w-8 h-8 text-primary mr-4" />
                  <h3 className="text-xl sm:text-2xl font-semibold text-foreground">Performance-Focused</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  We rate individual performances, not entire movies. This allows for precise evaluation of each actor&apos;s contribution to their role.
                </p>
              </div>

              <div className="bg-background p-6 sm:p-8 rounded-xl border border-border">
                <div className="flex items-center mb-4">
                  <GiClapperboard className="w-8 h-8 text-primary mr-4" />
                  <h3 className="text-xl sm:text-2xl font-semibold text-foreground">Oscar-Inspired Criteria</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Our five-category rating system is inspired by Academy Award standards, ensuring professional-grade evaluation criteria.
                </p>
              </div>

              <div className="bg-background p-6 sm:p-8 rounded-xl border border-border">
                <div className="flex items-center mb-4">
                  <FaChartLine className="w-8 h-8 text-primary mr-4" />
                  <h3 className="text-xl sm:text-2xl font-semibold text-foreground">Quality Data</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  We prioritize data quality over quantity, ensuring each rating provides meaningful insights into acting excellence.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Our Approach */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mb-16 sm:mb-24"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-foreground mb-8 sm:mb-12 text-center">
              Our Approach
            </h2>
            
            <div className="space-y-6 sm:space-y-8">
              <div className="bg-background p-6 sm:p-8 rounded-xl border border-border">
                <h3 className="text-xl sm:text-2xl font-semibold text-foreground mb-4">Comprehensive Evaluation</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Each performance is evaluated across five key dimensions: Emotional Range & Depth, Character Believability, Technical Skill, Screen Presence, and Chemistry & Interaction.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  This multi-faceted approach ensures we capture the full spectrum of what makes an acting performance exceptional.
                </p>
              </div>

              <div className="bg-background p-6 sm:p-8 rounded-xl border border-border">
                <h3 className="text-xl sm:text-2xl font-semibold text-foreground mb-4">Community Collaboration</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We believe that the best insights come from passionate moviegoers who appreciate the art of acting. Our platform encourages thoughtful, detailed ratings that contribute to a collective understanding of acting excellence.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Every rating helps build a more comprehensive picture of what the community values in great performances.
                </p>
              </div>

              <div className="bg-background p-6 sm:p-8 rounded-xl border border-border">
                <h3 className="text-xl sm:text-2xl font-semibold text-foreground mb-4">Continuous Improvement</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Our platform evolves based on community feedback and the changing landscape of cinema. We&apos;re committed to maintaining the highest standards of data quality and user experience.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  As the film industry grows and new talents emerge, our community-driven approach ensures we stay relevant and valuable.
                </p>
              </div>
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
                  prefetch
                  className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Start Rating Performances
                </Link>
                <Link 
                  href="/auth/signup" 
                  prefetch
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
  )
}






