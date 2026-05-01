# Changelog

## 1.0.7

### Patch Changes

- Add CSS export: `src/styles/richText.css` is now built to `dist/styles.css` and exposed via
  `exports["./styles.css"]`. Consumers can import it once in their app entry point:
  `import '@codesocietyou/contentedge-cms-sdk/styles.css'`
  This provides display rules for `.tiptap-bullet-list`, `.tiptap-ordered-list`, and `.tiptap-link`
  — the classes emitted by ContentEdge's TipTap editor — ensuring stored HTML renders correctly in
  any framework that resets default list styles (e.g. Tailwind Preflight).
- `sideEffects` updated from `false` to `["./dist/styles.css"]` so bundlers do not tree-shake the stylesheet.
- `build` script extended with a `copy-css` step to copy the CSS source into `dist/`.

## 1.0.6

### Patch Changes

- Fix Vite build error: `module` and `exports.import.default` were pointing to `./dist/index.js`
  which `tsdown 0.21` no longer generates. Corrected to `./dist/index.mjs`.
  All four package entry points (`index.cjs`, `index.mjs`, `index.d.cts`, `index.d.mts`) are
  now verified to exist after every build via `prepublishOnly`.

## 1.0.5

### Patch Changes

- Fix TypeScript `TS2307` error: update `package.json` type declaration paths from `index.d.ts` (non-existent)
  to `index.d.mts` (ESM) and `index.d.cts` (CJS), matching what `tsdown 0.21` actually generates.
  Uses condition-based `exports` so both ESM and CJS consumers get the correct declarations.

## 1.0.4

### Patch Changes

- Fix: add `prepublishOnly: "npm run build"` so `dist/` is always built before `npm publish`.
  - 1.0.3 was published without the `dist` folder (package had no compiled artifacts).
  - 1.0.4 is the corrected re-publish of the same changes.

## 1.0.3

### Patch Changes

- Add `stripHtmlTags` and `isHtmlContent` utilities in `utils/richText`.
  - `stripHtmlTags(html)`: regex-based HTML stripper, safe in Node/SSR/edge environments (no DOM dependency).
  - `isHtmlContent(value)`: detects TipTap-generated HTML without false-positives on plain-text angle brackets.
  - Both are exported from the package root.
- Upgrade all dev dependencies to latest (`vitest` 4.1.5, `typescript` 6, `vite` 8, `tsdown` 0.21.10, `typescript-eslint` 8.59.1, etc.).
- Fix GitHub Actions Node.js 20 deprecation: pin `actions/checkout@v4.2.2` and `actions/setup-node@v4.4.0`.
- Fix `tsdown.config.ts` for `tsdown` 0.21: migrate `external` → `deps.neverBundle`, add `dts: { build: true }` for project references.

## 1.0.1

### Patch Changes

- 45cead6: Re-publish with compiled dist artifacts included.

## 1.0.0

### Major Changes

- f802b0f: Major modernization release with breaking changes:

  - BREAKING: Removed Keycloak authentication in favor of public API key auth
  - BREAKING: Removed CmsClient class, replaced with service layer pattern
  - BREAKING: Changed initialization to createApiClient() function
  - BREAKING: Restructured exports (service/query separation)
  - Security: Updated axios 1.7.7 → 1.13.3 (fixes 2 severe CVEs: SSRF + Resource Allocation)
  - Feature: Added React Query integration layer with queryOptions factory
  - Feature: Added normalization utilities for content transformation
  - Feature: Added runtime configuration with validation
  - Modernization: Migrated from tsup to tsdown bundler (49% faster builds)
  - Modernization: Upgraded to ESLint 10 with typescript-eslint canary for latest compatibility
  - Update: Node.js requirement now >=24.13.1 (latest LTS)
  - Update: @tanstack/react-query 5.0.0 → 5.90.21 (90 minor versions of improvements)
  - Update: All dev dependencies to latest versions
  - Tests: Comprehensive test suite with 31 passing tests
  - Build: Verified CJS + ESM + TypeScript declarations working

## 0.2.2

### Patch Changes

- 6e69b66: Initial public release.

## 0.2.1

### Minor Changes

- 872a6ec: Initial release of the ContentEdge CMS SDK.

All notable changes to this project will be documented here by Changesets.

This file is intentionally present so automated release tooling can append entries.
