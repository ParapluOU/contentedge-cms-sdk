import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    sourcemap: true,
    clean: true,
    dts: true,
    minify: true,
    target: ['es2022'],
    outDir: 'dist',
    treeshake: true,
    external: ['axios'],
    tsconfig: 'tsconfig.build.json'
});

