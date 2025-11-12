## ContentEdge SDK (TypeScript)

A lightweight, framework-agnostic TypeScript client for the ContentEdge headless CMS. It provides a small, typed façade over the HTTP API with pluggable auth, robust pagination helpers, asset/file utilities, and structured errors—without embedding project-specific domain models (e.g., News/Blog/Reports).

This SDK models the wire contract via a generic `ContentDto<C>` where `C` represents your custom fields. It does not import or depend on the CMS server code.

### Features

- Generic content model: `ContentDto<C>` with consumer-defined custom fields
- Pluggable auth strategy: `AuthProvider` (includes Keycloak client-credentials)
- Resilient pagination: `listAllContent` aggregates pages with dedupe and safe stop
- Asset/file helpers: `buildAssetUrl` and safe `downloadFile`
- Structured error model: `CmsError` with status and response data
- Framework-agnostic; optional React Query adapter pattern

### Installation

```bash
npm install @codesocietyou/contentedge-cms-sdk
# or
yarn add @codesocietyou/contentedge-cms-sdk
```

### Quick Start

```ts
import {
  CmsClient,
  KeycloakClientCredentialsAuth,
  type ContentDto
} from '@codesocietyou/contentedge-cms-sdk';

// Auth (Keycloak client-credentials) - server-side only
const auth = new KeycloakClientCredentialsAuth({
  tokenUrl: 'https://auth.example.com/realms/contentedge/protocol/openid-connect/token',
  clientId: 'contentedge-client',
  clientSecret: 'xxxxxx'
});

// Client
const contentedge = new CmsClient({
  baseUrl: 'https://cms.example.com/api',
  fileBaseUrl: 'https://cms.example.com', // optional (asset host)
  tenant: 'your-tenant',                  // optional; sent as X-Tenant
  auth
});

// List content by type with filters/pagination
const list = await contentedge.listContent({
  type: 'REPORT',
  page: 0,
  size: 10,
  sortBy: 'id',
  direction: 'DESC',
  filters: { publicationType: 'GAMEHEARTS' } // arbitrary query params
});

// Get detail by id
const detail = await contentedge.getContentById(123);

// Download a file (Blob in browsers)
const pdf = await contentedge.downloadFile('https://cms.example.com/files/doc.pdf');
```

### API

- Client
  - `new CmsClient(config)`
    - `baseUrl`: CMS API base URL (e.g., `https://cms.example.com/api`)
    - `fileBaseUrl?`: Preferred file/asset base (often origin w/o `/api`)
    - `tenant?`: Adds `X-Tenant` header
    - `timeoutMs?`: Default 30000
    - `logger?`: `{ debug?, warn?, error? }`
    - `auth?`: `AuthProvider`
  - `listContent<C>(params?: ContentListParams): Promise<ContentResponse<C>>`
  - `getContentById<C>(id: number): Promise<ApiResponse<ContentDto<C>>>`
  - `listAllContent<C, T = ContentDto<C>>(params: Omit<ContentListParams, 'page'>, opts?: { mapItem?, dedupeBy?, hardStopMaxPages? }): Promise<T[]>`
  - `buildAssetUrl(path?: string | null): string`
  - `downloadFile(path: string): Promise<Blob>`

- Auth
  - `AuthProvider`: `getAccessToken(opts?: { forceRefresh?: boolean }): Promise<string>`
  - `KeycloakClientCredentialsAuth({ tokenUrl, clientId, clientSecret })`

- Types
  - `ContentDto<C extends Record<string, JsonValue>>`
  - `ApiResponse<T>`
  - `PaginatedData<T>`
  - `ContentResponse<C>`
  - `ContentListParams`:
    - `type?`, `page?`, `size?`, `sortBy?`, `direction?`
    - `filters?`: arbitrary query params

- Errors
  - `CmsError extends Error` with `.status?: number` and `.data?: unknown`

### Mapping to your app models

Keep domain mapping out of the SDK. Define custom fields and a mapper in your app:

```ts
// Your custom fields
type MyCustomFields = {
  title?: string;
  text?: string;
  insideImage?: string;
  outsideImage?: string;
  references?: string | null;
  pdfPath?: string | null;
  citation?: string | null;
  abstract?: string | null;
  team?: string | null;
  publicationType?: 'GAMEHEARTS' | 'EXTERNAL' | null;
  fake?: boolean | null;
};

// Your view model
type NormalizedItem = {
  id: number;
  title: string;
  text: string;
  insideImage: string;
  outsideImage: string;
  references: string | null;
  pdfPath: string | null;
  type: string;
  citation: string | null;
  fake: boolean | null;
  abstract: string | null;
  team: string | null;
  publicationType: 'GAMEHEARTS' | 'EXTERNAL' | null;
};

const mapToNormalized = (item: ContentDto<MyCustomFields>): NormalizedItem => ({
  id: item.id,
  title: item.customFields.title || item.title,
  text: item.customFields.text || item.text,
  insideImage: contentedge.buildAssetUrl(item.customFields.insideImage || ''),
  outsideImage: contentedge.buildAssetUrl(item.customFields.outsideImage || ''),
  references: item.customFields.references ?? null,
  pdfPath: contentedge.buildAssetUrl(item.customFields.pdfPath ?? null),
  type: item.type,
  citation: item.customFields.citation ?? null,
  fake: item.customFields.fake ?? null,
  abstract: item.customFields.abstract ?? null,
  team: item.customFields.team ?? null,
  publicationType: item.customFields.publicationType ?? null
});

// Fetch-all with mapping + dedupe
const items = await contentedge.listAllContent<MyCustomFields, NormalizedItem>(
  { type: 'REPORT', size: 100, sortBy: 'id', direction: 'DESC', filters: { publicationType: 'GAMEHEARTS' } },
  { mapItem: mapToNormalized, dedupeBy: (i) => i.id }
);
```

### React Query (optional pattern)

```ts
import { queryOptions } from '@tanstack/react-query';
import type { ContentListParams, ContentDto } from '@codesocietyou/contentedge-cms-sdk';

export const contentQueries = {
  list: (params: ContentListParams) => queryOptions({
    queryKey: ['content', 'list', params.type ?? 'ALL', params],
    queryFn: () => contentedge.listContent(params),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000
  }),
  detail: (id: number) => queryOptions({
    queryKey: ['content', 'detail', id],
    queryFn: () => contentedge.getContentById(id),
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000
  }),
  listAll: <C, T = ContentDto<C>>(params: Omit<ContentListParams, 'page'>, mapItem: (i: ContentDto<C>) => T) =>
    queryOptions({
      queryKey: ['content', 'all', params.type ?? 'ALL', { ...params, mode: 'all' }],
      queryFn: () => contentedge.listAllContent(params, { mapItem }),
      staleTime: 5 * 60_000,
      gcTime: 10 * 60_000
    })
};
```

### Error handling

```ts
try {
  await contentedge.listContent({ type: 'NEWS' });
} catch (e) {
  if (e instanceof CmsError) {
    console.error('ContentEdge error', e.status, e.data);
  } else {
    console.error('Unknown error', e);
  }
}
```

401s are retried once with a forced token refresh when an `AuthProvider` is provided.

### Security

- `KeycloakClientCredentialsAuth` is intended for server-side usage. Do not expose client secrets in browsers.
- For browsers, you can implement a simple bearer token strategy:

```ts
class BearerTokenAuth implements AuthProvider {
  constructor(private readonly getToken: () => Promise<string> | string) {}
  async getAccessToken() {
    return typeof this.getToken === 'function' ? await this.getToken() : this.getToken;
  }
}
```

- `downloadFile` avoids sending Authorization headers to non-CMS domains.
- Prefer runtime configuration to inject secrets; limit scopes on your Keycloak client.

### Endpoint assumptions

By default, the SDK uses:
- `GET /content/type/:type`
- `GET /content/:id`

If your deployment differs, wrap or extend `CmsClient`.

### Versioning

Semantic Versioning (SemVer). Breaking changes bump MAJOR.

### License

MIT
