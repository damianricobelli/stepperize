import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Frame used to showcase a live block inside the docs. Same surface as the
 * interactive examples (ExampleFrame) so every live thing in the docs reads
 * as one family.
 *
 * `not-prose` keeps the typography styles from `DocsBody` out of the demo so
 * the block renders exactly like it would in a real app.
 */
export function Preview({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div className="not-prose my-8 overflow-hidden rounded-2xl border bg-card shadow-xs">
			<div
				className={cn(
					"relative flex min-h-104 items-center justify-center p-4 sm:p-8",
					className,
				)}
			>
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] bg-size-[16px_16px] mask-[radial-gradient(ellipse_75%_70%_at_50%_50%,black,transparent)]"
				/>
				<div className="relative flex w-full min-w-0 justify-center">
					{children}
				</div>
			</div>
		</div>
	);
}
