"use client"

import { animate, useReducedMotion } from "framer-motion"
import { useEffect, useRef, useState } from "react"

/** Counts up to `value` when it changes; formatting is delegated. */
export function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const reduce = useReducedMotion()
  const [display, setDisplay] = useState(0)
  const from = useRef(0)

  useEffect(() => {
    if (reduce) return
    const controls = animate(from.current, value, {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: setDisplay,
      onComplete: () => setDisplay(value),
    })
    from.current = value
    return () => controls.stop()
  }, [value, reduce])

  return <>{format(reduce ? value : display)}</>
}
