// src/components/HomePageClient.tsx
"use client";

import { useUser, useSession } from "@/components/providers/SessionProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { FaStar, FaHandshake, FaTheaterMasks, FaUsers, FaChartLine, FaArrowRight, FaCheckCircle, FaRocket, FaCog, FaBolt, FaShieldAlt, FaMagic, FaGlobe, FaLightbulb, FaTrophy } from "react-icons/fa";
import { GiClapperboard, GiHeartWings } from "react-icons/gi";
import { motion } from "framer-motion";
import { fadeInUp, getMotionProps, fadeIn } from "@/lib/animations";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

// How It Works Section - Clean Grid Layout with Fan
function HowItWorksSection() {
  const [topCardIndex, setTopCardIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  
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

  // Handle drag for top card - LEFT only
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    dragStartX.current = e.touches[0].clientX;
    dragStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = Math.abs(dragStartX.current - currentX);
    const deltaY = Math.abs(dragStartY.current - currentY);
    
    // Only prevent scroll if horizontal movement is greater than vertical (horizontal swipe)
    if (deltaX > 10 && deltaX > deltaY) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const offset = dragStartX.current - currentX; // Negative = left
    // Only allow dragging to the left
    setDragOffset(Math.max(0, offset));
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
      // Reduced threshold for easier mobile swipe (60px instead of 100px)
      if (dragOffset > 60) {
        // Animate card out smoothly before cycling
        setIsAnimatingOut(true);
        setTimeout(() => {
          setTopCardIndex((prev) => (prev + 1) % steps.length);
          setDragOffset(0);
          setIsAnimatingOut(false);
        }, 250); // Faster transition
    } else {
      // Snap back if not dragged far enough
      setDragOffset(0);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartX.current = e.clientX;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const offset = dragStartX.current - e.clientX; // Negative = left
    setDragOffset(Math.max(0, offset));
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
      // Reduced threshold for easier swipe
      if (dragOffset > 60) {
        // Animate card out smoothly before cycling
        setIsAnimatingOut(true);
        setTimeout(() => {
          setTopCardIndex((prev) => (prev + 1) % steps.length);
          setDragOffset(0);
          setIsAnimatingOut(false);
        }, 250); // Faster transition
    } else {
      // Snap back if not dragged far enough
      setDragOffset(0);
    }
  };

  useEffect(() => {
    if (isDragging) {
      // Prevent body scroll on mobile when dragging
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const offset = dragStartX.current - e.clientX; // Negative = left
        setDragOffset(Math.max(0, offset));
      };
      
      const handleGlobalMouseUp = () => {
        setIsDragging(false);
      // Reduced threshold for easier swipe
      if (dragOffset > 60) {
        // Animate card out smoothly before cycling
        setIsAnimatingOut(true);
        setTimeout(() => {
          setTopCardIndex((prev) => (prev + 1) % steps.length);
          setDragOffset(0);
          setIsAnimatingOut(false);
        }, 250); // Faster transition
        } else {
          // Snap back if not dragged far enough
          setDragOffset(0);
        }
      };

      const handleGlobalTouchMove = (e: TouchEvent) => {
        // Prevent scrolling while dragging horizontally
        if (isDragging && e.touches.length > 0) {
          const currentX = e.touches[0].clientX;
          const deltaX = Math.abs(dragStartX.current - currentX);
          // Only prevent if there's significant horizontal movement
          if (deltaX > 10) {
            e.preventDefault();
          }
        }
      };

      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      window.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
      
      return () => {
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
        window.removeEventListener('touchmove', handleGlobalTouchMove);
      };
    } else {
      // Restore scrolling when not dragging
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
  }, [isDragging, dragOffset, steps.length]);

  return (
    <div className="relative z-10 bg-black mt-4 sm:-mt-24 md:-mt-28 lg:-mt-32 xl:-mt-36 pt-4 sm:pt-24 md:pt-28 lg:pt-32 xl:pt-36 pb-8 sm:py-40 md:py-48 lg:py-60" style={{ willChange: 'auto' }}>
      {/* Background ambient glow */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#FFC800]/20 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-[#FFB000]/15 rounded-full blur-[150px]" />
      </div>

      <div className="w-full relative" style={{ maxWidth: '1280px', margin: '0 auto', paddingLeft: '1rem', paddingRight: '1rem' }}>
        <div className="grid grid-cols-12">
          {/* Title - Centered with gutters */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="col-span-12 lg:col-span-12 text-center mb-16 sm:mb-32 lg:mb-40"
          >
            <h2 
              className="text-5xl xs:text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold text-white mb-8 tracking-tight px-4 sm:px-0"
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
          <div className="col-span-12 lg:col-span-12">
            {/* Mobile: Stacked Deck - Top Card Draggable */}
            <div className="md:hidden relative pb-8 pt-2" style={{ height: '520px' }}>
              <div className="relative w-full h-full flex items-center justify-center">
                {steps.map((step, index) => {
                  const StepIcon = step.icon;
                  
                  // Calculate position in the circular queue
                  const queuePosition = (index - topCardIndex + steps.length) % steps.length;
                  const isTopCard = queuePosition === 0;
                  const isVisible = queuePosition < steps.length;
                  
                  // Z-index: top card highest, then decreasing
                  const zIndex = isTopCard ? 10 : (10 - queuePosition);
                  
                  // Only top card can be dragged to the left
                  // If animating out, smoothly slide it all the way off screen
                  const finalTranslateX = isTopCard && isAnimatingOut ? -400 : (isTopCard ? -dragOffset : 0);
                  const finalOpacity = isTopCard && isAnimatingOut ? 0 : (isVisible ? 1 : 0);
                  
                  // Cards underneath peek more - larger offset and progressive rotation
                  const peekOffset = isTopCard ? 0 : queuePosition * 20; // More visible peek
                  const peekRotation = isTopCard ? 0 : queuePosition === 1 ? 3 : queuePosition === 2 ? 6 : 0; // Progressive tilt (positive)
                  const peekDown = isTopCard ? 0 : queuePosition * 8; // Move down slightly when tilted
                  
                  return (
                    <div
                      key={index}
                      ref={(el) => { cardRefs.current[index] = el; }}
                      className={`absolute top-1/2 left-1/2 w-72 ${isTopCard ? 'cursor-grab active:cursor-grabbing' : ''}`}
                      style={{
                        transform: `translate(-50%, -50%) translateX(${finalTranslateX + peekOffset}px) translateY(${peekDown}px) rotate(${peekRotation}deg)`,
                        transformOrigin: 'top left',
                        zIndex: zIndex,
                        opacity: finalOpacity,
                        transition: isTopCard && (isAnimatingOut || !isDragging)
                          ? 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease-out' 
                          : isTopCard && isDragging
                          ? 'none'
                          : 'opacity 0.6s ease-out, transform 0.3s ease-out',
                        pointerEvents: isTopCard ? 'auto' : 'none',
                        touchAction: isTopCard ? 'pan-x' : 'auto',
                      }}
                      onTouchStart={isTopCard ? handleTouchStart : undefined}
                      onTouchMove={isTopCard ? handleTouchMove : undefined}
                      onTouchEnd={isTopCard ? handleTouchEnd : undefined}
                      onMouseDown={isTopCard ? handleMouseDown : undefined}
                      onMouseMove={isTopCard ? handleMouseMove : undefined}
                      onMouseUp={isTopCard ? handleMouseUp : undefined}
                    >
                      <div 
                        className="relative h-full p-8 rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/95 to-black/95 backdrop-blur-2xl overflow-hidden"
                        style={{
                          boxShadow: `
                            0 35px 90px -20px rgba(0, 0, 0, 0.95),
                            0 20px 50px -10px rgba(0, 0, 0, 0.8),
                            0 0 0 1px rgba(255, 255, 255, 0.06),
                            inset 0 1px 0 0 rgba(255, 255, 255, 0.12),
                            inset 0 -1px 0 0 rgba(0, 0, 0, 0.4)
                          `,
                        }}
                      >
                        <div className="relative z-10 flex flex-col items-center justify-center text-center h-full">
                          <div className="mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FFD700]/25 to-[#FFA500]/15 border-2 border-[#FFD700]/40 flex items-center justify-center shadow-[0_0_30px_rgba(255,215,0,0.2)] mx-auto">
                              <StepIcon className="w-8 h-8 text-[#FFD700]" />
                            </div>
                          </div>
                          <div className="mb-6">
                            <div className="inline-block px-4 py-2 rounded-full bg-black/50 border border-[#FFD700]/30">
                              <span 
                                className="text-2xl font-extrabold"
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
                          <h3 
                            className="text-3xl font-bold text-white mb-6 leading-tight"
                            style={{ fontFamily: 'var(--font-cinzel), serif' }}
                          >
                            {step.title}
                          </h3>
                          <p className="text-base text-[#d4d4d8] leading-relaxed max-w-sm mx-auto">
                            {step.description}
                          </p>
                        </div>
                        <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-tl from-[#FFD700]/8 to-transparent rounded-tl-[100px] pointer-events-none" />
                        <div className="absolute top-0 left-0 w-40 h-40 bg-gradient-to-br from-[#FFA500]/5 to-transparent rounded-br-[100px] pointer-events-none" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Desktop: Fan Layout */}
            <div className="hidden md:flex md:justify-center md:items-center md:gap-4 lg:gap-6 max-w-6xl mx-auto relative" style={{ minHeight: '500px' }}>
              {steps.map((step, index) => {
                const StepIcon = step.icon;
                // Fan angles: left card rotates left, center stays straight, right rotates right
                const rotation = index === 0 ? -8 : index === 1 ? 0 : 8;
                const translateY = index === 0 ? 20 : index === 1 ? 0 : 20;
                const zIndex = index === 1 ? 10 : 5;
                
                return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 8, rotate: rotation }}
                  whileInView={{ opacity: 1, y: translateY, rotate: rotation }}
                  viewport={{ once: true, amount: 0.15, margin: "0px 0px -50px 0px" }}
                  transition={{ duration: 0.4, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  style={{ 
                    willChange: 'transform, opacity',
                    transform: `rotate(${rotation}deg) translateY(${translateY}px)`,
                    zIndex: zIndex,
                  }}
                  className="group relative flex-1 max-w-sm"
                >
              {/* Premium Card - Clean & Centered with enhanced 3D shadow */}
              <div 
                className="relative h-full p-8 sm:p-10 rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/95 to-black/95 backdrop-blur-2xl overflow-hidden transition-all duration-300 ease-out hover:shadow-[0_0_40px_rgba(255,215,0,0.15)]"
                style={{
                  boxShadow: `
                    0 35px 90px -20px rgba(0, 0, 0, 0.95),
                    0 20px 50px -10px rgba(0, 0, 0, 0.8),
                    0 0 0 1px rgba(255, 255, 255, 0.06),
                    inset 0 1px 0 0 rgba(255, 255, 255, 0.12),
                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.4)
                  `,
                  transform: 'translateY(-4px) perspective(1000px) rotateX(1deg)',
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* Subtle glow effect on hover - CLIPPED with enhanced visibility */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-[2rem] overflow-hidden">
                  <div 
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full rounded-full blur-3xl"
                    style={{
                      background: 'radial-gradient(circle, rgba(255, 215, 0, 0.15) 0%, rgba(255, 165, 0, 0.08) 50%, transparent 100%)',
                    }}
                  />
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center justify-center text-center h-full">
                  {/* Icon */}
                  <div className="mb-6">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#FFD700]/25 to-[#FFA500]/15 border-2 border-[#FFD700]/40 flex items-center justify-center shadow-[0_0_30px_rgba(255,215,0,0.2)] mx-auto">
                      <StepIcon className="w-8 h-8 sm:w-10 sm:h-10 text-[#FFD700]" />
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
                );
              })}
            </div>
          </div>

          {/* Call to action */}
          <motion.div
            className="col-span-12 lg:col-span-12 text-center mt-12 sm:mt-20 lg:mt-24"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ willChange: 'transform, opacity' }}
          >
          <Link href="/performances">
            <button 
              className="group px-14 xs:px-16 sm:px-20 py-8 xs:py-9 sm:py-10 rounded-full text-black text-xl xs:text-2xl sm:text-3xl font-bold tracking-wider uppercase transition-all duration-400 hover:shadow-[0_0_40px_rgba(255,215,0,0.4)] min-h-[72px]"
              style={{
                background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
                transform: 'scale(1)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <span className="flex items-center gap-4 xs:gap-5">
                Start Rating
                <FaArrowRight className="w-6 h-6 xs:w-7 xs:h-7 transition-transform duration-300 group-hover:translate-x-2" />
              </span>
            </button>
          </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// Performance Section with active card tracking and depth effect
function PerformanceSection() {
  const [activeCard, setActiveCard] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

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

  // Track active card and apply depth effect (desktop only)
  useEffect(() => {
    const container = document.querySelector('.performance-scroll-container');
    if (!container) return;

    const updateCardDepth = () => {
      // Only apply depth effect on desktop
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      
      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;
      
      let closestIndex = 0;
      let closestDistance = Infinity;
      
      cardRefs.current.forEach((card, index) => {
        if (!card) return;
        
        const cardRect = card.getBoundingClientRect();
        const cardCenter = cardRect.left + cardRect.width / 2;
        const distance = Math.abs(containerCenter - cardCenter);
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
        
        if (desktop) {
          // Calculate depth effect based on distance from center
          const maxDistance = containerRect.width / 2;
          const normalizedDistance = Math.min(distance / maxDistance, 1);
          const scale = 1 - (normalizedDistance * 0.08); // Scale from 1 to 0.92
          const opacity = 1 - (normalizedDistance * 0.4); // Opacity from 1 to 0.6
          const translateY = normalizedDistance * 10; // Move down by up to 10px
          
          card.style.transform = `scale(${scale}) translateY(${translateY}px)`;
          card.style.opacity = `${opacity}`;
        } else {
          // Reset on mobile
          card.style.transform = 'scale(1) translateY(0)';
          card.style.opacity = '1';
        }
      });
      
      setActiveCard(closestIndex);
    };

    container.addEventListener('scroll', updateCardDepth, { passive: true });
    window.addEventListener('resize', updateCardDepth, { passive: true });
    
    // On initial load, apply depth effect immediately, then center first card on desktop
    const desktop = window.innerWidth >= 1024;
    
    // Ensure first card is active initially
    setActiveCard(0);
    
    // Apply initial depth effect - wait for next frame to ensure DOM is ready
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        updateCardDepth();
        
        // On desktop, center the first card after applying initial depth
        if (desktop && cardRefs.current[0]) {
          const firstCard = cardRefs.current[0];
          if (firstCard) {
            firstCard.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
            // Update depth again after centering completes
            setTimeout(() => {
              requestAnimationFrame(() => {
                updateCardDepth();
              });
            }, 150);
          }
        }
      });
    });
    
    return () => {
      container.removeEventListener('scroll', updateCardDepth);
      window.removeEventListener('resize', updateCardDepth);
    };
  }, [highlights.length]);

  // AUTO-SCROLL DISABLED - User requested no auto-scroll on mobile
  // useEffect(() => {
  //   // Only run on mobile (screen width < 1024px)
  //   if (typeof window === 'undefined' || window.innerWidth >= 1024) return;
  //   ...
  // }, [highlights.length]);

  return (
    <div className="performance-section-container relative z-10 bg-black py-32 sm:py-40 md:py-48 lg:py-60 overflow-visible">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-[#0a0a0a] to-black" />

      <div className="w-full relative overflow-visible" style={{ maxWidth: '1280px', margin: '0 auto', paddingLeft: '1rem', paddingRight: '1rem' }}>
        <div className="grid grid-cols-12">
          {/* Title with gutters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3, margin: "0px 0px -100px 0px" }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ willChange: 'transform, opacity' }}
            className="col-span-12 lg:col-span-12 text-center mb-24 sm:mb-32 lg:mb-40"
          >
            <h2 
              className="text-5xl xs:text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold text-white mb-6 tracking-tight px-4 sm:px-0"
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
              Discover the performances that define cinematic excellence
            </p>
          </motion.div>

          {/* Quote Cards - Carousel with fade edges */}
          <div className="col-span-12 overflow-visible">
            <div className="relative -mx-4 sm:-mx-0">
              <div 
                className="overflow-hidden"
                style={{
                  maskImage: 'linear-gradient(to right, transparent 0%, black 80px, black calc(100% - 80px), transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 80px, black calc(100% - 80px), transparent 100%)',
                }}
              >
                <div className="performance-scroll-container flex gap-8 overflow-x-auto pb-8 pt-4 snap-x snap-mandatory scrollbar-hide pl-4 pr-4 sm:pl-0 sm:pr-0 lg:px-[20vw] xl:px-[25vw]">
                  {highlights.map((highlight, index) => (
                  <motion.div
                    key={index}
                    ref={(el) => cardRefs.current[index] = el}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.15, margin: "0px 0px -50px 0px" }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="group relative flex-shrink-0 w-[85vw] sm:w-[75vw] lg:w-[38vw] xl:w-[32vw] snap-center lg:cursor-pointer performance-card-mobile"
                    style={{ 
                      willChange: 'transform, opacity',
                      paddingLeft: index === 0 && !isDesktop ? '1rem' : '0',
                      paddingRight: index === highlights.length - 1 && !isDesktop ? '1rem' : '0',
                      /* Hardware acceleration for smooth scrolling */
                      transform: 'translateZ(0)',
                      WebkitTransform: 'translateZ(0)',
                    }}
                    onClick={() => {
                      if (window.innerWidth >= 1024) {
                        const element = cardRefs.current[index];
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                        }
                      }
                    }}
                  >
              {/* Premium Card - Clean & Cinematic */}
              <div 
                className="relative h-full p-8 sm:p-10 md:p-12 rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,215,0,0.12)]"
                style={{
                  boxShadow: `
                    0 25px 70px -15px rgba(0, 0, 0, 0.9),
                    0 15px 40px -10px rgba(0, 0, 0, 0.7),
                    0 0 0 1px rgba(255, 255, 255, 0.05),
                    inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                  `,
                }}
              >
                {/* Glow effect - CLIPPED to card corners */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem] overflow-hidden pointer-events-none">
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
            </div>
          </div>

          {/* Navigation Dots */}
          <div className="col-span-12 relative flex justify-center items-center mt-8 px-4">
            <div className="relative rounded-xl bg-gradient-to-br from-[#1a1a1a]/80 via-[#0f0f0f]/70 to-black/80 backdrop-blur-xl border border-white/5"
              style={{
                boxShadow: `
                  0 10px 30px -5px rgba(0, 0, 0, 0.7),
                  0 0 0 1px rgba(255, 255, 255, 0.03),
                  inset 0 1px 0 0 rgba(255, 255, 255, 0.05)
                `,
                padding: '6px 12px',
              }}
            >
              <div className="relative z-10 flex justify-center items-center" style={{ gap: '6px' }}>
                {highlights.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      const container = document.querySelector('.performance-scroll-container');
                      if (container) {
                        const cards = container.querySelectorAll('.performance-scroll-container > div');
                        const targetCard = cards[index] as HTMLElement;
                        if (targetCard) {
                          targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                        }
                      }
                    }}
                    style={{
                      width: index === activeCard ? '20px' : '5px',
                      height: '5px',
                      minWidth: index === activeCard ? '20px' : '5px',
                      minHeight: '5px',
                      padding: 0,
                      border: 'none',
                      backgroundColor: index === activeCard ? '#FFD700' : 'rgba(115, 115, 115, 0.4)',
                      borderRadius: '9999px',
                      transition: 'all 0.3s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      if (index !== activeCard) {
                        e.currentTarget.style.backgroundColor = 'rgba(115, 115, 115, 0.6)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (index !== activeCard) {
                        e.currentTarget.style.backgroundColor = 'rgba(115, 115, 115, 0.4)';
                      }
                    }}
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

      <div className="w-full relative" style={{ maxWidth: '1280px', margin: '0 auto', paddingLeft: '1rem', paddingRight: '1rem' }}>
        <div className="grid grid-cols-12">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3, margin: "0px 0px -100px 0px" }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ willChange: 'transform, opacity' }}
            className="col-span-12 lg:col-span-12 text-center mb-16 sm:mb-24 lg:mb-32"
          >
          <h2 
            className="text-5xl xs:text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold text-white mb-8 tracking-tight px-4 sm:px-0"
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

          {/* Features - Mobile: Clean Simplified Cards, Desktop: Vertical Stack */}
          
          {/* Mobile: Simplified Feature Cards */}
          <div className="col-span-12 md:hidden space-y-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: index * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
                className="group relative flex justify-center"
              >
                <div 
                  className="relative p-8 rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden transition-all duration-300 w-full"
                  style={{
                    boxShadow: `
                      0 20px 50px -15px rgba(0, 0, 0, 0.9),
                      0 10px 30px -10px rgba(0, 0, 0, 0.7),
                      0 0 0 1px rgba(255, 255, 255, 0.05),
                      inset 0 1px 0 0 rgba(255, 255, 255, 0.1)
                    `,
                  }}
                >
                  <div className="flex items-center gap-6 mb-6">
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#FFD700]/25 to-[#FFA500]/15 border border-[#FFD700]/40 flex items-center justify-center shadow-[0_0_25px_rgba(255,215,0,0.2)]">
                        <feature.icon className="w-7 h-7 text-[#FFD700]" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 
                        className="text-xl font-bold text-white leading-tight mb-2"
                        style={{ fontFamily: 'var(--font-cinzel), serif' }}
                      >
                        {feature.title}
                      </h3>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 border border-[#FFD700]/30">
                        <FaCheckCircle className="w-2.5 h-2.5 text-[#FFD700]" />
                        <span className="text-xs font-semibold text-[#FFD700]">{feature.stats}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-[#d4d4d8] leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Desktop: Individual Cards */}
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15, margin: "0px 0px -50px 0px" }}
              transition={{ duration: 0.5, delay: index * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
              style={{ willChange: 'transform, opacity' }}
              className="col-span-12 hidden md:flex group relative mb-6 last:mb-0 justify-center"
            >
              {/* Premium Feature Card - 3D Elevated */}
              <div 
                className="relative p-8 sm:p-10 md:p-12 lg:p-14 rounded-3xl border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden transition-all duration-300 w-full max-w-4xl"
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
                <div className="relative z-10 flex flex-col sm:flex-row items-start gap-6 sm:gap-8 md:gap-10 lg:gap-12">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-2xl bg-gradient-to-br from-[#FFD700]/25 to-[#FFA500]/15 border-2 border-[#FFD700]/40 flex items-center justify-center shadow-[0_0_40px_rgba(255,215,0,0.2)]">
                      <feature.icon className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 text-[#FFD700]" />
                    </div>
                  </div>

                  {/* Text Content */}
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 mb-4 sm:mb-6 md:mb-8">
                      <h3 
                        className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight"
                        style={{ fontFamily: 'var(--font-cinzel), serif' }}
                      >
                        {feature.title}
                      </h3>
                      <div className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-black/50 border border-[#FFD700]/30 self-start sm:self-auto flex-shrink-0">
                        <FaCheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#FFD700] flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-semibold text-[#FFD700] break-words max-w-[200px] sm:max-w-none">{feature.stats}</span>
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
  const stats = [
    { value: "25K+", label: "Performances" },
    { value: "5", label: "Rating Criteria" },
    { value: "Live", label: "Growing Daily", isLive: true }
  ];

  return (
    <div className="relative z-10 bg-black py-32 sm:py-40 md:py-48 lg:py-60">
      {/* Background glow */}
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FFC800]/15 rounded-full blur-[180px]" />
      </div>

      <div className="w-full text-center relative" style={{ maxWidth: '1280px', margin: '0 auto', paddingLeft: '1rem', paddingRight: '1rem' }}>
        <div className="grid grid-cols-12">
          {/* Title with gutters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3, margin: "0px 0px -100px 0px" }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ willChange: 'transform, opacity' }}
            className="col-span-12 lg:col-span-12 mb-12 sm:mb-16"
          >
          <h2 
            className="text-5xl xs:text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold text-white mb-10 tracking-tight px-4 sm:px-0"
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
          <p className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl text-[#e4e4e7] leading-relaxed font-light mb-16 sm:mb-20 lg:mb-24 max-w-3xl mx-auto px-6 sm:px-4">
            Be among the first to join us and be a part of the journey
          </p>
          </motion.div>

          {/* Container for centered 3-column stat cards */}
          <div className="col-span-12 lg:col-span-12">
            {/* Mobile: Individual Cards Stack */}
            <div className="md:hidden space-y-6">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.4, delay: index * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
                  className="relative max-w-sm mx-auto"
                >
                  <div
                    className="relative p-8 rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl"
                    style={{
                      boxShadow: `
                        0 25px 70px -15px rgba(0, 0, 0, 0.9),
                        0 15px 40px -10px rgba(0, 0, 0, 0.7),
                        0 0 0 1px rgba(255, 255, 255, 0.05),
                        inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                        inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                      `,
                    }}
                  >
                    {stat.isLive ? (
                      <>
                        <div className="flex items-center justify-center gap-2 mb-3">
                          <div className="w-2 h-2 rounded-full bg-[#FFD700] animate-pulse" />
                          <div 
                            className="text-4xl font-extrabold"
                            style={{
                              background: 'linear-gradient(135deg, #FFE55C, #FFD700)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                            }}
                          >
                            {stat.value}
                          </div>
                        </div>
                        <div className="text-lg text-[#e4e4e7] font-semibold text-center">
                          {stat.label}
                        </div>
                      </>
                    ) : (
                      <>
                        <div 
                          className="text-5xl font-extrabold mb-3 text-center"
                          style={{
                            background: 'linear-gradient(135deg, #FFE55C, #FFD700)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                          }}
                        >
                          {stat.value}
                        </div>
                        <div className="text-lg text-[#e4e4e7] font-semibold text-center">
                          {stat.label}
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Desktop: Grid */}
            <div className="hidden md:grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
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

          {/* Tagline - REMOVE DUPLICATE */}
          <div className="col-span-12 lg:col-span-12 mt-16 sm:mt-20 lg:mt-24">
            <Link href="/about">
          <button 
            className="group px-14 xs:px-16 sm:px-20 py-8 xs:py-9 sm:py-10 rounded-full text-black text-xl xs:text-2xl sm:text-3xl font-extrabold tracking-wider uppercase transition-all duration-400 hover:shadow-[0_0_40px_rgba(255,215,0,0.4)] min-h-[72px]"
            style={{
              background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
              transform: 'scale(1)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span className="flex items-center gap-4 xs:gap-5">
              Learn More
              <FaArrowRight className="w-6 h-6 xs:w-7 xs:h-7 transition-transform duration-300 group-hover:translate-x-2" />
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
  // Fix scroll to top on mount
  useEffect(() => {
    // Ensure page starts at top
    if (typeof window !== 'undefined' && window.scrollY > 0) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, []);

  return (
    <>
      <div className="hero min-h-[85vh] relative flex items-start justify-center bg-black w-full overflow-visible" style={{ willChange: 'auto', maxWidth: '100vw' }}>
        {/* Spotlight effect - Award show aesthetic with premium gold */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 0.15, scale: 1 }}
          transition={{ duration: 3, ease: [0.22, 1, 0.36, 1] }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[1100px] rounded-full blur-[140px] z-[1] pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255, 200, 0, 0.28) 0%, rgba(255, 180, 0, 0.18) 35%, rgba(255, 160, 0, 0.08) 55%, transparent 75%)',
            willChange: 'opacity, transform',
            maxWidth: '100vw',
            maxHeight: '100vh'
          }}
        />
        
        {/* Smooth fade to next section */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none z-10"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.2) 70%, transparent 100%)'
          }}
        />
        
        <div className="hero-content w-full relative z-10" style={{ maxWidth: '1280px', margin: '0 auto', paddingLeft: '1rem', paddingRight: '1rem' }}>
          {/* Hero Section - Award Show Caliber with 12-column grid */}
          <div className="grid grid-cols-12 pt-60 xs:pt-64 sm:pt-32 md:pt-40 lg:pt-48 xl:pt-56 pb-24 sm:pb-32 md:pb-40 lg:pb-48 xl:pb-56 w-full">
            <div className="col-span-12 lg:col-span-12 flex flex-col justify-center items-center w-full">
            {/* Main Headline - MASSIVE & Centered */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.4, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="mb-6 xs:mb-8 sm:mb-10 md:mb-12 lg:mb-14 w-full flex justify-center"
            >
              <h1 
                className="hero-tagline text-[3rem] xs:text-[3.5rem] sm:text-[4.25rem] md:text-[5.25rem] lg:text-[6.25rem] xl:text-[7.25rem] text-white mb-0 font-extrabold text-center lg:whitespace-nowrap px-4 mx-auto"
                style={{ 
                  fontFamily: 'var(--font-cinzel), serif',
                  textShadow: '0 10px 40px rgba(0,0,0,0.7)',
                  letterSpacing: '0.08em',
                  lineHeight: '1.1',
                  maxWidth: '100%',
                  display: 'inline-block'
                }}
              >
                <span className="inline sm:hidden" style={{ wordSpacing: '0.08em' }}>RATE THE </span>
                <span className="hidden sm:inline" style={{ wordSpacing: '0.02em' }}>RATE THE </span>
                <span 
                  className="inline sm:hidden"
                  style={{
                    background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%, #FF8C00 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    filter: 'drop-shadow(0 0 40px rgba(255, 215, 0, 0.3))',
                    wordSpacing: '0.08em',
                  }}
                >
                  CRAFT
                </span>
                <span 
                  className="hidden sm:inline"
                  style={{
                    background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%, #FF8C00 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    filter: 'drop-shadow(0 0 40px rgba(255, 215, 0, 0.3))',
                    wordSpacing: '0.02em',
                  }}
                >
                  CRAFT
                </span>
              </h1>
            </motion.div>

            {/* Gold Divider - Cinematic */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "180px", opacity: 1 }}
              transition={{ duration: 2, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="h-[2px] mx-auto mb-6 xs:mb-8 sm:mb-10 md:mb-12 lg:mb-14 relative"
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
              className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl w-full max-w-4xl leading-relaxed text-[#a3a3a3] mb-12 xs:mb-14 sm:mb-12 md:mb-14 lg:mb-16 font-light text-center px-4"
              style={{ letterSpacing: '0.005em' }}
            >
              Judge performances like the Academy.
            </motion.p>

            {/* CTA Button - Convert with Elegance */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1.1, ease: [0.22, 1, 0.36, 1] }}
              className="w-full flex justify-center"
            >
              <Link href="/performances" className="inline-block relative">
                <button className="group px-10 xs:px-12 sm:px-20 py-6 xs:py-7 sm:py-10 rounded-full text-black text-xl xs:text-2xl sm:text-3xl font-bold tracking-wider uppercase transition-all duration-400 hover:shadow-[0_0_40px_rgba(255,215,0,0.4)] min-h-[48px] min-w-[48px] xs:min-h-[52px] sm:min-h-[72px] relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
                    transform: 'scale(1)',
                    boxShadow: '0 0 20px rgba(255, 215, 0, 0.25), 0 0 40px rgba(255, 215, 0, 0.15)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.03)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                  }}
                >
                  {/* White light sweep effect */}
                  <span 
                    className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
                      width: '100%',
                      height: '100%',
                    }}
                  />
                  <span className="flex items-center justify-center gap-4 xs:gap-5 whitespace-nowrap relative z-10">
                    Start Rating Now
                    <FaArrowRight className="w-6 h-6 xs:w-7 xs:h-7 transition-transform duration-300 group-hover:translate-x-2" />
                  </span>
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
