import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/docs/react/")({
	beforeLoad: () => {
		throw redirect({ href: "/docs/latest" });
	},
});
