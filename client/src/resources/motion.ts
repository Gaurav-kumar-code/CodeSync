import { Transition, Variants } from "framer-motion"

const springPresets: Record<"stiff" | "normal" | "loose", Transition> = {
  stiff: {
    type: "spring",
    stiffness: 320,
    damping: 26,
    mass: 0.9,
  },
  normal: {
    type: "spring",
    stiffness: 220,
    damping: 24,
    mass: 1,
  },
  loose: {
    type: "spring",
    stiffness: 160,
    damping: 22,
    mass: 1.1,
  },
}

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
}

const scaleInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
}

const staggerContainer = (delayChildren: number = 0.05, staggerChildren: number = 0.08): Variants => ({
  hidden: {},
  visible: {
    transition: {
      delayChildren,
      staggerChildren,
    },
  },
})

export { springPresets, fadeUpVariants, scaleInVariants, staggerContainer }
