import { rehypeCodeDefaultOptions } from "fumadocs-core/mdx-plugins";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import { transformerTwoslash } from "fumadocs-twoslash";

export const { docs, meta } = defineDocs();

export default defineConfig({
	generateManifest: true,
	lastModifiedTime: "git",
	mdxOptions: {
		rehypeCodeOptions: {
			inline: "tailing-curly-colon",
			themes: {
				light: "catppuccin-latte",
				dark: "catppuccin-mocha",
			},
			//@ts-ignore
			transformers: [...(rehypeCodeDefaultOptions.transformers ?? []), transformerTwoslash()],
		},
	},
});
