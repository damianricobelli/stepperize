// source.config.ts
import { rehypeCodeDefaultOptions } from "fumadocs-core/mdx-plugins";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import { transformerTwoslash } from "fumadocs-twoslash";
var { docs, meta } = defineDocs();
var source_config_default = defineConfig({
  generateManifest: true,
  lastModifiedTime: "git",
  mdxOptions: {
    rehypeCodeOptions: {
      inline: "tailing-curly-colon",
      themes: {
        light: "catppuccin-latte",
        dark: "catppuccin-mocha"
      },
      transformers: [...rehypeCodeDefaultOptions.transformers ?? [], transformerTwoslash()]
    }
  }
});
export {
  source_config_default as default,
  docs,
  meta
};
