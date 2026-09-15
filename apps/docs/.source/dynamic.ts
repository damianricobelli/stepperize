// @ts-nocheck
/// <reference types="vite/client" />
import { dynamic } from 'fumadocs-mdx/runtime/dynamic';
import * as Config from '../source.config';

const create = await dynamic<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
    docs: {
      /**
       * Last modified date of document file, obtained from version control.
       */
      lastModified?: Date;
    },
  }
}>(Config, {"environment":"dynamic","root":"","configPath":"source.config.ts","outDir":".source"});