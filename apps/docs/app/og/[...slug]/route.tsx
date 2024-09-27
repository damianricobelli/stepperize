import { readFileSync } from "node:fs";
import { metadataImage } from "@/utils/metadata";
import { ImageResponse, type ImageResponse as ImageResponseType } from "next/og";

const font = readFileSync("./app/og/[...slug]/Inter-SemiBold.otf");

export const GET = metadataImage.createAPI((page): ImageResponseType => {
	return new ImageResponse(
		<div
			style={{
				height: "100%",
				width: "100%",
				display: "flex",
				padding: "6rem",
				justifyContent: "center",
				flexDirection: "column",
				gap: "64px",
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
				}}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="96"
					height="96"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					style={{ margin: "0px 40px 0px 0px" }}
				>
					<title style={{ display: "none" }}>{page.data.title}</title>
					<circle cx="12" cy="4.5" r="2.5" />
					<path d="m10.2 6.3-3.9 3.9" />
					<circle cx="4.5" cy="12" r="2.5" />
					<path d="M7 12h10" />
					<circle cx="19.5" cy="12" r="2.5" />
					<path d="m13.8 17.7 3.9-3.9" />
					<circle cx="12" cy="19.5" r="2.5" />
				</svg>
				<div
					style={{
						display: "flex",
						fontSize: 64,
						fontStyle: "normal",
						color: "black",
						lineHeight: 1.2,
						whiteSpace: "pre-wrap",
					}}
				>
					<b>Stepperize</b>
				</div>
			</div>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "16px",
				}}
			>
				<div
					style={{
						display: "flex",
						fontSize: 48,
						fontStyle: "normal",
						fontWeight: 600,
						color: "black",
						lineHeight: 1.2,
						whiteSpace: "pre-wrap",
					}}
				>
					<span
						style={{
							border: "1px solid #000000",
							padding: "8px 32px",
							borderRadius: 12,
							backgroundColor: "#000000",
							color: "#FFFFFF",
						}}
					>
						{page.data.title}
					</span>
				</div>
				<div
					style={{
						display: "flex",
						fontSize: 48,
						fontStyle: "normal",
						fontWeight: 500,
						color: "black",
						lineHeight: 1.2,
						whiteSpace: "pre-wrap",
					}}
				>
					<span>{page.data.description}</span>
				</div>
			</div>
		</div>,
		{
			width: 1200,
			height: 630,
			fonts: [
				{
					name: "inter",
					data: font,
					style: "normal",
				},
			],
		},
	);
});

export function generateStaticParams(): {
	slug: string[];
}[] {
	return metadataImage.generateParams();
}
