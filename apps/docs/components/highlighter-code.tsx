import { createStyleTransformer } from "fumadocs-core/server";
import { transformerTwoslash } from "fumadocs-twoslash";
import { Popup, PopupContent, PopupTrigger } from "fumadocs-twoslash/ui";
import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { bundledLanguages, getSingletonHighlighter } from "shiki";

export async function Code({
  code,
  lang = "ts",
}: {
  lang?: string;
  code: string;
}) {
  const highlighter = await getSingletonHighlighter({
    langs: Object.keys(bundledLanguages),
    themes: ["github-light-high-contrast", "github-dark-high-contrast"],
  });

  const hast = highlighter.codeToHast(code, {
    lang,
    themes: {
      light: "github-light-high-contrast",
      dark: "github-dark-high-contrast",
    },
    defaultColor: false,
    transformers: [
      createStyleTransformer(),
      transformerTwoslash({
        explicitTrigger: false,
      }),
    ],
  });

  const rendered = toJsxRuntime(hast, {
    Fragment,
    jsx,
    jsxs,
    development: false,
    components: {
      pre: (props) => (
        <CodeBlock {...props}>
          <Pre>{props.children}</Pre>
        </CodeBlock>
      ),
      Popup,
      PopupContent,
      PopupTrigger,
    },
  });
  return rendered;
}
