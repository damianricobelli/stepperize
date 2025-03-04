"use client";

import { cn } from "@/lib/cn";
import {
  Code,
  Layers,
  Palette,
  Repeat,
  Shield,
  Sparkles,
  Workflow,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";

const Features = ({ className }: { className?: string }) => {
  return (
    <section
      id="features"
      className={cn("px-4 sm:px-6 lg:px-8 relative", className)}
    >
      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            type: "spring",
            stiffness: 100,
          }}
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.h2
            className="text-3xl sm:text-4xl font-bold mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-9 via-purple-9 to-pink-9">
              Powerful Features
            </span>
          </motion.h2>
          <motion.p
            className="max-w-2xl mx-auto text-lg text-gray-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            Everything you need to build amazing multi-step experiences
          </motion.p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="bg-indigo-1/50 backdrop-blur-sm border border-indigo-6/50 rounded-xl p-6 hover:bg-indigo-2/50 transition-all duration-300 hover:shadow-lg"
              variants={item}
            >
              <motion.div className="size-12 rounded-lg bg-gray-6/50 flex items-center justify-center mb-4 transition-colors duration-300">
                {feature.icon}
              </motion.div>
              <motion.h3 className="text-xl font-semibold mb-2 text-gray-12">
                {feature.title}
              </motion.h3>
              <motion.p className="text-gray-11">
                {feature.description}
              </motion.p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
};

const item = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 10,
    },
  },
};

const features = [
  {
    icon: <Code className="size-6 text-indigo-11" />,
    title: "Minimal API",
    description:
      "Simple, intuitive API that requires minimal boilerplate code to get started.",
  },
  {
    icon: <Workflow className="size-6 text-purple-11" />,
    title: "Flexible Navigation",
    description:
      "Navigate between steps programmatically with complete control over the flow.",
  },
  {
    icon: <Sparkles className="size-6 text-pink-11" />,
    title: "Form Integration",
    description:
      "Seamlessly integrates with any form library or can be used standalone.",
  },
  {
    icon: <Layers className="size-6 text-indigo-11" />,
    title: "Step Management",
    description:
      "Easily manage step state, validation, and conditional rendering.",
  },
  {
    icon: <Zap className="size-6 text-purple-11" />,
    title: "Lightweight",
    description:
      "Zero dependencies and tiny bundle size for optimal performance.",
  },
  {
    icon: <Shield className="size-6 text-pink-11" />,
    title: "Type-Safe",
    description:
      "Built with TypeScript for excellent developer experience and code safety.",
  },
  {
    icon: <Palette className="size-6 text-indigo-11" />,
    title: "UI Agnostic",
    description:
      "Bring your own UI components - works with any styling approach.",
  },
  {
    icon: <Repeat className="size-6 text-purple-11" />,
    title: "Persistent State",
    description:
      "Optional state persistence between sessions or page refreshes.",
  },
];

export default Features;
