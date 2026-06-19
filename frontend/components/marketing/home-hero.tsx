"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"

// The shader relies on WebGL, so it must only run on the client.
const ShaderBackground = dynamic(
  () => import("./shader-background").then((m) => m.ShaderBackground),
  { ssr: false },
)

const STATS = [
  { value: "94.7%", label: "Ensemble Accuracy" },
  { value: "< 5 min", label: "Setup Time" },
  { value: "30-Day", label: "Forecast Horizon" },
]

export function HomeHero() {
  return (
    <section className="relative isolate flex min-h-[92vh] w-full items-center justify-center overflow-hidden">
      {/* Purple glass shader backdrop */}
      <ShaderBackground color="#a855f7" />

      {/* Legibility + fade into the page background */}
      <div className="pointer-events-none absolute inset-0 -z-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_42%,transparent,oklch(0.12_0.04_300/0.55))]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-4 py-24 text-center">

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-balance text-5xl font-black leading-[1.05] tracking-tight text-white md:text-7xl"
        >
          Predict Your Demand.
          <br />
          <span className="bg-gradient-to-r from-purple-200 to-white bg-clip-text text-transparent">
            Optimize Your Inventory.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-white/80"
        >
          Stop relying on intuition. Use machine learning to analyze historical
          sales, prevent costly overstocking, and eliminate missed sales
          opportunities.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-10 flex flex-col justify-center gap-3 sm:flex-row"
        >
          <Link
            href="/signin"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-[1.03] active:scale-95"
          >
            Open Dashboard
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-white/10 px-8 py-3.5 text-base font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20"
          >
            Create Free Account
          </Link>
        </motion.div>

        <motion.dl
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-16 grid w-full max-w-2xl grid-cols-3 gap-6 border-t border-white/15 pt-8"
        >
          {STATS.map((stat) => (
            <div key={stat.label}>
              <dt className="sr-only">{stat.label}</dt>
              <dd className="text-2xl font-bold text-white md:text-3xl">
                {stat.value}
              </dd>
              <p className="mt-1 text-xs font-medium text-white/70">
                {stat.label}
              </p>
            </div>
          ))}
        </motion.dl>
      </div>
    </section>
  )
}
