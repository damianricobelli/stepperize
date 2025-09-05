"use client";

import { ArrowRight, ChevronRight } from "lucide-react";
import { type TargetAndTransition, motion } from "motion/react";

const Hero = () => {
  return (
    <section className="h-screen content-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-1/4 left-1/4 size-96 bg-indigo-4 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
          animate={glowAnimation}
        />
        <motion.div
          className="absolute top-1/3 right-1/4 size-96 bg-purple-4 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
          animate={{
            ...glowAnimation,
            transition: {
              ...glowAnimation.transition,
              delay: 2,
            },
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/3 size-96 bg-pink-5 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
          animate={{
            ...glowAnimation,
            transition: {
              ...glowAnimation.transition,
              delay: 4,
            },
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center">
          <motion.a
            href="/docs/react/shadcn/introduction"
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.5,
              type: "spring",
              stiffness: 200,
            }}
            className="inline-block"
          >
            <motion.span
              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-8/50 text-indigo-12 mb-6 border border-indigo-8/30 backdrop-blur-sm"
              whileHover={{ scale: 1.05 }}
            >
              <motion.span
                className="size-2 rounded-full bg-indigo-12 mr-2"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [1, 0.8, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              />
              Introducing shadcn-stepper
            </motion.span>
          </motion.a>

          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6"
            variants={titleVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.1 }}
          >
            <motion.span
              className="block text-gray-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Powerful Multi-Step Flows
            </motion.span>
            <motion.span
              className="block bg-clip-text text-transparent bg-gradient-to-r from-indigo-9 via-purple-9 to-pink-9"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Made Simple
            </motion.span>
          </motion.h1>

          <motion.p
            className="max-w-2xl mx-auto text-xl text-gray-12 mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.4,
              type: "spring",
              stiffness: 100,
            }}
          >
            A lightweight, flexible and type-safe library for creating intuitive
            step-by-step experiences with minimal boilerplate and maximum
            control.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.5,
              type: "spring",
              stiffness: 100,
            }}
          >
            <motion.a
              href="/docs/react"
              className="inline-flex items-center justify-center px-6 py-3 text-base font-medium rounded-md text-gray-12 bg-gradient-to-r from-indigo-8 to-purple-8 hover:from-indigo-9 hover:to-purple-9 transition-all duration-300 shadow-lg"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              Get Started
              <ChevronRight className="ml-2 size-5" />
            </motion.a>
            <motion.button
              type="button"
              className="cursor-pointer inline-flex items-center justify-center px-6 py-3 border border-indigo-9 text-base font-medium rounded-md text-indigo-11 bg-transparent hover:bg-indigo-9/30 transition-all duration-300"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={(e) => {
                e.preventDefault();
                const demoElement = document.querySelector("#demo");
                if (demoElement) {
                  demoElement.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                }
              }}
            >
              View Demo
              <ArrowRight className="ml-2 size-5" />
            </motion.button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

// #region Animations

const titleVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 10,
    },
  },
} as const;

const buttonVariants = {
  hover: {
    scale: 1.05,
    boxShadow: "0 10px 15px -3px rgba(99, 102, 241, 0.3)",
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 10,
    },
  },
  tap: { scale: 0.95 },
} as const;

const glowAnimation: TargetAndTransition = {
  opacity: [0.5, 0.8, 0.5],
  scale: [1, 1.05, 1],
  transition: {
    duration: 8,
    repeat: Number.POSITIVE_INFINITY,
    repeatType: "reverse",
    ease: "easeInOut",
  },
};

// #endregion Animations

export default Hero;
