import { defineConfig } from 'tsdown';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    external: ['axios', '@tanstack/react-query'],
    sourcemap: true,
    minify: true,
    treeshake: true,
    // target auto-reads from package.json engines.node
    // clean enabled by default
    // dts enabled by default (auto-detected from package.json types field)
    // outDir defaults to 'dist'
});
