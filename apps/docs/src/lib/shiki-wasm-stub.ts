// Stub for `shiki/wasm` (the oniguruma WASM engine).
//
// The Blocks `highlightCode` server fn only ever uses Shiki's JavaScript regex
// engine (`getHighlighter("js", …)`), so the WASM engine factory in
// fumadocs-core/highlight is dead code. Bundling the real `onig.wasm` breaks the
// SSR build, so we alias `shiki/wasm` to this no-op — it's imported lazily and
// never invoked.
export default {};
