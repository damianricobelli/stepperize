import { Waypoints } from "lucide-react";
import type { ReactNode } from "react";
import type { OgImageProps } from "@/lib/og";
import { SITE } from "@/lib/site";

/** Brand palette — mirrors the site's primary (oklch 54.6% 0.2152 262.9 ≈ #2563eb). */
const BRAND_LIGHT = "#60a5fa";
const BACKGROUND = "#08080b";
const TITLE_COLOR = "#fafafa";
const MUTED_COLOR = "#a1a1aa";
const HAIRLINE = "rgba(255, 255, 255, 0.10)";

export function OgImage({ title, description, section }: OgImageProps) {
	return (
		<DocsTemplate
			description={description}
			icon={<StepperizeMark />}
			section={section}
			site={SITE.name}
			title={title}
		/>
	);
}

function DocsTemplate({
	title,
	description,
	icon,
	section,
	site,
}: {
	title: ReactNode;
	description: ReactNode;
	icon: ReactNode;
	section: ReactNode;
	site: ReactNode;
}) {
	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				position: "relative",
				overflow: "hidden",
				backgroundColor: BACKGROUND,
				color: TITLE_COLOR,
			}}
		>
			{/* Ambient brand glow — anchored top-left, softly diffused. */}
			<div
				style={{
					position: "absolute",
					top: -260,
					left: -200,
					width: 760,
					height: 760,
					borderRadius: "50%",
					background:
						"radial-gradient(circle, rgba(37, 99, 235, 0.30), rgba(37, 99, 235, 0) 68%)",
				}}
			/>
			{/* Cool secondary wash in the lower-right for depth. */}
			<div
				style={{
					position: "absolute",
					bottom: -320,
					right: -220,
					width: 720,
					height: 720,
					borderRadius: "50%",
					background:
						"radial-gradient(circle, rgba(96, 165, 250, 0.10), rgba(96, 165, 250, 0) 70%)",
				}}
			/>
			{/* Oversized brand watermark, bled off the right edge. */}
			<div
				style={{
					position: "absolute",
					top: -120,
					right: -130,
					display: "flex",
					opacity: 0.06,
				}}
			>
				<Waypoints color={BRAND_LIGHT} size={560} strokeWidth={1.5} />
			</div>

			{/* Inset card frame for a framed, product-grade feel. */}
			<div
				style={{
					position: "absolute",
					inset: 24,
					borderRadius: 28,
					border: `1px solid ${HAIRLINE}`,
				}}
			/>

			{/* Content. */}
			<div
				style={{
					position: "relative",
					display: "flex",
					flexDirection: "column",
					width: "100%",
					height: "100%",
					padding: "72px 80px",
				}}
			>
				{/* Header — brand lockup left, metadata badge right. */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: 22 }}>
						{icon}
						<span
							style={{
								fontSize: 36,
								fontWeight: 700,
								letterSpacing: "-0.01em",
								color: TITLE_COLOR,
							}}
						>
							{site}
						</span>
					</div>
					<Badge label={section} />
				</div>

				{/* Main — title and description, vertically centered. */}
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						flexGrow: 1,
						justifyContent: "center",
					}}
				>
					<span
						style={{
							fontSize: 78,
							fontWeight: 800,
							lineHeight: 1.05,
							letterSpacing: "-0.03em",
							color: TITLE_COLOR,
							maxWidth: 880,
							overflow: "hidden",
							maxHeight: 262,
						}}
					>
						{title}
					</span>
					<span
						style={{
							marginTop: 36,
							fontSize: 32,
							fontWeight: 400,
							lineHeight: 1.45,
							letterSpacing: "-0.01em",
							color: MUTED_COLOR,
							maxWidth: 700,
							overflow: "hidden",
							maxHeight: 140,
						}}
					>
						{description}
					</span>
				</div>
			</div>
		</div>
	);
}

function Badge({ label }: { label: ReactNode }) {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: 12,
				padding: "10px 20px 10px 16px",
				borderRadius: 999,
				border: `1px solid ${HAIRLINE}`,
				backgroundColor: "rgba(255, 255, 255, 0.03)",
			}}
		>
			<div
				style={{
					display: "flex",
					width: 10,
					height: 10,
					borderRadius: "50%",
					backgroundColor: BRAND_LIGHT,
					boxShadow: `0 0 14px 1px ${BRAND_LIGHT}`,
				}}
			/>
			<span
				style={{
					fontSize: 22,
					fontWeight: 600,
					textTransform: "uppercase",
					letterSpacing: "0.16em",
					color: "#d4d4d8",
				}}
			>
				{label}
			</span>
		</div>
	);
}

function StepperizeMark() {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				width: 76,
				height: 76,
				borderRadius: 20,
				border: `1px solid ${HAIRLINE}`,
				background:
					"linear-gradient(160deg, rgba(37, 99, 235, 0.22), rgba(37, 99, 235, 0.04))",
				boxShadow: "0 1px 0 rgba(255, 255, 255, 0.08) inset",
			}}
		>
			<Waypoints color={BRAND_LIGHT} size={42} strokeWidth={2.25} />
		</div>
	);
}
