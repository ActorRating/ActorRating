"use client"

import Link from 'next/link'
import { useUser } from '@supabase/auth-helpers-react'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '../ui/Button'
import { usePathname } from 'next/navigation'
import { Logo } from '../ui/Logo'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { User, Settings, LogOut, Home, Search } from 'lucide-react'

export function SignedInNavbar() {
  const user = useUser()
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const [menuTop, setMenuTop] = useState<number>(0)
  const [menuRight, setMenuRight] = useState<number>(0)
  const portalMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const targetNode = event.target as Node
      const clickedInsideTrigger = !!menuRef.current && menuRef.current.contains(targetNode)
      const clickedInsidePortalMenu = !!portalMenuRef.current && portalMenuRef.current.contains(targetNode)
      if (clickedInsideTrigger || clickedInsidePortalMenu) return
      setIsMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!isMenuOpen || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const verticalOffset = 8
    const menuWidth = 176 // w-44
    setMenuTop(rect.bottom + verticalOffset)
    setMenuRight(Math.max(8, window.innerWidth - rect.right))

    const handleResize = () => {
      const r = triggerRef.current!.getBoundingClientRect()
      setMenuTop(r.bottom + verticalOffset)
      setMenuRight(Math.max(8, window.innerWidth - r.right))
    }
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleResize, true)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleResize, true)
    }
  }, [isMenuOpen])

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <nav className="bg-secondary/70 border-b border-border sticky top-0 z-50 isolate" suppressHydrationWarning>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Logo />
            </div>
            <div className="flex items-center space-x-3">
              <Button disabled size="sm" noMotion>
                Loading...
              </Button>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  if (!user) {
    return null
  }

  return (
    <nav className="bg-secondary/70 border-b border-border sticky top-0 z-50 isolate text-foreground" suppressHydrationWarning>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Logo href="/dashboard" />
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <Button 
                noMotion
                variant={pathname === "/dashboard" ? "default" : "ghost"} 
                size="sm"
                aria-label="Home"
              >
                <Home className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/search">
              <Button 
                noMotion
                variant={pathname === "/search" ? "default" : "ghost"} 
                size="sm"
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </Button>
            </Link>

            {/* Profile dropdown */}
            <div className="relative" ref={menuRef}>
              <Button
                noMotion
                variant={pathname === "/profile" ? "default" : "ghost"}
                size="sm"
                className="rounded-full px-3"
                onClick={() => setIsMenuOpen((v) => !v)}
              >
                <span className="flex items-center gap-2" ref={triggerRef}>
                  <User className="w-4 h-4" />
                  <span className="text-sm">Profile</span>
                </span>
              </Button>

              {isMenuOpen && typeof window !== 'undefined' && createPortal(
                <div
                  ref={portalMenuRef}
                  className="fixed w-44 rounded-lg border border-border bg-secondary shadow-lg z-[100]"
                  style={{ top: menuTop, right: menuRight }}
                >
                  <div className="py-1">
                    <Link
                      href="/profile"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false)
                        supabase.auth.signOut({ callbackUrl: '/' })
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                    >
                      <LogOut className="w-4 h-4" />
                      Log out
                    </button>
                  </div>
                </div>,
                document.body
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
} 