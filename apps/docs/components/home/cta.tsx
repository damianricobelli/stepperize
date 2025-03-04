"use client";

import { cn } from "@/lib/cn";
import { ExternalLink } from "lucide-react";
import { Github } from "lucide-react";
import { motion } from "motion/react";

export const Cta = ({ className }: { className?: string }) => {
  return (
    <motion.section
      className={cn("px-4 sm:px-6 lg:px-8 relative overflow-hidden", className)}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
    >
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-purple-9/20 to-indigo-9/20 transform rotate-12 translate-y-1/4 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-indigo-10/30 rounded-full filter blur-3xl" />
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-purple-10/20 rounded-full filter blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <motion.h2
          className="text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-9 via-purple-9 to-pink-9"
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          viewport={{ once: true }}
        >
          Ready to Simplify Your Multi-Step Flows?
        </motion.h2>

        <motion.p
          className="text-xl text-gray-12 mb-10"
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          Start building intuitive step-by-step experiences with Stepperize
          today
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center"
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <motion.a
            href="https://github.com/damianricobelli/stepperize"
            className="inline-flex items-center justify-center px-6 py-3 text-base font-medium rounded-md text-gray-12 bg-gradient-to-r from-indigo-8 to-purple-8 hover:from-indigo-9 hover:to-purple-9 transition-all duration-300 shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <Github className="mr-2 size-5" />
            View on GitHub
          </motion.a>
          <motion.a
            href="https://www.npmjs.com/package/@stepperize/react"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center px-6 py-3 border border-indigo-9 text-base font-medium rounded-md text-indigo-11 bg-transparent hover:bg-indigo-9/30 transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <ExternalLink className="mr-2 size-5" />
            NPM Package
          </motion.a>
        </motion.div>
      </div>
    </motion.section>
  );
};
