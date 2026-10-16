import { Waypoints } from "lucide-react";
import { cn } from "@/lib/utils";

export const GITHUB_URL = "https://github.com/damianricobelli/stepperize";
export const NPM_URL = "https://www.npmjs.com/package/@stepperize/react";

/** The Stepperize mark on a brand tile. Shared by every nav surface. */
export function BrandMark({ className }: { className?: string }) {
	return (
		<span
			aria-hidden
			className={cn(
				"flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-primary text-primary-foreground shadow-sm shadow-primary/25 ring-1 ring-inset ring-white/15",
				className,
			)}
		>
			<Waypoints className="size-4" strokeWidth={2.25} />
		</span>
	);
}

export function Wordmark({ className }: { className?: string }) {
	return (
		<span
			className={cn(
				"flex items-center gap-2 text-[15px] font-semibold tracking-tight",
				className,
			)}
		>
			<BrandMark />
			{/* The smallest phones (320px) keep the mark and drop the word. */}
			<span className="max-[359px]:sr-only">Stepperize</span>
		</span>
	);
}
