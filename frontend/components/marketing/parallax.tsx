"use client"

import { useRef, type ReactNode } from "react"
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion"

type ParallaxProps = {
  children: ReactNode
  /** Total vertical travel in pixels across the scroll range. */
  offset?: number
  className?: string
}

/**
 * Translates its children vertically as the element scrolls through the
 * viewport, creating a subtle depth/parallax effect. Respects reduced motion.
 */
export function Parallax({ children, offset = 60, className }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null)
  const prefersReduced = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReduced ? [0, 0] : [offset, -offset],
  )

  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  )
}
