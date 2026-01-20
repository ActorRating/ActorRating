// src/components/HomePageClient.tsx
"use client";

import { useUser, useSession } from "@/components/providers/SessionProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { FaStar, FaHandshake, FaTheaterMasks, FaUsers, FaChartLine, FaArrowRight, FaCheckCircle, FaRocket, FaCog, FaBolt, FaShieldAlt, FaMagic, FaGlobe, FaLightbulb, FaTrophy, FaSearch } from "react-icons/fa";
import { GiClapperboard, GiHeartWings } from "react-icons/gi";
import { motion } from "framer-motion";
import { fadeInUp, getMotionProps, fadeIn, getOptimizedVariant, getStaggerContainer } from "@/lib/animations";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

// How It Works Section - Clean Grid Layout with Fan
function HowItWorksSection() {
  const [topCardIndex, setTopCardIndex] = useState(0);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [prefersReducedMotionDevice, setPrefersReducedMotionDevice] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobileDevice(window.innerWidth < 768);
      setPrefersReducedMotionDevice(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setPrefersReducedMotionDevice(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => {
      window.removeEventListener('resize', checkDevice);
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const steps = [
    {
      number: "1",
      icon: FaSearch,
      title: "Find a Performance",
      description: "Search 25,000+ actor performances from cinema history."
    },
    {
      number: "2",
      icon: FaStar,
      title: "Rate in 2 Minutes",
      description: "Five professional criteria. Submit your score."
    },
    {
      number: "3",
      icon: FaChartLine,
      title: "See the Consensus",
      description: "Compare your rating to the community average."
    }
  ];

  // Handle drag for top card - LEFT only - Optimized for smoothness
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    dragStartX.current = touch.clientX;
    dragStartY.current = touch.clientY;
    setDragOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const currentX = touch.clientX;
    const currentY = touch.clientY;
    const deltaX = dragStartX.current - currentX; // Positive = left swipe
    const deltaY = Math.abs(dragStartY.current - currentY);

    // Only handle horizontal swipes (left direction)
    if (deltaX > 0 && deltaX > deltaY * 1.5) {
      e.preventDefault();
      // Use requestAnimationFrame for smooth updates
      requestAnimationFrame(() => {
        setDragOffset(Math.min(deltaX, 400)); // Cap at 400px
      });
    } else if (deltaX < 0) {
      // Prevent right swipe, snap back
      requestAnimationFrame(() => {
        setDragOffset(0);
      });
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    const currentOffset = dragOffset;
    setIsDragging(false);

    // Threshold for swipe (30% of card width or 80px, whichever is smaller)
    const threshold = 80;
    if (currentOffset > threshold) {
      // Animate card out smoothly with better timing
      setIsAnimatingOut(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            setTopCardIndex((prev) => (prev + 1) % steps.length);
            setDragOffset(0);
            setIsAnimatingOut(false);
          }, 250);
        });
      });
    } else {
      // Snap back smoothly
      requestAnimationFrame(() => {
        setDragOffset(0);
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartX.current = e.clientX;
    setDragOffset(0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = dragStartX.current - e.clientX; // Positive = left
    requestAnimationFrame(() => {
      setDragOffset(Math.max(0, Math.min(deltaX, 400)));
    });
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    const currentOffset = dragOffset;
    setIsDragging(false);

    const threshold = 80;
    if (currentOffset > threshold) {
      setIsAnimatingOut(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            setTopCardIndex((prev) => (prev + 1) % steps.length);
            setDragOffset(0);
            setIsAnimatingOut(false);
          }, 250);
        });
      });
    } else {
      requestAnimationFrame(() => {
        setDragOffset(0);
      });
    }
  };

  useEffect(() => {
    if (isDragging) {
      // Only prevent scroll when actively dragging horizontally
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const deltaX = dragStartX.current - e.clientX;
        if (deltaX > 10) {
          requestAnimationFrame(() => {
            setDragOffset(Math.max(0, Math.min(deltaX, 400)));
          });
        }
      };

      const handleGlobalMouseUp = () => {
        const currentOffset = dragOffset;
        setIsDragging(false);
        const threshold = 80;
        if (currentOffset > threshold) {
          setIsAnimatingOut(true);
          // Use a smoother timing for the animation
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setTimeout(() => {
                setTopCardIndex((prev) => (prev + 1) % steps.length);
                setDragOffset(0);
                setIsAnimatingOut(false);
              }, 250);
            });
          });
        } else {
          // Smooth snap back with better easing
          requestAnimationFrame(() => {
            setDragOffset(0);
          });
        }
      };

      const handleGlobalTouchMove = (e: TouchEvent) => {
        if (e.touches.length > 0 && isDragging) {
          const touch = e.touches[0];
          const deltaX = dragStartX.current - touch.clientX;
          const deltaY = Math.abs(dragStartY.current - touch.clientY);

          // Only prevent scroll for clear horizontal swipes
          if (deltaX > 10 && deltaX > deltaY * 1.5) {
            e.preventDefault();
            requestAnimationFrame(() => {
              setDragOffset(Math.min(deltaX, 400));
            });
          }
        }
      };

      window.addEventListener('mousemove', handleGlobalMouseMove, { passive: true });
      window.addEventListener('mouseup', handleGlobalMouseUp);
      window.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });

      return () => {
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
        window.removeEventListener('touchmove', handleGlobalTouchMove);
      };
    }
  }, [isDragging, dragOffset, steps.length]);

  return (
    <div className="relative z-10 bg-black mt-4 sm:-mt-24 md:-mt-28 lg:-mt-32 xl:-mt-36 pt-4 sm:pt-24 md:pt-28 lg:pt-32 xl:pt-36 pb-8 sm:py-28 md:py-32 lg:py-40" style={{ willChange: 'auto' }}>
      {/* Background ambient glow - Reduced blur on mobile */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className={`absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#FFC800]/20 rounded-full ${isMobileDevice ? 'blur-[80px]' : 'blur-[150px]'}`} />
        <div className={`absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-[#FFB000]/15 rounded-full ${isMobileDevice ? 'blur-[80px]' : 'blur-[150px]'}`} />
      </div>

      <div className="w-full relative" style={{ maxWidth: '1280px', margin: '0 auto', paddingLeft: '1rem', paddingRight: '1rem' }}>
        <div className="grid grid-cols-12">
          {/* Title - Centered with gutters */}
          <div className="col-span-12 lg:col-span-12 text-center mb-8 sm:mb-12 md:mb-16">
            <h2
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight px-4 sm:px-0"
              style={{ fontFamily: 'var(--font-cinzel), serif' }}
            >
              <span
                style={{
                  background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%, #FF8C00 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: isMobileDevice ? 'none' : 'drop-shadow(0 0 40px rgba(255, 215, 0, 0.3))',
                }}
              >
                How
              </span>{' '}
              It Works
            </h2>
            <div
              style={{
                width: '220px',
                transformOrigin: 'center',
              }}
              className="h-[2px] mx-auto mb-6 relative"
            >
              <div
                className="h-full w-full"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,200,0,0.4) 15%, rgba(255,180,0,0.9) 40%, rgba(255,165,0,1) 50%, rgba(255,180,0,0.9) 60%, rgba(255,200,0,0.4) 85%, transparent 100%)',
                  boxShadow: '0 0 20px rgba(255, 165, 0, 0.6), 0 0 40px rgba(255, 165, 0, 0.3)',
                }}
              />
            </div>
          </div>

          {/* Container for centered 3-column cards */}
          <div className="col-span-12 lg:col-span-12">
            {/* Mobile: Vertical Stack */}
            <div className="md:hidden relative pb-8 pt-2 space-y-4">
              {steps.map((step, index) => {
                const StepIcon = step.icon;
                const isLast = index === steps.length - 1;

                return (
                  <div key={index} className="relative flex flex-col items-center">
                    {/* Card */}
                    <div
                      className="relative w-full max-w-sm p-8 rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/95 to-black/95 backdrop-blur-2xl overflow-hidden"
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
                      <div className="relative z-10 flex flex-col items-center justify-center text-center">
                        <div className="mb-6">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FFD700]/25 to-[#FFA500]/15 border-2 border-[#FFD700]/40 flex items-center justify-center shadow-[0_0_30px_rgba(255,215,0,0.2)] mx-auto">
                            <StepIcon className="w-8 h-8 text-[#FFD700]" />
                          </div>
                        </div>
                        <div className="mb-6">
                          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-black/50 border-2 border-[#FFD700]/40 shadow-[0_0_20px_rgba(255,215,0,0.2)]">
                            <span
                              className="text-xl font-black"
                              style={{
                                fontFamily: 'var(--font-geist-sans), sans-serif',
                                fontVariantNumeric: 'tabular-nums',
                                color: '#FFD700',
                                lineHeight: '1',
                              }}
                            >
                              {step.number}
                            </span>
                          </div>
                        </div>
                        <h3
                          className="text-xl md:text-2xl font-bold text-white mb-6 leading-tight"
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

                    {/* Arrows removed on mobile */}
                  </div>
                );
              })}
            </div>

            {/* Desktop: Horizontal Layout */}
            <div className="hidden md:flex md:justify-center md:items-stretch md:gap-4 lg:gap-6 xl:gap-8 max-w-6xl mx-auto relative px-2 md:px-4">
              {steps.map((step, index) => {
                const StepIcon = step.icon;

                return (
                <div
                  key={index}
                  className="group relative w-full max-w-[300px] flex flex-col"
                >
                    {/* Premium Card - Clean & Centered with enhanced 3D shadow */}
                    <div
                      className="relative flex-1 flex flex-col p-6 md:p-8 lg:p-10 rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/95 to-black/95 backdrop-blur-2xl overflow-hidden transition-all duration-300 ease-out hover:shadow-[0_0_40px_rgba(255,215,0,0.15)]"
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
                      {/* Subtle glow effect on hover - Disabled on mobile for performance */}
                      {!isMobileDevice && !prefersReducedMotionDevice && (
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-[2rem] overflow-hidden">
                          <div
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full rounded-full blur-3xl"
                            style={{
                              background: 'radial-gradient(circle, rgba(255, 215, 0, 0.15) 0%, rgba(255, 165, 0, 0.08) 50%, transparent 100%)',
                            }}
                          />
                        </div>
                      )}

                      {/* Content - Flex column with fixed number position */}
                      <div className="relative z-10 flex flex-col h-full">
                        {/* Top section: Icon and Number - Fixed height to align across cards */}
                        <div className="flex flex-col items-center mb-4 md:mb-6" style={{ minHeight: '140px' }}>
                          {/* Icon */}
                          <div className="mb-4 md:mb-6">
                            <div className="w-14 h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-[#FFD700]/25 to-[#FFA500]/15 border-2 border-[#FFD700]/40 flex items-center justify-center shadow-[0_0_30px_rgba(255,215,0,0.2)] mx-auto">
                              <StepIcon className="w-7 h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 text-[#FFD700]" />
                            </div>
                          </div>

                          {/* Number Badge - Fixed position */}
                          <div className="flex-shrink-0">
                            <div className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/50 border-2 border-[#FFD700]/40 shadow-[0_0_20px_rgba(255,215,0,0.2)]">
                              <span
                                className="text-xl md:text-2xl font-black"
                                style={{
                                  fontFamily: 'var(--font-geist-sans), sans-serif',
                                  fontVariantNumeric: 'tabular-nums',
                                  color: '#FFD700',
                                  lineHeight: '1',
                                }}
                              >
                                {step.number}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom section: Title and Description - Flexible */}
                        <div className="flex flex-col items-center justify-center text-center flex-1">
                          {/* Title */}
                          <h3
                            className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6 leading-tight"
                            style={{ fontFamily: 'var(--font-cinzel), serif' }}
                          >
                            {step.title}
                          </h3>

                          {/* Description */}
                          <p className="text-sm md:text-base lg:text-lg text-[#d4d4d8] leading-relaxed max-w-sm mx-auto px-2">
                            {step.description}
                          </p>
                        </div>
                      </div>

                      {/* Decorative corner accent */}
                <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-tl from-[#FFD700]/8 to-transparent rounded-tl-[100px] pointer-events-none" />
                <div className="absolute top-0 left-0 w-40 h-40 bg-gradient-to-br from-[#FFA500]/5 to-transparent rounded-br-[100px] pointer-events-none" />
              </div>
                </div>
                );
              })}
            </div>
          </div>

          {/* Call to action */}
          <div
            className="col-span-12 lg:col-span-12 text-center mt-12 sm:mt-20 lg:mt-24"
          >
            <Link href="/performances">
              <button
                className={`group px-10 xs:px-14 sm:px-20 py-6 xs:py-8 sm:py-10 rounded-full text-black text-lg xs:text-xl sm:text-3xl font-bold tracking-wider uppercase transition-transform duration-300 min-h-[60px] sm:min-h-[72px] touch-manipulation ${isMobileDevice || prefersReducedMotionDevice ? '' : 'hover:shadow-[0_0_40px_rgba(255,215,0,0.4)]'}`}
                style={{
                  background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
                  transform: 'scale(1)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                aria-label="Start rating acting performances"
              >
                <span className="flex items-center gap-3 xs:gap-4 sm:gap-5">
                  Start Rating
                  <FaArrowRight className="w-5 h-5 xs:w-6 xs:h-6 sm:w-7 sm:h-7 transition-transform duration-300 group-hover:translate-x-2" aria-hidden="true" />
                </span>
            </button>
          </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Performance highlights data
const PERFORMANCE_HIGHLIGHTS = [
  {
    actor: "Cillian Murphy",
    movie: "Oppenheimer",
    quote: "A haunting portrayal of genius and consequence",
    year: "2023",
  },
  {
    actor: "Heath Ledger",
    movie: "The Dark Knight",
    quote: "An iconic transformation that redefined villainy",
    year: "2008",
  },
  {
    actor: "Joaquin Phoenix",
    movie: "Joker",
    quote: "Raw intensity and psychological depth",
    year: "2019",
  },
  {
    actor: "Margot Robbie",
    movie: "Barbie",
    quote: "Effortless charm meets existential depth",
    year: "2023",
  },
  {
    actor: "Cate Blanchett",
    movie: "TÁR",
    quote: "A masterclass in power and vulnerability",
    year: "2022",
  }
];

// Performance Section with active card tracking and depth effect
function PerformanceSection() {
  const [activeCard, setActiveCard] = useState(0);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [prefersReducedMotionDevice, setPrefersReducedMotionDevice] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobileDevice(window.innerWidth < 768);
      setPrefersReducedMotionDevice(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setPrefersReducedMotionDevice(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => {
      window.removeEventListener('resize', checkDevice);
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);
  const [isDesktop, setIsDesktop] = useState(false);
  const [performancesData, setPerformancesData] = useState<Map<string, any>>(new Map());
  const [isLoadingRatings, setIsLoadingRatings] = useState(true);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Fetch ratings for the highlights
  useEffect(() => {
    const fetchRatings = async () => {
      try {
        const targets = PERFORMANCE_HIGHLIGHTS.map(h => ({
          actor: h.actor,
          movie: h.movie
        }));

        const response = await fetch('/api/performances/by-lookup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ targets }),
        });

        if (!response.ok) {
          console.error('Failed to fetch ratings');
          setIsLoadingRatings(false);
          return;
        }

        const data = await response.json();
        const newPerformancesData = new Map<string, any>();

        if (data.performances && Array.isArray(data.performances)) {
          data.performances.forEach((perf: any) => {
            if (perf.actor && perf.movie) {
              const key = `${perf.actor.name}:${perf.movie.title}`;
              newPerformancesData.set(key, perf);
            }
          });
        }

        setPerformancesData(newPerformancesData);
      } catch (error) {
        console.error('Error fetching ratings:', error);
      } finally {
        setIsLoadingRatings(false);
      }
    };

    fetchRatings();
  }, []);

  // Track active card and apply depth effect (desktop only)
  useEffect(() => {
    const container = document.querySelector('.performance-scroll-container');
    if (!container) return;

    let rafId: number | null = null;
    let ticking = false;

    const updateCardDepth = () => {
      // Only apply depth effect on desktop
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);

      // On mobile, use simpler calculation for active card only
      if (!desktop) {
        const containerRect = container.getBoundingClientRect();
        const containerCenter = containerRect.left + containerRect.width / 2;

        let closestIndex = 0;
        let closestDistance = Infinity;

        // Only check visible cards on mobile for better performance
        cardRefs.current.forEach((card, index) => {
          if (!card) return;

          const cardRect = card.getBoundingClientRect();
          const cardCenter = cardRect.left + cardRect.width / 2;
          const distance = Math.abs(containerCenter - cardCenter);

          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
          }
        });

        setActiveCard(closestIndex);
        ticking = false;
        return;
      }

      // Desktop: full depth effect calculation
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

        // Calculate depth effect based on distance from center
        const maxDistance = containerRect.width / 2;
        const normalizedDistance = Math.min(distance / maxDistance, 1);
        const scale = 1 - (normalizedDistance * 0.08); // Scale from 1 to 0.92
        const opacity = 1 - (normalizedDistance * 0.4); // Opacity from 1 to 0.6
        const translateY = normalizedDistance * 10; // Move down by up to 10px

        card.style.transform = `scale(${scale}) translateY(${translateY}px)`;
        card.style.opacity = `${opacity}`;
      });

      setActiveCard(closestIndex);
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        rafId = requestAnimationFrame(() => {
          updateCardDepth();
        });
        ticking = true;
      }
    };

    const handleResize = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        updateCardDepth();
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    // On initial load, apply depth effect immediately
    const desktop = window.innerWidth >= 1024;
    setIsDesktop(desktop);

    // Ensure first card is active initially
    setActiveCard(0);

    // Apply initial depth effect - wait for next frame to ensure DOM is ready
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        updateCardDepth();
      });
    });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [PERFORMANCE_HIGHLIGHTS.length]);

  // AUTO-SCROLL DISABLED - User requested no auto-scroll on mobile
  // useEffect(() => {
  //   // Only run on mobile (screen width < 1024px)
  //   if (typeof window === 'undefined' || window.innerWidth >= 1024) return;
  //   ...
  // }, [PERFORMANCE_HIGHLIGHTS.length]);

  return (
    <div className="performance-section-container relative z-10 bg-black py-20 sm:py-28 md:py-32 lg:py-40 overflow-visible">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-[#0a0a0a] to-black" />

      <div className="w-full relative overflow-visible" style={{ maxWidth: '1280px', margin: '0 auto', paddingLeft: '1rem', paddingRight: '1rem' }}>
        <div className="grid grid-cols-12">
          {/* Title with gutters */}
          <div
            className="col-span-12 lg:col-span-12 text-center mb-8 sm:mb-12 md:mb-16"
          >
            <h2
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight px-4 sm:px-0"
              style={{ fontFamily: 'var(--font-cinzel), serif' }}
            >
              <span
                style={{
                  background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%, #FF8C00 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: isMobileDevice ? 'none' : 'drop-shadow(0 0 40px rgba(255, 215, 0, 0.3))',
                }}
              >
                Start
              </span>{' '}
              With These
            </h2>
            <div
              style={{
                width: '220px',
                transformOrigin: 'center',
              }}
              className="h-[2px] mx-auto mb-6 relative"
            >
              <div
                className="h-full w-full"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,200,0,0.4) 15%, rgba(255,180,0,0.9) 40%, rgba(255,165,0,1) 50%, rgba(255,180,0,0.9) 60%, rgba(255,200,0,0.4) 85%, transparent 100%)',
                  boxShadow: '0 0 20px rgba(255, 165, 0, 0.6), 0 0 40px rgba(255, 165, 0, 0.3)',
                }}
              />
            </div>
          </div>

          {/* Quote Cards - Carousel with fade edges */}
          <div className="col-span-12 overflow-visible">
            <div className="relative -mx-4 sm:-mx-0">
              <div
                className="overflow-hidden"
                style={isDesktop ? {
                  maskImage: 'linear-gradient(to right, transparent 0%, black 80px, black calc(100% - 80px), transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 80px, black calc(100% - 80px), transparent 100%)',
                } : {}}
              >
                <div className="performance-scroll-container flex gap-8 overflow-x-auto pb-8 pt-4 snap-x snap-mandatory scrollbar-hide pl-4 pr-4 sm:pl-0 sm:pr-0 lg:px-[20vw] xl:px-[25vw]" style={{ contain: 'layout style paint', scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}>
                  {PERFORMANCE_HIGHLIGHTS.map((highlight, index) => (
                  <div
                    key={index}
                    ref={(el) => { cardRefs.current[index] = el }}
                    className="group relative flex-shrink-0 w-[85vw] sm:w-[75vw] lg:w-[38vw] xl:w-[32vw] max-w-md snap-center lg:cursor-pointer performance-card-mobile"
                    style={{
                      paddingLeft: index === 0 && !isDesktop ? '1rem' : '0',
                      paddingRight: index === PERFORMANCE_HIGHLIGHTS.length - 1 && !isDesktop ? '1rem' : '0',
                      /* Hardware acceleration for smooth scrolling */
                      transform: 'translateZ(0)',
                      WebkitTransform: 'translateZ(0)',
                      contain: 'layout style paint',
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
                        className={`relative h-full p-8 sm:p-10 md:p-12 rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 overflow-hidden ${isDesktop ? 'backdrop-blur-2xl transition-transform duration-300' : ''} ${isDesktop && !prefersReducedMotionDevice ? 'hover:shadow-[0_0_40px_rgba(255,215,0,0.12)]' : ''}`}
                        style={{
                          boxShadow: isDesktop ? `
                    0 25px 70px -15px rgba(0, 0, 0, 0.9),
                    0 15px 40px -10px rgba(0, 0, 0, 0.7),
                    0 0 0 1px rgba(255, 255, 255, 0.05),
                    inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                  ` : `
                    0 10px 30px -5px rgba(0, 0, 0, 0.8),
                    0 0 0 1px rgba(255, 255, 255, 0.05)
                  `,
                          backdropFilter: isDesktop ? 'blur(24px)' : 'none',
                          WebkitBackdropFilter: isDesktop ? 'blur(24px)' : 'none',
                        }}
                      >
                        {/* Glow effect - Disabled on mobile for performance */}
                        {!isMobileDevice && !prefersReducedMotionDevice && (
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem] overflow-hidden pointer-events-none">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/10 rounded-full blur-3xl" />
                          </div>
                        )}

                        {/* Content */}
                        <div className="relative z-10 flex flex-col h-full">
                          <div className="flex-1">
                            {/* Rating Badge */}
                            <div className="flex items-center justify-between mb-6">
                              <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/15 border border-[#FFD700]/40">
                                <FaStar className="w-5 h-5 text-[#FFD700]" />
                                <span
                                  className="text-2xl font-bold text-[#FFD700]"
                                  style={{
                                    fontFamily: 'var(--font-geist-sans), sans-serif',
                                    fontVariantNumeric: 'tabular-nums',
                                  }}
                                >
                                  {(() => {
                                    const key = `${highlight.actor}:${highlight.movie}`;
                                    const perfData = performancesData.get(key);
                                    if (perfData && perfData.averageRating > 0 && perfData.ratingCount > 0) {
                                      // Convert from 0-100 scale to 0-10 scale (ratings are stored as 0-100)
                                      return (perfData.averageRating / 10).toFixed(1);
                                    }
                                    return "N/A";
                                  })()}
                                </span>
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
                            <div className="mb-6">
                              <span className="text-lg text-[#FFD700] font-semibold tracking-wide">
                                {highlight.movie}
                              </span>
                            </div>
                          </div>

                          {/* Rate Button - Always at bottom */}
                          <div className="mt-auto pt-4">
                            {(() => {
                              const key = `${highlight.actor}:${highlight.movie}`;
                              const perfData = performancesData.get(key);

                              let href = `/performances`; // default fallback

                              if (perfData && perfData.actor && perfData.movie) {
                                // Build rate URL with actor and movie data
                                const actorSlug = perfData.actor.slug || perfData.actorId;
                                const movieSlug = perfData.movie.slug || perfData.movieId;
                                href = `/rate/${movieSlug}/${actorSlug}`;
                              }

                              return (
                                <Link href={href}>
                                  <button
                                    className="w-full px-8 py-4 rounded-full text-black text-base font-bold tracking-wider uppercase transition-all duration-200 hover:scale-105 min-h-[48px] cursor-pointer"
                                    style={{
                                      background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
                                    }}
                                    aria-label="Rate this performance"
                                  >
                                    <span className="flex items-center justify-center gap-2">
                                      Rate
                                      <FaStar className="w-4 h-4" aria-hidden="true" />
                                    </span>
                                  </button>
                                </Link>
                              );
                            })()}
                          </div>
                        </div>

                {/* Decorative accent */}
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[#FFD700]/5 to-transparent rounded-tr-[80px]" />
              </div>
                  </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Dots */}
          <div className="col-span-12 flex flex-col items-center mt-8 px-4">
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
                {PERFORMANCE_HIGHLIGHTS.map((_, index) => (
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
                      width: index === activeCard ? '20px' : '8px',
                      height: '8px',
                      minWidth: '8px',
                      minHeight: '8px',
                      padding: '8px',
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
                    aria-label={`Go to performance card ${index + 1} of ${PERFORMANCE_HIGHLIGHTS.length}`}
                  />
                ))}
              </div>
            </div>

            {/* Additional performances text */}
            <div className="text-center mt-6 w-full">
              <p className="text-sm sm:text-base text-[#a3a3a3] font-light tracking-wide">
                <a 
                  href="/performances" 
                  className="text-[#FFD700] hover:text-[#FFE55C] transition-colors duration-200 underline decoration-[#FFD700]/30 hover:decoration-[#FFE55C]/50"
                >
                  Explore 25,000+ performances
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Features Section - Clean Vertical Stack (No Carousel)
function FeaturesSection() {
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [prefersReducedMotionDevice, setPrefersReducedMotionDevice] = useState(false);
  const [expandedFeatures, setExpandedFeatures] = useState<Set<number>>(new Set());

  useEffect(() => {
    const checkDevice = () => {
      setIsMobileDevice(window.innerWidth < 768);
      setPrefersReducedMotionDevice(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setPrefersReducedMotionDevice(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => {
      window.removeEventListener('resize', checkDevice);
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

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
    <div className="relative z-10 bg-black py-20 sm:py-28 md:py-32 lg:py-40">
      {/* Background glow */}
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-[700px] h-[700px] bg-[#FFC800]/20 rounded-full blur-[160px]" />
      </div>

      <div className="w-full relative" style={{ maxWidth: '1280px', margin: '0 auto', paddingLeft: '1rem', paddingRight: '1rem' }}>
        <div className="grid grid-cols-12">
          {/* Title */}
          <div
            className="col-span-12 lg:col-span-12 text-center mb-16 sm:mb-24 lg:mb-32"
          >
            <h2
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-8 tracking-tight px-4 sm:px-0"
              style={{ fontFamily: 'var(--font-cinzel), serif' }}
            >
              <span
                style={{
                  background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%, #FF8C00 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: isMobileDevice ? 'none' : 'drop-shadow(0 0 40px rgba(255, 215, 0, 0.3))',
                }}
              >
                Why
              </span>{' '}
              ActorRating
            </h2>
            <div
              style={{ width: '200px' }}
              className="h-[2px] mx-auto relative"
            >
              <div
                className="h-full w-full"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,200,0,0.4) 15%, rgba(255,180,0,0.9) 40%, rgba(255,165,0,1) 50%, rgba(255,180,0,0.9) 60%, rgba(255,200,0,0.4) 85%, transparent 100%)',
                  boxShadow: '0 0 20px rgba(255, 165, 0, 0.6), 0 0 40px rgba(255, 165, 0, 0.3)',
                }}
              />
            </div>
          </div>

          {/* Features - Mobile: Clean Simplified Cards, Desktop: Vertical Stack */}

          {/* Mobile: Simplified Feature Cards */}
          <div className="col-span-12 md:hidden space-y-8">
            {features.map((feature, index) => (
              <div
                key={index}
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
                    {expandedFeatures.has(index) ? feature.descriptionFull : feature.description}
                  </p>
                  {!expandedFeatures.has(index) && (
                    <button
                      onClick={() => setExpandedFeatures(prev => new Set(prev).add(index))}
                      className="mt-2 text-xs text-[#FFD700] hover:text-[#FFE55C] transition-colors duration-200"
                    >
                      Read more
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: Individual Cards */}
          {features.map((feature, index) => (
            <div
              key={index}
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
                      {expandedFeatures.has(index) ? feature.descriptionFull : feature.description}
                    </p>
                    {!expandedFeatures.has(index) && (
                      <button
                        onClick={() => setExpandedFeatures(prev => new Set(prev).add(index))}
                        className="mt-3 text-sm text-[#FFD700] hover:text-[#FFE55C] transition-colors duration-200"
                      >
                        Read more
                      </button>
                    )}
                  </div>
                </div>

                {/* Decorative accent */}
                <div className="absolute bottom-0 right-0 w-48 h-48 bg-gradient-to-tl from-[#FFD700]/5 to-transparent rounded-tl-[120px]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// About Section - Visual & Minimal
function AboutSection() {
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [prefersReducedMotionDevice, setPrefersReducedMotionDevice] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobileDevice(window.innerWidth < 768);
      setPrefersReducedMotionDevice(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setPrefersReducedMotionDevice(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => {
      window.removeEventListener('resize', checkDevice);
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  const stats = [
    { value: "25K+", label: "Performances" },
    { value: "5", label: "Rating Criteria" },
    { value: "Live", label: "Growing Daily", isLive: true }
  ];

  return (
    <div className="relative z-10 bg-black py-20 sm:py-28 md:py-32 lg:py-40">
      {/* Background glow */}
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FFC800]/15 rounded-full blur-[180px]" />
      </div>

      <div className="w-full text-center relative" style={{ maxWidth: '1280px', margin: '0 auto', paddingLeft: '1rem', paddingRight: '1rem' }}>
        <div className="grid grid-cols-12">
          {/* Title with gutters */}
          <div
            className="col-span-12 lg:col-span-12 mb-12 sm:mb-16"
          >
            <h2
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-10 tracking-tight px-4 sm:px-0"
              style={{ fontFamily: 'var(--font-cinzel), serif' }}
            >
              <span
                style={{
                  background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%, #FF8C00 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: isMobileDevice ? 'none' : 'drop-shadow(0 0 40px rgba(255, 215, 0, 0.3))',
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
            Be part of the early community shaping the platform.
          </p>
          </div>

          {/* Container for centered 3-column stat cards */}
          <div className="col-span-12 lg:col-span-12">
            {/* Mobile: Individual Cards Stack */}
            <div className="md:hidden space-y-6">
              {stats.map((stat, index) => (
                <div
                  key={index}
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
                </div>
              ))}
            </div>

            {/* Desktop: Grid */}
            <div className="hidden md:grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Stat Card 1 */}
              <div
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
              </div>

              {/* Stat Card 2 */}
              <div
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
              </div>

              {/* Stat Card 3 */}
              <div
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
              </div>
            </div>
          </div>

          {/* Tagline - REMOVE DUPLICATE */}
          <div className="col-span-12 lg:col-span-12 mt-16 sm:mt-20 lg:mt-24">
            <Link href="/about" aria-label="Learn more about ActorRating">
              <button
                className="group px-10 xs:px-14 sm:px-20 py-6 xs:py-8 sm:py-10 rounded-full text-black text-lg xs:text-xl sm:text-3xl font-bold tracking-wider uppercase transition-all duration-400 hover:shadow-[0_0_40px_rgba(255,215,0,0.4)] min-h-[60px] sm:min-h-[72px] touch-manipulation"
                style={{
                  background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
                  transform: 'scale(1)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                aria-label="Learn more about ActorRating"
              >
                <span className="flex items-center gap-3 xs:gap-4 sm:gap-5">
                  Learn More
                  <FaArrowRight className="w-5 h-5 xs:w-6 xs:h-6 sm:w-7 sm:h-7 transition-transform duration-300 group-hover:translate-x-2" aria-hidden="true" />
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
  // Runtime detection for mobile and reduced motion
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [prefersReducedMotionDevice, setPrefersReducedMotionDevice] = useState(false);

  // Fix scroll to top on mount
  useEffect(() => {
    // Ensure page starts at top
    if (typeof window !== 'undefined' && window.scrollY > 0) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    // Detect mobile and reduced motion at runtime
    const checkDevice = () => {
      setIsMobileDevice(window.innerWidth < 768);
      setPrefersReducedMotionDevice(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setPrefersReducedMotionDevice(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      window.removeEventListener('resize', checkDevice);
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return (
    <>
      <div className="hero min-h-[85vh] relative flex items-start justify-center bg-black w-full overflow-visible" style={{ willChange: 'auto', maxWidth: '100vw' }}>
        {/* Spotlight effect - Static on mobile, minimal animation on desktop */}
        <motion.div
          initial={prefersReducedMotionDevice || isMobileDevice ? { opacity: 0.15 } : { opacity: 0, scale: 0.95 }}
          animate={prefersReducedMotionDevice || isMobileDevice ? { opacity: 0.15 } : { opacity: 0.15, scale: 1 }}
          transition={prefersReducedMotionDevice || isMobileDevice ? { duration: 0 } : { duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[1100px] rounded-full blur-[140px] z-[1] pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255, 200, 0, 0.28) 0%, rgba(255, 180, 0, 0.18) 35%, rgba(255, 160, 0, 0.08) 55%, transparent 75%)',
            maxWidth: '100vw',
            maxHeight: '100dvh',
            willChange: prefersReducedMotionDevice || isMobileDevice ? 'auto' : 'transform, opacity'
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
              {/* Main Headline - MASSIVE & Centered - LCP Element: Render immediately visible */}
              <motion.div
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="mb-6 xs:mb-8 sm:mb-10 md:mb-12 lg:mb-14 w-full flex justify-center"
                style={{ opacity: 1, transform: 'translateY(0)' }}
              >
                <h1
                  className="hero-tagline hero-text-fade-in text-[3rem] xs:text-[3.5rem] sm:text-[3.75rem] md:text-[4.75rem] lg:text-[5.75rem] xl:text-[6.5rem] text-white mb-0 font-extrabold text-center lg:whitespace-nowrap px-4 mx-auto"
                  style={{
                    fontFamily: 'var(--font-cinzel), serif',
                    textShadow: '0 10px 40px rgba(0,0,0,0.7)',
                    letterSpacing: '0.08em',
                    lineHeight: '1.1',
                    maxWidth: '100%',
                    display: 'inline-block'
                  }}
                >
                  <span className="sr-only">Rate The CRAFT</span>
                  <span className="inline sm:hidden" style={{ wordSpacing: '0.08em' }} aria-hidden="true">Rate The </span>
                  <span className="hidden sm:inline" style={{ wordSpacing: '0.02em' }} aria-hidden="true">Rate The </span>
                  <span
                    className="inline sm:hidden craft-glow-animation"
                    style={{
                      background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%, #FF8C00 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      filter: isMobileDevice ? 'none' : 'drop-shadow(0 0 40px rgba(255, 215, 0, 0.3))',
                      wordSpacing: '0.08em',
                    }}
                    aria-hidden="true"
                  >
                    CRAFT
                  </span>
                  <span
                    className="hidden sm:inline craft-glow-animation"
                    style={{
                      background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%, #FF8C00 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      filter: isMobileDevice ? 'none' : 'drop-shadow(0 0 40px rgba(255, 215, 0, 0.3))',
                      wordSpacing: '0.02em',
                    }}
                    aria-hidden="true"
                  >
                    CRAFT
                  </span>
                </h1>
              </motion.div>

              {/* Gold Divider - GPU-safe animation (scaleX instead of width) */}
              <motion.div
                initial={prefersReducedMotionDevice || isMobileDevice ? { opacity: 1, scaleX: 1 } : { opacity: 0, scaleX: 0 }}
                animate={prefersReducedMotionDevice || isMobileDevice ? { opacity: 1, scaleX: 1 } : { opacity: 1, scaleX: 1 }}
                transition={prefersReducedMotionDevice || isMobileDevice ? { duration: 0 } : { duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="h-[2px] mx-auto mb-6 xs:mb-8 sm:mb-10 md:mb-12 lg:mb-14 relative"
                style={{
                  width: '180px',
                  transformOrigin: 'center',
                  willChange: prefersReducedMotionDevice || isMobileDevice ? 'auto' : 'transform, opacity'
                }}
              >
                <div
                  className="h-full w-full"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,229,92,0.4) 15%, rgba(255,215,0,0.9) 40%, rgba(255,215,0,1) 50%, rgba(255,215,0,0.9) 60%, rgba(255,229,92,0.4) 85%, transparent 100%)',
                    boxShadow: '0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.3)',
                  }}
                />
              </motion.div>

              {/* Subtitle - Clear & Compelling - LCP Element: Render immediately visible */}
              <motion.p
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl w-full max-w-4xl leading-relaxed text-[#d4d4d4] mb-4 xs:mb-5 sm:mb-6 md:mb-8 lg:mb-10 font-light text-center px-4 sm:px-6"
                style={{
                  letterSpacing: '0.005em',
                  opacity: 1,
              transform: 'translateY(0)'
            }}
          >
            A community for movie lovers to rate, compare, and discover the greatest acting performances
          </motion.p>

              {/* CTA Button - Convert with Elegance */}
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="w-full flex justify-center mt-8 sm:mt-0"
              >
                <Link href="/performances" className="inline-block relative" aria-label="Start rating acting performances now">
                  <button className="group px-8 xs:px-10 sm:px-20 py-5 xs:py-6 sm:py-10 rounded-full text-black text-lg xs:text-xl sm:text-3xl font-bold tracking-wider uppercase transition-all duration-400 hover:shadow-[0_0_40px_rgba(255,215,0,0.4)] min-h-[56px] min-w-[56px] xs:min-h-[60px] sm:min-h-[72px] relative overflow-hidden touch-manipulation"
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
                    aria-label="Start rating acting performances now"
                  >
                    {/* White light sweep effect */}
                    <span
                      className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none"
                      style={{
                        background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
                        width: '100%',
                        height: '100%',
                      }}
                      aria-hidden="true"
                    />
                    <span className="flex items-center justify-center gap-3 xs:gap-4 sm:gap-5 whitespace-nowrap relative z-10">
                      Start Rating Now
                      <FaArrowRight className="w-5 h-5 xs:w-6 xs:h-6 sm:w-7 sm:h-7 transition-transform duration-300 group-hover:translate-x-2" aria-hidden="true" />
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

      {/* Video Section - Below How It Works Cards - TEMPORARILY HIDDEN */}
      {false && (
        <div className="relative w-full bg-black py-8 sm:py-16 md:py-24 lg:py-32 overflow-hidden">
          {/* Full-width on mobile, constrained on desktop */}
          <div className="w-full relative" style={{
            maxWidth: isMobileDevice ? '100%' : '1280px',
            margin: '0 auto',
            paddingLeft: isMobileDevice ? '0' : '1rem',
            paddingRight: isMobileDevice ? '0' : '1rem',
          }}>
            <div
              className="relative w-full overflow-hidden"
              style={{
                aspectRatio: '16/9',
                minHeight: '200px',
                borderRadius: isMobileDevice ? '0' : '1rem',
              }}
            >
              <video
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                className="absolute inset-0 w-full h-full"
                style={{
                  opacity: prefersReducedMotionDevice ? 0 : 1,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
                onLoadedMetadata={(e) => {
                  // Force high quality playback
                  const video = e.currentTarget;
                  if (video) {
                    video.playbackRate = 1.0;
                    // Ensure video quality is not reduced
                    if ('webkitDecodedFrameCount' in video) {
                      // Safari-specific quality hint
                      (video as any).webkitDecodedFrameCount;
                    }
                  }
                }}
              >
                <source src="/hero-video.mp4" type="video/mp4" />
                {/* Fallback for browsers that don't support video */}
                Your browser does not support the video tag.
              </video>
              {/* Fallback if video doesn't load or reduced motion */}
              {prefersReducedMotionDevice && (
                <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-black flex items-center justify-center">
                  <p className="text-white/50 text-sm">Video content</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Performance Highlights Section */}
      <PerformanceSection />

      {/* Features Section */}
      <FeaturesSection />

      {/* About Section */}
      <AboutSection />
    </>
  );
}
