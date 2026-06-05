// @ts-nocheck
/// <reference types="vite/client" />
import { dynamic } from 'fumadocs-mdx/runtime/dynamic';
import * as Config from '../source.config';

const create = await dynamic<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
} & {
  DocData: {
    docs: {
      /**
       * Last modified date of document file, obtained from version control.
       *
       */
      lastModified?: Date;
    },
  }
}>(Config, {"configPath":"/Users/damianricobelli/Desktop/dev/stepperize/apps/docs/source.config.ts","environment":"vite","outDir":"/Users/damianricobelli/Desktop/dev/stepperize/apps/docs/.source"}, {"doc":{"passthroughs":["extractedReferences","lastModified"]}});