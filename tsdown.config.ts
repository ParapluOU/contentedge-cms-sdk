import { defineConfig } from 'tsdown';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    deps: {
        // react-query is an optional peer dep — never bundle it
        neverBundle: ['@tanstack/react-query'],
    },
    dts: {
        // Required when tsconfig.json uses project references
        build: true,
    },
    sourcemap: true,
    minify: true,
    treeshake: true,
});
