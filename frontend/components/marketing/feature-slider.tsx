"use client"

import Image from "next/image"
import React, { useState, useEffect, useCallback, type ElementType } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronLeft, ChevronRight, LineChart, PieChart, ShieldCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Reveal } from "./reveal"

interface Feature {
  title: string
  description: string
  icon: ElementType<{ className?: string }>
  path: string
  image: { src: string; alt: string }
}

const FEATURES: Feature[] = [
  {
    title: "Executive overview",
    description:
      "Stockout risk, capital requirements, and ensemble accuracy surfaced in one glance.",
    icon: ShieldCheck,
    path: "/dashboard/overview",
    image: {
      src: "/images/dashboard-overview.png",
      alt: "Demand forecasting dashboard executive overview with KPI cards",
    },
  },
  {
    title: "Predictive timelines",
    description:
      "Blend historical sales with model forecasts and confidence bands across a 30-day horizon.",
    icon: LineChart,
    path: "/dashboard/timeline",
    image: {
      src: "/images/dashboard-timeline.png",
      alt: "Predictive sales timeline chart with forecast and confidence interval",
    },
  },
  {
    title: "Demand analytics",
    description:
      "Break down demand share, volatility, and the live forecast log per SKU.",
    icon: PieChart,
    path: "/dashboard/analytics",
    image: {
      src: "/images/dashboard-analytics.png",
      alt: "Demand share and volatility analytics with recent forecast log",
    },
  },
]

const AUTO_INTERVAL = 5000

const textVariants = {
  enter: (dir: number) => ({ x: dir * 48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: -dir * 48, opacity: 0 }),
}

export function FeatureSlider() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const count = FEATURES.length
  const active = FEATURES[activeIndex]

  const navigate = useCallback((index: number, dir: number) => {
    setDirection(dir)
    setActiveIndex(index)
  }, [])

  const goNext = useCallback(() => {
    navigate((activeIndex + 1) % count, 1)
  }, [activeIndex, count, navigate])

  const goPrev = useCallback(() => {
    navigate((activeIndex - 1 + count) % count, -1)
  }, [activeIndex, count, navigate])

  // Auto-advance — restarts on every navigation (manual or timer)
  useEffect(() => {
    const id = setTimeout(goNext, AUTO_INTERVAL)
    return () => clearTimeout(id)
  }, [goNext])

  return (
    <section id="features" className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4">
        <Reveal className="mb-14 flex flex-col items-center gap-4 text-center">
          <h2 className="max-w-2xl text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Everything you need to forecast with confidence
          </h2>
          <p className="max-w-xl text-pretty text-muted-foreground">
            A single workspace that turns raw sales history into decisions your
            team can act on.
          </p>
        </Reveal>

        {/* Browser frame + side arrows */}
        <Reveal delay={0.1} className="relative mx-auto max-w-5xl">
          {/* Left arrow */}
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous feature"
            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 flex size-9 items-center justify-center rounded-full border border-border bg-background/90 shadow-md backdrop-blur-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ChevronLeft className="size-4" />
          </button>

          {/* Right arrow */}
          <button
            type="button"
            onClick={goNext}
            aria-label="Next feature"
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 flex size-9 items-center justify-center rounded-full border border-border bg-background/90 shadow-md backdrop-blur-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ChevronRight className="size-4" />
          </button>

          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-primary/10">
            {/* Chrome bar */}
            <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-4 py-3">
              <span className="flex gap-1.5" aria-hidden="true">
                <span className="size-3 rounded-full bg-destructive/60" />
                <span className="size-3 rounded-full bg-chart-3/70" />
                <span className="size-3 rounded-full bg-accent/70" />
              </span>
              <div className="ml-3 flex min-w-0 flex-1 items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={active.path}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.2 }}
                    className="truncate rounded-md bg-background px-3 py-1 font-mono text-xs text-muted-foreground"
                  >
                    app.demandforecasting.ai{active.path}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>

            {/* Screenshot */}
            <div className="relative aspect-[1440/900] w-full bg-background">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active.image.src}
                  initial={{ opacity: 0, scale: 1.02 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.99 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="absolute inset-0"
                >
                  <Image
                    src={active.image.src || "/placeholder.svg"}
                    alt={active.image.alt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 1024px"
                    className="object-contain object-top"
                    priority={activeIndex === 0}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </Reveal>

        {/* Animated feature text + progress dots */}
        <Reveal delay={0.15} className="mx-auto mt-10 max-w-3xl">
          {/* Text panel — fixed height prevents layout shift */}
          <div className="relative flex min-h-[130px] items-center justify-center overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={activeIndex}
                custom={direction}
                variants={textVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex flex-col items-center gap-3 px-6 text-center"
              >
                <div className="flex size-10 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                  <active.icon className="size-5" />
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-foreground">
                  {active.title}
                </h3>
                <p className="max-w-md text-pretty text-sm text-muted-foreground">
                  {active.description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Progress dot indicators */}
          <div className="mt-6 flex items-center justify-center gap-2">
            {FEATURES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => navigate(i, i > activeIndex ? 1 : -1)}
                aria-label={`Go to ${FEATURES[i].title}`}
                className={cn(
                  "relative h-1.5 overflow-hidden rounded-full bg-border transition-all duration-300",
                  i === activeIndex ? "w-8" : "w-2",
                )}
              >
                {i === activeIndex && (
                  <motion.div
                    key={activeIndex}
                    className="absolute inset-y-0 left-0 rounded-full bg-primary"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: AUTO_INTERVAL / 1000, ease: "linear" }}
                  />
                )}
              </button>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}