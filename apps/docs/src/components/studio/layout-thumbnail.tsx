import type { Layout } from "@/lib/studio/config";

/** Static marks, hoisted out of render (rendering-hoist-jsx). */
const THUMBNAILS: Record<Layout, React.ReactElement> = {
	horizontal: (
		<svg viewBox="0 0 90 34" className="h-8 w-full" aria-hidden>
			<circle cx="12" cy="17" r="6" fill="currentColor" />
			<rect
				x="22"
				y="16"
				width="16"
				height="2"
				rx="1"
				fill="currentColor"
				opacity=".5"
			/>
			<circle
				cx="45"
				cy="17"
				r="5.5"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
			/>
			<rect
				x="55"
				y="16"
				width="16"
				height="2"
				rx="1"
				fill="currentColor"
				opacity=".3"
			/>
			<circle
				cx="78"
				cy="17"
				r="5.5"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				opacity=".5"
			/>
		</svg>
	),
	vertical: (
		<svg viewBox="0 0 90 34" className="h-8 w-full" aria-hidden>
			<circle cx="20" cy="6" r="4" fill="currentColor" />
			<rect
				x="19"
				y="11"
				width="2"
				height="6"
				fill="currentColor"
				opacity=".5"
			/>
			<circle
				cx="20"
				cy="23"
				r="3.5"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
			/>
			<rect
				x="34"
				y="3"
				width="44"
				height="28"
				rx="3"
				fill="currentColor"
				opacity=".14"
			/>
		</svg>
	),
	progress: (
		<svg viewBox="0 0 90 34" className="h-8 w-full" aria-hidden>
			<rect
				x="8"
				y="10"
				width="34"
				height="3"
				rx="1.5"
				fill="currentColor"
				opacity=".5"
			/>
			<rect
				x="8"
				y="19"
				width="74"
				height="6"
				rx="3"
				fill="currentColor"
				opacity=".15"
			/>
			<rect x="8" y="19" width="44" height="6" rx="3" fill="currentColor" />
		</svg>
	),
	segmented: (
		<svg viewBox="0 0 90 34" className="h-8 w-full" aria-hidden>
			<rect
				x="6"
				y="8"
				width="78"
				height="18"
				rx="5"
				fill="currentColor"
				opacity=".15"
			/>
			<rect x="9" y="11" width="24" height="12" rx="3.5" fill="currentColor" />
			<rect
				x="40"
				y="16"
				width="14"
				height="2"
				rx="1"
				fill="currentColor"
				opacity=".5"
			/>
			<rect
				x="62"
				y="16"
				width="14"
				height="2"
				rx="1"
				fill="currentColor"
				opacity=".5"
			/>
		</svg>
	),
	circular: (
		<svg viewBox="0 0 90 34" className="h-8 w-full" aria-hidden>
			<circle
				cx="20"
				cy="17"
				r="11"
				fill="none"
				stroke="currentColor"
				strokeWidth="3.5"
				opacity=".18"
			/>
			<path
				d="M20 6a11 11 0 0 1 10.5 14.2"
				fill="none"
				stroke="currentColor"
				strokeWidth="3.5"
				strokeLinecap="round"
			/>
			<rect
				x="40"
				y="11"
				width="36"
				height="4"
				rx="2"
				fill="currentColor"
				opacity=".55"
			/>
			<rect
				x="40"
				y="19"
				width="24"
				height="3"
				rx="1.5"
				fill="currentColor"
				opacity=".3"
			/>
		</svg>
	),
	breadcrumb: (
		<svg viewBox="0 0 90 34" className="h-8 w-full" aria-hidden>
			<rect
				x="6"
				y="15"
				width="18"
				height="4"
				rx="2"
				fill="currentColor"
				opacity=".5"
			/>
			<path
				d="m28 13 4 4-4 4"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				opacity=".5"
			/>
			<rect x="36" y="12" width="20" height="10" rx="3" fill="currentColor" />
			<path
				d="m60 13 4 4-4 4"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				opacity=".5"
			/>
			<rect
				x="68"
				y="15"
				width="16"
				height="4"
				rx="2"
				fill="currentColor"
				opacity=".3"
			/>
		</svg>
	),
};

export function LayoutThumbnail({ layout }: { layout: Layout }) {
	return THUMBNAILS[layout];
}
