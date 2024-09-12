export function generateColorScale({
	name,
	isOverlay = false,
}: { name: string; isOverlay?: boolean }) {
	const scale = Array.from({ length: 12 }, (_, i) => {
		const id = i + 1;
		if (isOverlay) {
			return [[`a${id}`, `var(--${name}-a${id})`]];
		}
		return [
			[id, `var(--${name}-${id})`],
			[`a${id}`, `var(--${name}-a${id})`],
		];
	}).flat();

	return Object.fromEntries(scale);
}
