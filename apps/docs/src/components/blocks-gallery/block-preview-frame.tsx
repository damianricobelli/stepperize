"use client";

import { TriangleAlert } from "lucide-react";
import {
	Component,
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Catches render errors in a live block so one bad preview can't crash the page. */
class PreviewErrorBoundary extends Component<
	{ children: ReactNode },
	{ hasError: boolean }
> {
	state = { hasError: false };

	static getDerivedStateFromError() {
		return { hasError: true };
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
					<TriangleAlert className="size-5 text-amber-500" aria-hidden />
					This preview failed to render.
				</div>
			);
		}
		return this.props.children;
	}
}

/**
 * A clean, adaptive canvas for a live block — a dotted-grid surface with the
 * block as the hero (no artificial device frame). Heavy blocks mount lazily once
 * scrolled into view; a skeleton holds the space meanwhile.
 *
 * `interactive={false}` renders the block as a non-interactive thumbnail (inert
 * + hidden from assistive tech), so gallery cards can use it as a single click
 * target without nesting focusable controls inside a link.
 */
export function BlockPreviewFrame({
	children,
	interactive = true,
	className,
	minHeightClass = "min-h-72",
	contentMaxWidthClass = "max-w-xl",
	thumbnailScaleClass = "scale-100",
}: {
	children: ReactNode;
	interactive?: boolean;
	className?: string;
	minHeightClass?: string;
	contentMaxWidthClass?: string;
	thumbnailScaleClass?: string;
}) {
	const [mounted, setMounted] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	// Mark the non-interactive thumbnail subtree as `inert` via the DOM property
	// (works across React versions) so its controls leave the tab order — the
	// card stays a single navigation target.
	const inertRef = useCallback((node: HTMLDivElement | null) => {
		if (node) node.inert = true;
	}, []);

	useEffect(() => {
		const node = ref.current;
		if (!node || mounted) return;
		if (typeof IntersectionObserver === "undefined") {
			setMounted(true);
			return;
		}
		const io = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) {
					setMounted(true);
					io.disconnect();
				}
			},
			{ rootMargin: "200px" },
		);
		io.observe(node);
		// Fallback: guarantee the block mounts even if the observer never fires
		// (some environments don't deliver IO callbacks without a scroll/paint).
		const fallback = setTimeout(() => setMounted(true), 400);
		return () => {
			io.disconnect();
			clearTimeout(fallback);
		};
	}, [mounted]);

	const content = mounted ? (
		<PreviewErrorBoundary>{children}</PreviewErrorBoundary>
	) : (
		<div className="mx-auto w-full max-w-md space-y-4">
			<Skeleton className="h-8 w-full" />
			<Skeleton className="h-24 w-full" />
			<Skeleton className="h-9 w-32" />
		</div>
	);

	return (
		<div
			ref={ref}
			className={cn(
				"flex items-center justify-center bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] bg-size-[16px_16px] p-6 sm:p-10",
				minHeightClass,
				className,
			)}
		>
			{interactive ? (
				<div
					className={cn(
						"mx-auto flex w-full justify-center",
						contentMaxWidthClass,
					)}
				>
					{content}
				</div>
			) : (
				<div
					ref={inertRef}
					className={cn(
						"pointer-events-none mx-auto flex w-full origin-center justify-center",
						contentMaxWidthClass,
						thumbnailScaleClass,
					)}
					aria-hidden
				>
					{content}
				</div>
			)}
		</div>
	);
}
