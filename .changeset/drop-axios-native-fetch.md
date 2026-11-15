---
"@codesocietyou/contentedge-cms-sdk": major
---

Replace axios with native `fetch`. The SDK now has **zero runtime dependencies**: axios and its transitive packages (follow-redirects, form-data, proxy-from-env) are gone, which removes roughly 13 KB gzipped from every site and their audit surface.

Behaviour that stays the same:

- `createApiClient(config)` takes the same `SdkConfig`; base URL joining, `Accept`/`Content-Type` headers, `X-Tenant`/`X-API-Key` headers and the `timeoutMs` timeout (default 30s) are unchanged.
- `fetchContentByType`, `fetchContentById`, `fetchAllContent`, `downloadFile` and all React Query helpers have the same signatures and return values. `sortBy`/`direction` are still only sent when you pass them.
- Non-2xx responses still reject with `CmsError` carrying `status` and the response body as `data`, with the same messages and logger output. Empty and non-JSON bodies are handled safely (`data` is `undefined` or the raw text).

Breaking changes:

- `createApiClient()` now returns a small `CmsClient` (`{ get<T>(path, { params, signal, responseType }) }`) instead of an `AxiosInstance`. `getApiClient()` and `apiClient` are kept and return the same `CmsClient`. `get()` resolves to the response **body** (not `{ data }`), and axios-only features such as `defaults`, `interceptors` and `post` no longer exist.
- Network failures, timeouts and aborts reject with `CmsError` (no `status`, original error in `cause`) instead of an axios error. Failed downloads of external (non-CMS) files now also reject with `CmsError`.
- Requires a runtime with global `fetch` and `AbortSignal.timeout` (Node 18+, all modern browsers). `AbortSignal.any` is used when available, with a fallback for older runtimes.

New (additive): `fetchContentByType`, `fetchContentById` and `downloadFile` accept an optional `{ signal }` argument, and `fetchAllContent` accepts `signal` in its options.

Migration: if you only call `createApiClient(config)` and the fetch helpers / hooks, just bump to 3.0.0 — no code changes needed. If you used the returned instance or `getApiClient()` directly, replace `(await client.get(url)).data` with `await client.get(url)` and move any interceptor logic into a `try/catch` around SDK calls.
