import { useEffect, useRef, useState } from "react";

/** Approach (c): each framework is a lazy chunk exposing `mount(el)`, React only owns the container. */
const loaders = {
	vue: () => import("@/components/framework-demos/mount/vue"),
	svelte: () => import("@/components/framework-demos/mount/svelte"),
	solid: () => import("@/components/framework-demos/mount/solid"),
	html: () => import("@/components/framework-demos/mount/html"),
	lit: () => import("@/components/framework-demos/mount/lit"),
	angular: () => import("@/components/framework-demos/mount/angular"),
};

export function FrameworkDemo({
	framework,
}: {
	framework: keyof typeof loaders;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const [state, setState] = useState("loading");

	useEffect(() => {
		let unmount: (() => void) | undefined;
		let cancelled = false;
		loaders[framework]().then(
			({ mount }) => {
				if (cancelled || !ref.current) return;
				unmount = mount(ref.current);
				setState("mounted");
			},
			(error) => setState(`failed: ${error}`),
		);
		return () => {
			cancelled = true;
			unmount?.();
		};
	}, [framework]);

	return (
		<div data-framework-demo={framework} data-state={state}>
			<div ref={ref} />
			{state === "loading" && (
				<p className="text-sm text-fd-muted-foreground">Loading {framework}…</p>
			)}
		</div>
	);
}
