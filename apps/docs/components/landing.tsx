import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const sections = [
	{
		id: "define-stepper",
		title: "Get started in a few lines",
		description: "Define your own stepper with just one id. Then you can add whatever values you want to each object.",
	},
	{
		id: "use-stepper",
		title: "Use the stepper",
		description: "Use the `useStepper` hook to get the current step and navigate through the steps.",
	},
	{
		id: "create-stepper",
		title: "Create your own stepper",
		description: "You can create your own stepper in any style you want. You own your stepper step by step!",
	},
];

const LeftContainer = ({
	currentSection,
	isMobile,
}: {
	currentSection?: (typeof sections)[0];
	isMobile: boolean;
}) => {
	if (isMobile) {
		return (
			<div className="h-auto py-16 flex items-center justify-center text-gray-12">
				<div>
					<h2 className="text-4xl font-bold mb-4">{currentSection?.title}</h2>
					<p className="text-xl">{currentSection?.description}</p>
				</div>
			</div>
		);
	}

	return (
		<motion.div
			className="h-screen sticky top-0 flex items-center text-gray-12"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.5 }}
		>
			<div>
				<motion.h2
					className="text-4xl font-bold mb-4"
					key={currentSection?.title}
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
				>
					{currentSection?.title}
				</motion.h2>
				<motion.div
					className="text-xl"
					key={currentSection?.description}
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.2 }}
				>
					{currentSection?.description}
				</motion.div>
			</div>
		</motion.div>
	);
};

const RightContainer = ({
	currentSectionIndex,
	isMobile,
}: {
	currentSectionIndex: number;
	isMobile: boolean;
}) => {
	const components = [
		() => (
			<div className="flex flex-col items-center justify-center text-center">
				<h3 className="text-3xl font-bold mb-4">Welcome to Our Product</h3>
				<p className="text-xl">Discover amazing features as you scroll</p>
			</div>
		),
		() => (
			<div className="flex flex-col items-center justify-center">
				<h3 className="text-2xl font-bold mb-2">Feature 1</h3>
				<p className="text-lg">Innovative solution for your needs</p>
			</div>
		),
		() => (
			<div className="flex flex-col items-center justify-center">
				<h3 className="text-2xl font-bold mb-2">Feature 2</h3>
				<p className="text-lg">Streamline your workflow effortlessly</p>
			</div>
		),
	];

	if (isMobile) {
		return (
			<div className="h-auto py-16 flex items-center justify-center overflow-hidden">
				{components[currentSectionIndex]?.()}
			</div>
		);
	}

	return (
		<div className="md:h-screen md:sticky md:top-0 flex items-center justify-center overflow-hidden">
			<AnimatePresence mode="wait">
				<motion.div
					key={currentSectionIndex}
					initial={{ opacity: 0, x: 50 }}
					animate={{ opacity: 1, x: 0 }}
					exit={{ opacity: 0, x: -50 }}
					transition={{ duration: 0.5 }}
					className="w-full p-8"
				>
					{components[currentSectionIndex]?.()}
				</motion.div>
			</AnimatePresence>
		</div>
	);
};

export function Component() {
	const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleScroll = () => {
			const scrollPosition = window.scrollY;
			const windowHeight = window.innerHeight;
			const fullHeight = containerRef.current?.scrollHeight;

			if (!fullHeight) {
				return;
			}

			const sectionHeight = fullHeight / sections.length;
			const currentIndex = Math.floor((scrollPosition + windowHeight / 2) / sectionHeight);

			setCurrentSectionIndex(Math.min(currentIndex, sections.length - 1));
		};

		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	return (
		<div ref={containerRef} className="flex flex-col md:flex-row relative bottom-20">
			{/* Desktop */}
			{sections.map((section, index) => (
				<div key={section.id} className="md:hidden">
					<LeftContainer currentSection={section} isMobile={true} />
					<RightContainer currentSectionIndex={index} isMobile={true} />
				</div>
			))}
			{/* Mobile */}
			<div className="w-1/3 hidden md:block">
				<LeftContainer currentSection={sections[currentSectionIndex]} isMobile={false} />
			</div>
			<div className="w-2/3 hidden md:block">
				<RightContainer currentSectionIndex={currentSectionIndex} isMobile={false} />
			</div>
			<div className="h-[500vh] hidden md:block" aria-hidden="true" /> {/* Spacer for scrolling */}
		</div>
	);
}
