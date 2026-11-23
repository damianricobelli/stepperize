import { rehypeCodeDefaultOptions } from "fumadocs-core/mdx-plugins";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import lastModified from "fumadocs-mdx/plugins/last-modified";
import { transformerTwoslash } from "fumadocs-twoslash";
import {
  EDIT_SOURCE_EXPORT,
  remarkEditSource,
} from "./src/lib/mdx/editable-source";
import { remarkFrameworkContent } from "./src/lib/mdx/remark-framework-content";

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    postprocess: {
      includeProcessedMarkdown: true,
      valueToExport: [EDIT_SOURCE_EXPORT],
    },
  },
});

export default defineConfig({
  plugins: [lastModified()],
  mdxOptions: {
    // First, right after `<include>` is inlined: a shared page keeps only its framework's code.
    remarkPlugins: (plugins) => [
      remarkEditSource,
      remarkFrameworkContent,
      ...plugins,
    ],
    rehypeCodeOptions: {
      langs: ["js", "jsx", "ts", "tsx"],
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      transformers: [
        ...(rehypeCodeDefaultOptions.transformers ?? []),
        transformerTwoslash(),
      ],
    },
  },
});
