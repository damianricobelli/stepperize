import { createFileRoute } from "@tanstack/react-router";
import ImageResponse from "takumi-js/response";
import { OG_IMAGE, parseOgImageRequest } from "@/lib/og";
import { OgImage } from "@/lib/og-image";

export const Route = createFileRoute("/api/og")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const imageProps = parseOgImageRequest(request.url);

        return new ImageResponse(<OgImage {...imageProps} />, {
          width: OG_IMAGE.width,
          height: OG_IMAGE.height,
        });
      },
    },
  },
});
