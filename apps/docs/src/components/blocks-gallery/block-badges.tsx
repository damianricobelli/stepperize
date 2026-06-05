import type { BlockDifficulty } from "@/lib/blocks";
import { cn } from "@/lib/utils";

const DIFFICULTY_STYLES: Record<BlockDifficulty, string> = {
	beginner:
		"border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
	intermediate:
		"border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
	advanced:
		"border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400",
};

export function DifficultyBadge({
	difficulty,
	className,
}: {
	difficulty: BlockDifficulty;
	className?: string;
}) {
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize",
				DIFFICULTY_STYLES[difficulty],
				className,
			)}
		>
			{difficulty}
		</span>
	);
}
