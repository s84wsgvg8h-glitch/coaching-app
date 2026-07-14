"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: "easeOut" as const },
};

type DashboardMotionProps = HTMLMotionProps<"div"> & {
  delay?: number;
};

export function DashboardFadeIn({
  children,
  delay = 0,
  className = "",
  ...props
}: DashboardMotionProps) {
  return (
    <motion.div
      initial={fadeUp.initial}
      animate={fadeUp.animate}
      transition={{ ...fadeUp.transition, delay, ease: "easeOut" }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function DashboardHoverLift({
  children,
  className = "",
  ...props
}: HTMLMotionProps<"div">) {
  return (
    <motion.div
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
