import type { ImageResponseOptions } from "next/dist/compiled/@vercel/og/types";
import { ImageResponse } from "next/og";
import type { ReactElement, ReactNode } from "react";

interface GenerateProps {
	title: ReactNode;
	description?: ReactNode;
	primaryTextColor?: string;
}

export function generateOGImage(options: GenerateProps & ImageResponseOptions): ImageResponse {
	const { title, description, primaryTextColor, ...rest } = options;

	return new ImageResponse(
		generate({
			title,
			description,
			primaryTextColor,
		}),
		{
			width: 1200,
			height: 630,
			...rest,
		},
	);
}

export function generate({ primaryTextColor = "rgb(255,150,255)", ...props }: GenerateProps): ReactElement {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				width: "100%",
				height: "100%",
				color: "white",
				backgroundColor: "rgb(10,10,10)",
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					width: "100%",
					height: "100%",
					padding: "4rem",
				}}
			>
				<p
					style={{
						fontWeight: 600,
						fontSize: "76px",
					}}
				>
					{props.title}
				</p>
				<p
					style={{
						fontSize: "48px",
						color: "rgba(240,240,240,0.7)",
					}}
				>
					{props.description}
				</p>
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						marginTop: "auto",
						color: primaryTextColor,
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
						<title style={{ display: "none" }}>Stepperize</title>
						<circle cx="12" cy="4.5" r="2.5" />
						<path d="m10.2 6.3-3.9 3.9" />
						<circle cx="4.5" cy="12" r="2.5" />
						<path d="M7 12h10" />
						<circle cx="19.5" cy="12" r="2.5" />
						<path d="m13.8 17.7 3.9-3.9" />
						<circle cx="12" cy="19.5" r="2.5" />
					</svg>
					<p
						style={{
							fontSize: "64px",
							fontWeight: 600,
						}}
					>
						Stepperize
					</p>
				</div>
			</div>
		</div>
	);
}
