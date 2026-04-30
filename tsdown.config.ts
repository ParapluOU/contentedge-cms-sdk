import { defineConfig } from 'tsdown';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    deps: {
        // axios and react-query are peer/runtime deps — never bundle them
        neverBundle: ['axios', '@tanstack/react-query'],
    },
    dts: {
        // Required when tsconfig.json uses project references
        build: true,
    },
    sourcemap: true,
    minify: true,
    treeshake: true,
});
