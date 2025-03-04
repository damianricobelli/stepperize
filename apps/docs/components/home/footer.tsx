"use client";

import { Github, Twitter, Waypoints } from "lucide-react";
import { motion } from "motion/react";

export const Footer = () => {
  return (
    <footer className="bg-gray-1 border-t border-gray-3 py-32 px-4 sm:px-6 lg:px-8 relative">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-40 -right-40 size-96 bg-indigo-9/5 rounded-full mix-blend-multiply filter blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.05, 0.08, 0.05],
          }}
          transition={{
            duration: 8,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 size-96 bg-purple-9/5 rounded-full mix-blend-multiply filter blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.05, 0.08, 0.05],
          }}
          transition={{
            duration: 10,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
            delay: 1,
          }}
        />
      </div>

      <motion.div
        className="max-w-7xl mx-auto relative z-10"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <motion.div
            className="col-span-1 md:col-span-2"
            variants={itemVariants}
          >
            <motion.div
              className="flex items-center mb-4"
              whileHover={{ x: 5 }}
            >
              <Waypoints className="size-8 text-indigo-9 mr-2" />
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-9 via-purple-9 to-pink-9">
                Stepperize
              </span>
            </motion.div>
            <p className="text-gray-11 mb-4 max-w-md">
              A lightweight, flexible and type-safe library for creating
              intuitive step-by-step experiences with minimal boilerplate and
              maximum control.
            </p>
            <div className="flex space-x-4">
              <motion.a
                href="https://github.com/damianricobelli/stepperize"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-12 hover:text-white transition-colors"
                whileHover={{ scale: 1.2, color: "#fff" }}
                whileTap={{ scale: 0.9 }}
              >
                <Github className="size-5" />
              </motion.a>
              <motion.a
                href="https://x.com/damianricobelli"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-12 hover:text-white transition-colors"
                whileHover={{ scale: 1.2, color: "#1DA1F2" }}
                whileTap={{ scale: 0.9 }}
              >
                <Twitter className="size-5" />
              </motion.a>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <h3 className="text-gray-12 font-semibold mb-4">Documentation</h3>
            <ul className="space-y-2">
              <motion.li whileHover={{ x: 5 }}>
                <a
                  href="/docs/react"
                  className="text-gray-11 hover:text-white transition-colors"
                >
                  Getting Started
                </a>
              </motion.li>
              <motion.li whileHover={{ x: 5 }}>
                <a
                  href="/docs/react/api-references/define"
                  className="text-gray-11 hover:text-white transition-colors"
                >
                  API Reference
                </a>
              </motion.li>
              <motion.li whileHover={{ x: 5 }}>
                <a
                  href="/docs/react/examples/basic"
                  className="text-gray-11 hover:text-white transition-colors"
                >
                  Examples
                </a>
              </motion.li>
            </ul>
          </motion.div>

          <motion.div variants={itemVariants}>
            <h3 className="text-gray-12 font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              <motion.li whileHover={{ x: 5 }}>
                <a
                  href="https://github.com/damianricobelli/stepperize"
                  className="text-gray-11 hover:text-white transition-colors"
                >
                  GitHub
                </a>
              </motion.li>
              <motion.li whileHover={{ x: 5 }}>
                <a
                  href="https://www.npmjs.com/package/@stepperize/react"
                  className="text-gray-11 hover:text-white transition-colors"
                >
                  NPM Package
                </a>
              </motion.li>
              <motion.li whileHover={{ x: 5 }}>
                <a
                  href="https://github.com/damianricobelli/stepperize/releases"
                  className="text-gray-11 hover:text-white transition-colors"
                >
                  Release Notes
                </a>
              </motion.li>
              <motion.li whileHover={{ x: 5 }}>
                <a
                  href="https://github.com/damianricobelli/stepperize/issues"
                  className="text-gray-11 hover:text-white transition-colors"
                >
                  Contributing
                </a>
              </motion.li>
            </ul>
          </motion.div>
        </div>

        <motion.div
          className="mt-12 pt-8 border-t border-gray-7 flex flex-col md:flex-row justify-between items-center"
          variants={itemVariants}
        >
          <p className="text-gray-11 text-sm">
            &copy; {new Date().getFullYear()} Stepperize. All rights reserved.
          </p>
        </motion.div>
      </motion.div>
    </footer>
  );
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 50,
      damping: 10,
    },
  },
};
