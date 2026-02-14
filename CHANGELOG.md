# Changelog

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
