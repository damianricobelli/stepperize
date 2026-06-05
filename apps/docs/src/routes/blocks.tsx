import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export const Route = createFileRoute("/blocks")({
	component: BlocksLayout,
});

function BlocksLayout() {
	return (
		<div className="flex min-h-screen flex-col bg-background text-foreground">
			<SiteHeader active="blocks" />
			<main className="flex-1">
				<Outlet />
			</main>
			<SiteFooter />
		</div>
	);
}
