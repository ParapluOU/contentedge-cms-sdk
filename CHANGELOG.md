# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-14

### 🎉 Major Release - Architecture Transformation

This release represents a complete architectural transformation of the SDK, aligning it with modern best practices and the proven patterns from the GameHearts project.

### ⚠️ Breaking Changes

#### Removed

- **`CmsClient` class**: Replaced with service layer pattern and `createApiClient()` initialization
- **`KeycloakClientCredentialsAuth` class**: Removed OAuth2/Keycloak authentication
- **`AuthProvider` interface**: No longer needed with API key authentication
- **`auth` configuration option**: Use `apiKey` instead

#### Changed

- **Initialization pattern**: Must now call `createApiClient()` before using service functions
- **Import structure**: Services, queries, and utilities are now separate exports
- **API surface**: More modular, tree-shakeable exports

### ✨ Added

#### Service Layer
- `createApiClient()` - Initialize SDK with centralized configuration
- `fetchContentByType()` - Fetch paginated content with filters
- `fetchContentById()` - Fetch single content item
- `fetchAllContent()` - Fetch all content across pages with automatic pagination
- `downloadFile()` - Download files with proper authentication

#### React Query Integration
- `contentQueries` - Query options factory for use with `useQuery`
- `contentKeys` - Hierarchical query key factory for cache management
- `useContentList()` - Hook for paginated content lists
- `useContentDetail()` - Hook for single content items
- `useContentAll()` - Hook for fetching all content
- `useContentPrefetch()` - Utilities for prefetching and cache invalidation

#### Configuration Management
- `SdkConfig` interface - Type-safe configuration
- `setConfig()` / `getConfig()` - Runtime configuration management
- Template string detection for CI/CD environments
- Centralized timeout and header configuration

#### Normalization Utilities
- `normalizeContentItem()` - Transform API responses to normalized structure
- `buildAssetUrlWithConfig()` - Build asset URLs using SDK config
- `NormalizedContentItem` type - Standardized content structure
- Type-aware PDF path resolution (GAMEHEARTS_PUBLICATION, EXTERNAL_PUBLICATION)

#### Testing
- Co-located `__tests__` folders aligned with source structure
- Comprehensive service layer tests
- Query key generation tests
- Normalization utility tests
- Mock helpers for testing SDK consumers

### 🔧 Improved

- **Type Safety**: Enhanced generic types for better inference
- **Error Handling**: Centralized interceptor with structured `CmsError`
- **Documentation**: Complete rewrite with migration guide and examples
- **Tree Shaking**: Modular exports for better bundle optimization
- **Developer Experience**: Cleaner API surface, intuitive patterns

### 📦 Dependencies

- **Added**: `@tanstack/react-query` as optional peer dependency (>= 5.0.0)
- **Kept**: `axios` ^1.7.7

### 📝 Migration Guide

#### Before (v0.2.x)

```typescript
import { CmsClient, KeycloakClientCredentialsAuth } from '@codesocietyou/contentedge-cms-sdk';

const auth = new KeycloakClientCredentialsAuth({
  tokenUrl: 'https://auth.example.com/token',
  clientId: 'client',
  clientSecret: 'secret',
});

const client = new CmsClient({
  baseUrl: 'https://api.example.com',
  auth,
});

const list = await client.listContent({ type: 'NEWS' });
const detail = await client.getContentById(123);
const all = await client.listAllContent({ type: 'NEWS' });
```

#### After (v1.0.0)

```typescript
import { 
  createApiClient, 
  fetchContentByType, 
  fetchContentById,
  fetchAllContent
} from '@codesocietyou/contentedge-cms-sdk';

// Initialize once at app startup
createApiClient({
  baseUrl: 'https://api.example.com',
  apiKey: 'your-api-key',  // Simple API key auth
});

// Use service functions
const list = await fetchContentByType({ type: 'NEWS' });
const detail = await fetchContentById(123);
const all = await fetchAllContent({ type: 'NEWS' });
```

#### React Query Integration (New in v1.0.0)

```typescript
import { useQuery } from '@tanstack/react-query';
import { contentQueries } from '@codesocietyou/contentedge-cms-sdk';

function MyComponent() {
  const { data } = useQuery(contentQueries.list({ type: 'NEWS' }));
  // ...
}
```

### 🏗️ Architecture

The new architecture follows a layered approach:

1. **Configuration Layer**: Runtime config management with validation
2. **Service Layer**: Pure functions for API communication
3. **Query Layer**: React Query integration (optional)
4. **Utils Layer**: Normalization, asset URLs, helpers
5. **Types Layer**: TypeScript interfaces and type definitions

This structure provides:
- Clear separation of concerns
- Framework-agnostic core
- Optional React integration
- Excellent testability
- Better tree-shaking

---

## [0.2.2] - 2025-01-15

### Fixed
- Minor type inference improvements

## [0.2.1] - 2025-01-10

### Fixed
- Asset URL building edge cases

## [0.2.0] - 2025-01-05

### Added
- Keycloak client credentials authentication
- Generic content model with custom fields
- Pagination helpers

---

[1.0.0]: https://github.com/ParapluOU/contentedge-cms-sdk/compare/v0.2.2...v1.0.0
[0.2.2]: https://github.com/ParapluOU/contentedge-cms-sdk/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/ParapluOU/contentedge-cms-sdk/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/ParapluOU/contentedge-cms-sdk/releases/tag/v0.2.0
