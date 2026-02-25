# ContentEdge SDK (TypeScript)

A lightweight, framework-agnostic TypeScript client for the ContentEdge headless CMS. It provides a clean, typed interface over the HTTP API with public API key authentication, robust pagination helpers, asset/file utilities, and structured errors—without embedding project-specific domain models.

This SDK models the wire contract via a generic `ContentDto<C>` where `C` represents your custom fields. It does not import or depend on the CMS server code.

> ### Looking for IT services?
> <img src="https://fromulo.com/codesociety.png" align="left" width="80" alt="CodeSociety">
>
> **[CodeSociety](https://codesocietyhub.com/)** is our consulting & contracting arm — specializing in
> **IT architecture**, **XML authoring systems**, **FontoXML integration**, and **TerminusDB consulting**.
> We build structured content platforms and data solutions that power digital publishing.
>
> **[Let's talk! &#8594;](https://codesocietyhub.com/contact.html)**

## Features

- **Generic content model**: `ContentDto<C>` with consumer-defined custom fields
- **Public API key authentication**: Simple header-based authentication
- **Service layer pattern**: Centralized API client with interceptors
- **React Query integration**: Optional query factory and hooks
- **Resilient pagination**: `fetchAllContent` aggregates pages with dedupe and safe stop
- **Asset/file helpers**: `buildAssetUrl` and safe `downloadFile`
- **Normalization utilities**: Transform API responses to normalized structures
- **Structured error model**: `CmsError` with status and response data
- **Framework-agnostic**: Core services work anywhere; React Query layer is optional
- **TypeScript-first**: Full type safety with generics

## Installation

```bash
npm install @codesocietyou/contentedge-cms-sdk
# or
yarn add @codesocietyou/contentedge-cms-sdk
# or
pnpm add @codesocietyou/contentedge-cms-sdk
```

For React Query integration, also install:

```bash
npm install @tanstack/react-query
```

## Quick Start

### 1. Initialize the SDK

```typescript
import { createApiClient } from '@codesocietyou/contentedge-cms-sdk';

// Initialize once at app startup
createApiClient({
  baseUrl: 'https://api.contentedge.com',
  fileBaseUrl: 'https://cdn.contentedge.com', // optional
  apiKey: 'your-api-key',                      // optional
  tenant: 'your-tenant',                       // optional
  timeoutMs: 30_000,                           // optional (default: 30s)
});
```

### 2. Fetch Content (Basic)

```typescript
import { fetchContentByType } from '@codesocietyou/contentedge-cms-sdk';

// Fetch paginated content
const response = await fetchContentByType({
  type: 'NEWS',
  page: 0,
  size: 10,
  sortBy: 'id',
  direction: 'DESC',
  filters: { publicationType: 'GAMEHEARTS' }, // arbitrary filters
});

const items = response.data.content;
```

### 3. Fetch Content (React Query)

```typescript
import { useQuery } from '@tanstack/react-query';
import { contentQueries } from '@codesocietyou/contentedge-cms-sdk';

function NewsList() {
  const { data, isLoading, error } = useQuery(
    contentQueries.list({ type: 'NEWS', page: 0, size: 10 })
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data.data.content.map(item => (
        <li key={item.id}>{item.title}</li>
      ))}
    </ul>
  );
}
```

### 4. Normalization

```typescript
import { 
  normalizeContentItem,
  fetchContentByType 
} from '@codesocietyou/contentedge-cms-sdk';

// Fetch and normalize
const response = await fetchContentByType({ type: 'NEWS' });
const normalized = response.data.content.map(normalizeContentItem);

// normalized items have resolved asset URLs and standardized fields
console.log(normalized[0].insideImage); // "https://cdn.contentedge.com/images/news.jpg"
console.log(normalized[0].pdfPath);     // "https://cdn.contentedge.com/files/doc.pdf"
```

## API Reference

### Configuration

#### `createApiClient(config: SdkConfig): AxiosInstance`

Initialize the SDK with your CMS configuration. Call this once at app startup.

```typescript
interface SdkConfig {
  baseUrl: string;        // CMS API base URL (required)
  fileBaseUrl?: string;   // Preferred file/asset base
  apiKey?: string;        // API key for authentication
  tenant?: string;        // Tenant identifier (sent as X-Tenant header)
  timeoutMs?: number;     // Request timeout (default: 30000)
  logger?: {
    debug?: (...args: unknown[]) => void;
    warn?: (...args: unknown[]) => void;
    error?: (...args: unknown[]) => void;
  };
}
```

### Service Layer

#### `fetchContentByType<C>(params: ContentListParams): Promise<ContentResponse<C>>`

Fetch paginated content by type with filters and sorting.

```typescript
interface ContentListParams {
  type?: string;                    // Content type (default: 'ALL')
  page?: number;                    // Page number (0-indexed)
  size?: number;                    // Items per page
  sortBy?: string;                  // Sort field (default: 'id')
  direction?: 'ASC' | 'DESC';       // Sort direction (default: 'DESC')
  filters?: Record<string, any>;    // Arbitrary query filters
}
```

#### `fetchContentById<C>(id: number): Promise<ApiResponse<ContentDto<C>>>`

Fetch a single content item by ID.

#### `fetchAllContent<C, T>(params, options): Promise<T[]>`

Fetch all content items across multiple pages with automatic pagination.

```typescript
interface FetchAllOptions<C, T> {
  mapItem?: (item: ContentDto<C>) => T;        // Transform each item
  dedupeBy?: (item: T) => string | number;     // Dedupe key extractor
  hardStopMaxPages?: number;                    // Safety limit (default: 20)
}
```

#### `downloadFile(path: string): Promise<Blob>`

Download a file from a given path (with proper authentication for CMS files).

### React Query Integration

#### `contentQueries`

Query options factory for use with `useQuery`:

```typescript
// Paginated list
contentQueries.list({ type: 'NEWS', page: 0, size: 10 })

// Single item
contentQueries.detail(123)

// Fetch all (across pages)
contentQueries.listAll({ type: 'NEWS', size: 100 }, { mapItem: normalizeContentItem })
```

#### Hooks

```typescript
// List hook
const { data } = useContentList({ type: 'NEWS', page: 0, size: 10 });

// Detail hook
const { data } = useContentDetail(123);

// Fetch all hook
const { data } = useContentAll({ type: 'NEWS' });

// Prefetch utilities
const { prefetchList, prefetchDetail, invalidateLists } = useContentPrefetch();
```

#### Query Keys

Hierarchical query key factory for manual cache manipulation:

```typescript
import { contentKeys } from '@codesocietyou/contentedge-cms-sdk';

// Invalidate all lists
queryClient.invalidateQueries({ queryKey: contentKeys.lists() });

// Invalidate specific detail
queryClient.invalidateQueries({ queryKey: contentKeys.detail(123) });
```

### Normalization

#### `normalizeContentItem<C>(item: ContentDto<C>): NormalizedContentItem`

Transform a content item to a normalized structure with resolved asset URLs:

```typescript
interface NormalizedContentItem {
  id: number;
  title: string;
  text: string;
  type: string;
  insideImage: string;      // Resolved URL
  outsideImage: string;     // Resolved URL
  pdfPath: string | null;   // Resolved URL (type-aware)
  references: string | null;
  citation: string | null;
  abstract: string | null;
  team: string | null;
  publicationType: string | null;
  fake: boolean | null;
}
```

#### `buildAssetUrlWithConfig(path?: string | null): string`

Build an asset URL using the SDK's configured base URLs.

### Error Handling

```typescript
import { CmsError } from '@codesocietyou/contentedge-cms-sdk';

try {
  await fetchContentByType({ type: 'NEWS' });
} catch (e) {
  if (e instanceof CmsError) {
    console.error('CMS error:', e.status, e.data);
    // e.status: HTTP status code
    // e.data: Response body (if any)
  } else {
    console.error('Unknown error:', e);
  }
}
```

## Advanced Usage

### Custom Fields Type

Define your own custom fields type for full type safety:

```typescript
interface MyCustomFields {
  title: string;
  text: string;
  author?: string;
  tags?: string[];
  publishedAt?: string;
}

// Use with type parameter
const response = await fetchContentByType<MyCustomFields>({ type: 'ARTICLE' });
const items = response.data.content; // ContentDto<MyCustomFields>[]
```

### Custom Normalization

```typescript
interface MyNormalizedItem {
  id: number;
  title: string;
  author: string;
  tags: string[];
}

function myNormalize(item: ContentDto<MyCustomFields>): MyNormalizedItem {
  return {
    id: item.id,
    title: item.customFields.title || item.title,
    author: item.customFields.author || 'Unknown',
    tags: item.customFields.tags || [],
  };
}

// Use with fetchAllContent
const items = await fetchAllContent<MyCustomFields, MyNormalizedItem>(
  { type: 'ARTICLE', size: 100 },
  { mapItem: myNormalize }
);
```

### React Query Configuration

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createApiClient } from '@codesocietyou/contentedge-cms-sdk';

// Initialize SDK
createApiClient({
  baseUrl: process.env.VITE_API_URL!,
  apiKey: process.env.VITE_API_KEY,
  tenant: 'my-tenant',
});

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// Wrap app
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
    </QueryClientProvider>
  );
}
```

## Migration from v0.2.x

The v1.0.0 release includes breaking changes:

### Removed

- `CmsClient` class → Use service functions + `createApiClient()`
- `KeycloakClientCredentialsAuth` → Use API key authentication
- `AuthProvider` interface → No longer needed

### Migration Steps

**Before (v0.2.x):**

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
```

**After (v1.0.0):**

```typescript
import { 
  createApiClient, 
  fetchContentByType, 
  fetchContentById 
} from '@codesocietyou/contentedge-cms-sdk';

// Initialize once
createApiClient({
  baseUrl: 'https://api.example.com',
  apiKey: 'your-api-key',
});

// Use service functions
const list = await fetchContentByType({ type: 'NEWS' });
const detail = await fetchContentById(123);
```

## Security

- **API Keys**: Store in environment variables, never commit to source control
- **Runtime Configuration**: Inject secrets at runtime in production
- **CORS**: Ensure your CMS API allows requests from your domain
- **Rate Limiting**: The SDK logs 429 errors; implement retry logic if needed

## ContentEdge CMS Endpoints

This SDK is designed specifically for the ContentEdge CMS API. The endpoint paths are fixed as part of the CMS API contract:

- `GET /content/type/:type` - List content by type with pagination
- `GET /content/:id` - Get single content item by ID

### Environment Configuration

The `baseUrl` configuration allows you to connect to different ContentEdge CMS deployments:

**Development:**
```typescript
createApiClient({ baseUrl: 'http://localhost:8080/api' });
```

**Staging:**
```typescript
createApiClient({ baseUrl: 'https://staging-cms.contentedge.com/api' });
```

**Production:**
```typescript
createApiClient({ baseUrl: 'https://cms.contentedge.com/api' });
```

This deployment flexibility is intentional and does not mean the SDK supports different API contracts. All ContentEdge CMS instances use the same endpoint structure.

## Contributing

Contributions are welcome! Please follow the existing code style and add tests for new features.

## Versioning

This project follows [Semantic Versioning](https://semver.org/). Breaking changes bump MAJOR.

## License

MIT

## Support

- Issues: https://github.com/ParapluOU/contentedge-cms-sdk/issues
- Docs: https://github.com/ParapluOU/contentedge-cms-sdk#readme
