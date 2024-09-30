"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cva } from "class-variance-authority";
import { useEffect, useState } from "react";

export const DemoViewer = ({ src, className }: { src: string; className?: string }) => {
	const [isLoaded, setIsLoaded] = useState(false);

	useEffect(() => {
		setIsLoaded(false);
	}, [src]);

	return (
		<>
			{!isLoaded && (
				<Skeleton className={classForDemoViewer({ className })}>
					<span>Loading demo...</span>
				</Skeleton>
			)}
			<iframe
				src={src}
				title="Demo Viewer"
				className={classForDemoViewer({ className, isLoaded })}
				onLoad={() => setIsLoaded(true)}
				style={{ display: isLoaded ? "block" : "none" }}
			/>
		</>
	);
};

const classForDemoViewer = cva("w-full h-[600px] border rounded-md flex items-center justify-center", {
	variants: {
		isLoaded: {
			true: "opacity-100",
			false: "opacity-0",
		},
	},
});
