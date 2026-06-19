"use client"

import { type ReactNode } from "react"
import { motion, type Variants } from "framer-motion"

type Direction = "up" | "down" | "left" | "right" | "none"

const OFFSET = 32

function offsetFor(direction: Direction) {
  switch (direction) {
    case "up":
      return { y: OFFSET }
    case "down":
      return { y: -OFFSET }
    case "left":
      return { x: OFFSET }
    case "right":
      return { x: -OFFSET }
    default:
      return {}
  }
}

type RevealProps = {
  children: ReactNode
  /** Direction the content travels in from. Defaults to "up". */
  direction?: Direction
  /** Stagger delay in seconds. */
  delay?: number
  className?: string
  /** Animate every time it enters the viewport instead of just once. */
  repeat?: boolean
}

/**
 * Fades + slides its children into view when scrolled into the viewport.
 * A single, reusable primitive so every section animates consistently.
 */
export function Reveal({
  children,
  direction = "up",
  delay = 0,
  className,
  repeat = false,
}: RevealProps) {
  const variants: Variants = {
    hidden: { opacity: 0, ...offsetFor(direction) },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
    },
  }

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: !repeat, amount: 0.2, margin: "0px 0px -10% 0px" }}
    >
      {children}
    </motion.div>
  )
}
