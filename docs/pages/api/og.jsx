/* eslint-env node */
import { ImageResponse } from "@vercel/og";

export const config = {
	runtime: "edge",
};

const font = fetch(new URL("./Inter-SemiBold.otf", import.meta.url)).then(
	(res) => res.arrayBuffer(),
);

export default async function (req) {
	const inter = await font;

	const { searchParams } = new URL(req.url);

	// ?title=<title>
	const hasTitle = searchParams.has("title");
	const title = hasTitle
		? searchParams.get("title")?.slice(0, 100)
		: "Stepperize Documentation";

	return new ImageResponse(
		<div
			style={{
				height: "100%",
				width: "100%",
				display: "flex",
				textAlign: "center",
				alignItems: "center",
				justifyContent: "center",
				flexDirection: "column",
				flexWrap: "nowrap",
				backgroundColor: "white",
				backgroundImage:
					"radial-gradient(circle at 25px 25px, lightgray 2%, transparent 0%), radial-gradient(circle at 75px 75px, lightgray 2%, transparent 0%)",
				backgroundSize: "100px 100px",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="84"
					height="84"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					style={{ margin: "0 75px" }}
				>
					<circle cx="12" cy="4.5" r="2.5" />
					<path d="m10.2 6.3-3.9 3.9" />
					<circle cx="4.5" cy="12" r="2.5" />
					<path d="M7 12h10" />
					<circle cx="19.5" cy="12" r="2.5" />
					<path d="m13.8 17.7 3.9-3.9" />
					<circle cx="12" cy="19.5" r="2.5" />
				</svg>
			</div>
			<div
				style={{
					display: "flex",
					fontSize: 64,
					fontStyle: "normal",
					color: "black",
					marginTop: 20,
					lineHeight: 1.8,
					whiteSpace: "pre-wrap",
				}}
			>
				<b>{title}</b>
			</div>
		</div>,
		{
			width: 1200,
			height: 630,
			fonts: [
				{
					name: "inter",
					data: inter,
					style: "normal",
				},
			],
		},
	);
}
