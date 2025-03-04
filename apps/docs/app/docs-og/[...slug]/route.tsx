import { readFileSync } from "node:fs";
import { generateOGImage } from "@/app/docs-og/[...slug]/og";
import { metadataImage } from "@/lib/metadata";
import type { ImageResponse } from "next/og";
const font = readFileSync("./app/docs-og/[...slug]/JetBrainsMono-Regular.ttf");
const fontBold = readFileSync("./app/docs-og/[...slug]/JetBrainsMono-Bold.ttf");

export const GET = metadataImage.createAPI((page): ImageResponse => {
  return generateOGImage({
    primaryTextColor: "rgb(240,240,240)",
    title: page.data.title,
    description: page.data.description,
    fonts: [
      {
        name: "Mono",
        data: font,
        weight: 400,
      },
      {
        name: "Mono",
        data: fontBold,
        weight: 600,
      },
    ],
  });
});

export function generateStaticParams(): {
  slug: string[];
}[] {
  return metadataImage.generateParams();
}
