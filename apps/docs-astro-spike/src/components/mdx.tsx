import defaultMdxComponents from 'fumadocs-ui/mdx';
import { DocsBody } from 'fumadocs-ui/layouts/docs/page';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import type { MDXComponents } from 'mdx/types';
import { FrameworkDemo } from '@/components/framework-demo';
import ReactDemo from '@/demos/ReactDemo';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    // registered components hydrate inside the MDX React island
    Tab,
    Tabs,
    FrameworkDemo,
    ReactDemo,
    ...components,
  } satisfies MDXComponents;
}

// for the Fumadocs integration, `wrapper` gives the content its prose styles
export default getMDXComponents({ wrapper: DocsBody });
