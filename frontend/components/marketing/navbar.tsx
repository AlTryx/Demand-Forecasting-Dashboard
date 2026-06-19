"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { BarChart3, Menu, X } from "lucide-react"

import { useAuth } from "@/lib/auth/auth-context"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type NavLink = { id: string; href: string; label: string }

const NAV_LINKS: NavLink[] = [
  { id: "home", href: "/", label: "Home" },
  { id: "features", href: "#features", label: "Features" },
  { id: "about", href: "#about", label: "About" },
  { id: "contact", href: "#contact", label: "Contact" },
]

const SECTION_IDS = NAV_LINKS.filter((l) => l.href.startsWith("#")).map(
  (l) => l.id,
)

function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href="/"
      onClick={onClick}
      className="flex shrink-0 items-center gap-2 text-base font-bold tracking-tight text-foreground"
    >
      <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <BarChart3 className="size-4" aria-hidden="true" />
      </span>
      <span className="text-pretty">
        Demand Forecasting <span className="text-primary">Dashboard</span>
      </span>
    </Link>
  )
}

export function Navbar() {
  const { isAuthenticated } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [active, setActive] = useState("home")

  // Smoothly scroll to an in-page anchor (or the top for "Home").
  const handleAnchor = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, link: NavLink) => {
      // Only intercept in-page navigation on the marketing page.
      if (link.href === "/") {
        if (window.location.pathname === "/") {
          event.preventDefault()
          window.scrollTo({ top: 0, behavior: "smooth" })
        }
        setIsOpen(false)
        return
      }
      const target = document.getElementById(link.id)
      if (target) {
        event.preventDefault()
        target.scrollIntoView({ behavior: "smooth", block: "start" })
        setActive(link.id)
      }
      setIsOpen(false)
    },
    [],
  )

  // Track which section is currently in view to highlight the active link.
  useEffect(() => {
    const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null,
    )
    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActive(visible.target.id)
        else if (window.scrollY < 200) setActive("home")
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] },
    )
    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [])

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <Brand onClick={() => setIsOpen(false)} />

        {/* Centered links (desktop) */}
        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 text-sm font-medium md:flex">
          {NAV_LINKS.map((link) => {
            const isActive = active === link.id
            return (
              <Link
                key={link.id}
                href={link.href}
                onClick={(e) => handleAnchor(e, link)}
                className={cn(
                  "relative rounded-md px-3 py-2 transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary",
                )}
              >
                {link.label}
                {isActive && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            )
          })}
        </div>

        {/* Right actions (desktop) */}
        <div className="hidden items-center gap-2 md:flex">
          {!isAuthenticated ? (
            <>
              <Button render={<Link href="/signin" />} variant="ghost" size="sm">
                Login
              </Button>
              <Button render={<Link href="/signup" />} size="sm">
                Sign up
              </Button>
            </>
          ) : (
            <Button render={<Link href="/dashboard" />} size="sm">
              Dashboard
            </Button>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center justify-center rounded-md p-2 text-foreground md:hidden"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
        >
          {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border/70 bg-background md:hidden"
          >
            <div className="flex flex-col gap-1 px-4 py-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.id}
                  href={link.href}
                  onClick={(e) => handleAnchor(e, link)}
                  className={cn(
                    "rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-secondary hover:text-primary",
                    active === link.id ? "text-primary" : "text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-2 flex flex-col gap-2 border-t border-border/70 pt-3">
                {!isAuthenticated ? (
                  <>
                    <Button
                      render={<Link href="/signin" />}
                      variant="outline"
                      onClick={() => setIsOpen(false)}
                    >
                      Login
                    </Button>
                    <Button
                      render={<Link href="/signup" />}
                      onClick={() => setIsOpen(false)}
                    >
                      Sign up
                    </Button>
                  </>
                ) : (
                  <Button
                    render={<Link href="/dashboard" />}
                    onClick={() => setIsOpen(false)}
                  >
                    Dashboard
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
