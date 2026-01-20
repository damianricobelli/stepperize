"use client";

import { cn } from "@/lib/cn";
import { Code as CodeIcon } from "lucide-react";
import { motion } from "motion/react";

export const CodeExample = ({ className, children }: { className?: string; children: React.ReactNode }) => {
	return (
		<section id="examples" className={cn("px-4 sm:px-6 lg:px-8 bg-indigo1 relative", className)}>
			{/* Background elements */}
			<div className="absolute inset-0 overflow-hidden">
				<motion.div
					className="absolute -top-40 -right-40 size-96 bg-indigo-9/10 rounded-full mix-blend-multiply filter blur-3xl"
					animate={{
						scale: [1, 1.2, 1],
						opacity: [0.1, 0.15, 0.1],
					}}
					transition={{
						duration: 8,
						repeat: Number.POSITIVE_INFINITY,
						repeatType: "reverse",
					}}
				/>
				<motion.div
					className="absolute -bottom-40 -left-40 size-96 bg-purple-9/10 rounded-full mix-blend-multiply filter blur-3xl"
					animate={{
						scale: [1, 1.3, 1],
						opacity: [0.1, 0.15, 0.1],
					}}
					transition={{
						duration: 10,
						repeat: Number.POSITIVE_INFINITY,
						repeatType: "reverse",
						delay: 1,
					}}
				/>
			</div>

			<div className="max-w-5xl mx-auto relative z-10">
				<motion.div
					className="text-center mb-12"
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{
						duration: 0.5,
						type: "spring",
						stiffness: 100,
					}}
					viewport={{ once: true, margin: "-100px" }}
				>
					<motion.div
						className="inline-flex items-center justify-center size-16 rounded-full bg-indigo-10/20 mb-6"
						initial={{ scale: 0, rotate: -180 }}
						whileInView={{ scale: 1, rotate: 0 }}
						transition={{
							type: "spring",
							stiffness: 200,
							damping: 15,
							delay: 0.1,
						}}
						viewport={{ once: true, margin: "-100px" }}
						whileHover={{
							scale: 1.1,
							backgroundColor: "rgba(99, 102, 241, 0.3)",
						}}
					>
						<CodeIcon className="size-8 text-indigo-11" />
					</motion.div>

					<motion.h2
						className="text-3xl sm:text-4xl font-bold mb-4"
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.2 }}
						viewport={{ once: true, margin: "-100px" }}
					>
						<span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-9 via-purple-9 to-pink-9">
							Simple to Implement
						</span>
					</motion.h2>
					<motion.p
						className="max-w-2xl mx-auto text-lg text-gray-12"
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.3 }}
						viewport={{ once: true, margin: "-100px" }}
					>
						Get started with just a few lines of code
					</motion.p>
				</motion.div>

				<motion.div
					className="relative"
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{
						duration: 0.5,
						delay: 0.2,
						type: "spring",
						stiffness: 50,
					}}
					viewport={{ once: true, margin: "-100px" }}
				>
					<motion.div transition={{ duration: 0.3 }}>
						<motion.div
							initial={{ opacity: 0 }}
							whileInView={{ opacity: 1 }}
							transition={{ duration: 0.5, delay: 0.3 }}
							viewport={{ once: true }}
						>
							{children}
						</motion.div>
					</motion.div>
				</motion.div>

				<motion.div
					className="mt-12 text-center"
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.4 }}
					viewport={{ once: true, margin: "-100px" }}
				>
					<motion.p
						className="text-gray-12 mb-6"
						initial={{ opacity: 0 }}
						whileInView={{ opacity: 1 }}
						transition={{ duration: 0.5, delay: 0.5 }}
						viewport={{ once: true }}
					>
						The{" "}
						<motion.code className="bg-indigo-2 px-2 py-1 rounded text-indigo-11 border border-indigo-9/50">
							useStepper
						</motion.code>{" "}
						hook provides everything you need to manage multi-step flows with minimal effort.
					</motion.p>
					<motion.a
						href="/docs/react"
						className="inline-flex items-center text-indigo-11 hover:text-indigo-12 transition-colors"
						whileHover={{ scale: 1.05, x: 5 }}
						whileTap={{ scale: 0.95 }}
					>
						View full documentation
						<motion.svg
							className="ml-2 size-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							animate={{ x: [0, 5, 0] }}
							transition={{
								duration: 1.5,
								repeat: Number.POSITIVE_INFINITY,
								repeatType: "reverse",
							}}
						>
							<title>Copy code</title>
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
						</motion.svg>
					</motion.a>
				</motion.div>
			</div>
		</section>
	);
};
