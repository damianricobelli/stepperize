import { useEffect, useRef, useState } from "react";
import ReactDemo from "@/components/framework-demos/react/ReactDemo";

/** Approach (c): each framework is a lazy chunk exposing `mount(el)`, React only owns the container. */
const loaders = {
	vue: () => import("@/components/framework-demos/mount/vue"),
	svelte: () => import("@/components/framework-demos/mount/svelte"),
	solid: () => import("@/components/framework-demos/mount/solid"),
	angular: () => import("@/components/framework-demos/mount/angular"),
	lit: () => import("@/components/framework-demos/mount/lit"),
	html: () => import("@/components/framework-demos/mount/html"),
};

/**
 * A live demo of the same three-step flow in each framework. React is this
 * site's own renderer, so its demo renders in place (and on the server); the
 * others mount their own app into a container once their chunk loads.
 */
export function FrameworkDemo({
	framework,
}: {
	framework: "react" | keyof typeof loaders;
}) {
	if (framework === "react") {
		return (
			<div data-framework-demo="react" data-state="mounted">
				<ReactDemo />
			</div>
		);
	}
	return <MountedDemo framework={framework} />;
}

function MountedDemo({ framework }: { framework: keyof typeof loaders }) {
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
