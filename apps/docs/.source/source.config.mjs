// source.config.ts
import { rehypeCodeDefaultOptions } from "fumadocs-core/mdx-plugins";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import { transformerTwoslash } from "fumadocs-twoslash";
var docs = defineDocs({
  dir: "content/docs"
});
var source_config_default = defineConfig({
  generateManifest: true,
  lastModifiedTime: "git",
  mdxOptions: {
    rehypeCodeOptions: {
      themes: {
        light: "github-light",
        dark: "github-dark"
      },
      transformers: [...rehypeCodeDefaultOptions.transformers ?? [], transformerTwoslash()]
    }
  }
});
export {
  source_config_default as default,
  docs
};
