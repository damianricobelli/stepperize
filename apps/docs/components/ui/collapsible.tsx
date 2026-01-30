"use client";
import { Collapsible as CollapsiblePrimitive } from "radix-ui";
import { forwardRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils"

const Collapsible = CollapsiblePrimitive.Root;

const CollapsibleTrigger = CollapsiblePrimitive.Trigger;

const CollapsibleContent = forwardRef<
	HTMLDivElement,
	React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Content>
>(({ children, ...props }, ref) => {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	return (
		<CollapsiblePrimitive.Content
			ref={ref}
			{...props}
			className={cn(
				"overflow-hidden",
				mounted && "data-[state=closed]:animate-fd-collapsible-up data-[state=open]:animate-fd-collapsible-down",
				props.className,
			)}
		>
			{children}
		</CollapsiblePrimitive.Content>
	);
});

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
