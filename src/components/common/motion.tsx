"use client"

import { motion, type HTMLMotionProps } from "framer-motion"

const EASE = [0.16, 1, 0.3, 1] as const

/** Fade + slide-up entrance for page sections. */
export function FadeIn({ delay = 0, ...props }: HTMLMotionProps<"div"> & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay }}
      {...props}
    />
  )
}

/** Container that staggers its <StaggerItem> children. */
export function Stagger({ ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
      {...props}
    />
  )
}

export function StaggerItem(props: HTMLMotionProps<"div">) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
      }}
      {...props}
    />
  )
}
