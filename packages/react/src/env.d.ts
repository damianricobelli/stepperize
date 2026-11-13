// Bundlers replace `process.env.NODE_ENV`; declare only what the source reads.
declare const process: { env: { NODE_ENV?: string } };
