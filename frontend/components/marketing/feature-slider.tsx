"use client"

import Image from "next/image"
import React, { useState, type ElementType } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { LineChart, PieChart, ShieldCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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

export function FeatureSlider() {
  const [activeIndex, setActiveIndex] = useState(0)
  const active = FEATURES[activeIndex]

  return (
    <section id="features" className="py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4">
        <Reveal className="mb-14 flex flex-col items-center gap-4 text-center">
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/5 text-primary"
          >
            Platform
          </Badge>
          <h2 className="max-w-2xl text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Everything you need to forecast with confidence
          </h2>
          <p className="max-w-xl text-pretty text-muted-foreground">
            A single workspace that turns raw sales history into decisions your
            team can act on.
          </p>
        </Reveal>

        {/* Browser-style preview frame. The screenshots are 1440x900 (16:10),
            so the content area uses that exact ratio to avoid any cropping. */}
        <Reveal delay={0.1} className="relative mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-primary/10">
            {/* Chrome bar */}
            <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-4 py-3">
              <span className="flex gap-1.5" aria-hidden="true">
                <span className="size-3 rounded-full bg-destructive/60" />
                <span className="size-3 rounded-full bg-chart-3/70" />
                <span className="size-3 rounded-full bg-accent/70" />
              </span>
              <div className="ml-3 flex min-w-0 flex-1 items-center justify-center">
                <span className="truncate rounded-md bg-background px-3 py-1 font-mono text-xs text-muted-foreground">
                  app.demandforecasting.ai{active.path}
                </span>
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

        {/* Feature triggers */}
        <Reveal
          delay={0.15}
          className="mx-auto mt-8 flex max-w-5xl flex-col md:flex-row"
        >
          <div
            className="flex w-full flex-col md:flex-row"
            onMouseLeave={() => setActiveIndex(0)}
          >
            {FEATURES.map((feature, index) => {
              const isActive = activeIndex === index
              return (
                <React.Fragment key={feature.title}>
                  {index > 0 && (
                    <Separator
                      orientation="vertical"
                      className="mx-4 hidden h-auto w-px bg-border md:block"
                    />
                  )}
                  <button
                    type="button"
                    className={cn(
                      "flex grow basis-0 cursor-pointer flex-col rounded-lg p-4 text-left transition-colors",
                      isActive ? "bg-primary/5" : "hover:bg-muted/60",
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onFocus={() => setActiveIndex(index)}
                    onClick={() => setActiveIndex(index)}
                    aria-pressed={isActive}
                  >
                    <div
                      className={cn(
                        "mb-4 flex size-10 items-center justify-center rounded-full border transition-colors",
                        isActive
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground",
                      )}
                    >
                      <feature.icon className="size-5" />
                    </div>
                    <h3 className="mb-1.5 font-semibold tracking-tight text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-pretty text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </button>
                </React.Fragment>
              )
            })}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
