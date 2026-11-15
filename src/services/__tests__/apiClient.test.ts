import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createApiClient, getApiClient, resetApiClient, apiClient, combineSignals } from '../apiClient';
import { resetConfig } from '../../config/sdkConfig';
import { CmsError } from '../../errors/CmsError';

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
    return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        ...init,
    });
}

/** A fetch stub that never resolves until its signal aborts. */
function hangingFetch() {
    return vi.fn((_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(init.signal!.reason), { once: true });
        })
    );
}

describe('apiClient', () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        resetApiClient();
        resetConfig();
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    describe('createApiClient', () => {
        it('sends base URL, JSON and auth headers', async () => {
            const client = createApiClient({
                baseUrl: 'https://cms.example.com/api',
                apiKey: 'test-key',
                tenant: 'test-tenant',
            });

            const body = await client.get<{ ok: boolean }>('/content/1');

            expect(body).toEqual({ ok: true });
            const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
            expect(url).toBe('https://cms.example.com/api/content/1');
            expect(init.method).toBe('GET');
            expect(init.headers).toMatchObject({
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-API-Key': 'test-key',
                'X-Tenant': 'test-tenant',
            });
        });

        it('omits auth headers when not configured', async () => {
            const client = createApiClient({ baseUrl: 'https://cms.example.com/api' });
            await client.get('/x');

            const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
            expect(headers).not.toHaveProperty('X-API-Key');
            expect(headers).not.toHaveProperty('X-Tenant');
        });

        it('strips trailing slashes from baseUrl and joins paths without a leading slash', async () => {
            const client = createApiClient({ baseUrl: 'https://cms.example.com/api/' });
            await client.get('content/1');

            expect(fetchMock.mock.calls[0][0]).toBe('https://cms.example.com/api/content/1');
        });

        it('uses absolute URLs as-is', async () => {
            const client = createApiClient({ baseUrl: 'https://cms.example.com/api' });
            await client.get('https://files.example.com/a.pdf');

            expect(fetchMock.mock.calls[0][0]).toBe('https://files.example.com/a.pdf');
        });

        it('appends params and skips null/undefined values', async () => {
            const client = createApiClient({ baseUrl: 'https://cms.example.com/api' });
            await client.get('/x?a=1', { params: { b: 2, c: undefined, d: null, e: 'z z' } });

            expect(fetchMock.mock.calls[0][0]).toBe('https://cms.example.com/api/x?a=1&b=2&e=z+z');
        });

        it('returns undefined for empty bodies and raw text for non-JSON bodies', async () => {
            const client = createApiClient({ baseUrl: 'https://cms.example.com/api' });

            fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
            await expect(client.get('/empty')).resolves.toBeUndefined();

            fetchMock.mockResolvedValueOnce(new Response('plain text', { status: 200 }));
            await expect(client.get('/text')).resolves.toBe('plain text');
        });

        it('returns a Blob for responseType blob', async () => {
            const client = createApiClient({ baseUrl: 'https://cms.example.com/api' });
            fetchMock.mockResolvedValueOnce(new Response(new Blob(['abc'], { type: 'application/pdf' })));

            const blob = await client.get<Blob>('/file', { responseType: 'blob' });

            expect(blob).toBeInstanceOf(Blob);
            expect(await blob.text()).toBe('abc');
        });
    });

    describe('error mapping', () => {
        it('maps non-ok JSON responses to CmsError with status and data', async () => {
            const logger = { error: vi.fn() };
            const client = createApiClient({ baseUrl: 'https://cms.example.com/api', logger });
            fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'nope' }, { status: 404 }));

            const error = await client.get('/missing').catch((e: unknown) => e);

            expect(error).toBeInstanceOf(CmsError);
            expect((error as CmsError).message).toBe('CMS request failed (404)');
            expect((error as CmsError).status).toBe(404);
            expect((error as CmsError).data).toEqual({ message: 'nope' });
            expect(logger.error).toHaveBeenCalledWith(
                'API request failed (404): Resource not found',
                { status: 404, data: { message: 'nope' }, url: 'https://cms.example.com/api/missing' }
            );
        });

        it('handles non-JSON and empty error bodies', async () => {
            const client = createApiClient({ baseUrl: 'https://cms.example.com/api' });

            fetchMock.mockResolvedValueOnce(new Response('<html>bad gateway</html>', { status: 502 }));
            const htmlError = (await client.get('/x').catch((e: unknown) => e)) as CmsError;
            expect(htmlError.status).toBe(502);
            expect(htmlError.data).toBe('<html>bad gateway</html>');

            fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));
            const emptyError = (await client.get('/x').catch((e: unknown) => e)) as CmsError;
            expect(emptyError.status).toBe(401);
            expect(emptyError.data).toBeUndefined();
        });

        it('wraps network errors in CmsError without a status', async () => {
            const client = createApiClient({ baseUrl: 'https://cms.example.com/api' });
            const networkError = new TypeError('fetch failed');
            fetchMock.mockRejectedValueOnce(networkError);

            const error = (await client.get('/x').catch((e: unknown) => e)) as CmsError;

            expect(error).toBeInstanceOf(CmsError);
            expect(error.message).toBe('CMS request failed');
            expect(error.status).toBeUndefined();
            expect(error.cause).toBe(networkError);
        });
    });

    describe('timeout and abort', () => {
        it('aborts after the configured timeout', async () => {
            vi.stubGlobal('fetch', hangingFetch());
            const client = createApiClient({ baseUrl: 'https://cms.example.com/api', timeoutMs: 20 });

            const error = (await client.get('/slow').catch((e: unknown) => e)) as CmsError;

            expect(error).toBeInstanceOf(CmsError);
            expect((error.cause as DOMException).name).toBe('TimeoutError');
        });

        it('defaults the timeout to 30s', async () => {
            const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
            const client = createApiClient({ baseUrl: 'https://cms.example.com/api' });
            await client.get('/x');

            expect(timeoutSpy).toHaveBeenCalledWith(30_000);
            timeoutSpy.mockRestore();
        });

        it('honours a caller-provided signal', async () => {
            vi.stubGlobal('fetch', hangingFetch());
            const client = createApiClient({ baseUrl: 'https://cms.example.com/api' });
            const controller = new AbortController();

            const pending = client.get('/slow', { signal: controller.signal }).catch((e: unknown) => e);
            controller.abort();
            const error = (await pending) as CmsError;

            expect(error).toBeInstanceOf(CmsError);
            expect((error.cause as DOMException).name).toBe('AbortError');
        });
    });

    describe('combineSignals', () => {
        it('falls back to a manual controller when AbortSignal.any is missing', () => {
            const original = AbortSignal.any;
            // @ts-expect-error simulate an older runtime
            AbortSignal.any = undefined;
            try {
                const controller = new AbortController();
                const combined = combineSignals(controller.signal, 60_000)!;
                expect(combined.aborted).toBe(false);
                controller.abort('stop');
                expect(combined.aborted).toBe(true);
                expect(combined.reason).toBe('stop');
            } finally {
                AbortSignal.any = original;
            }
        });

        it('returns an already-aborted signal when an input is aborted (fallback)', () => {
            const original = AbortSignal.any;
            // @ts-expect-error simulate an older runtime
            AbortSignal.any = undefined;
            try {
                const combined = combineSignals(AbortSignal.abort('gone'), 60_000)!;
                expect(combined.aborted).toBe(true);
            } finally {
                AbortSignal.any = original;
            }
        });

        it('returns undefined when there is nothing to combine', () => {
            expect(combineSignals(undefined, 0)).toBeUndefined();
        });
    });

    describe('getApiClient', () => {
        it('returns the created client', () => {
            const created = createApiClient({ baseUrl: 'https://cms.example.com/api' });
            expect(getApiClient()).toBe(created);
        });

        it('throws when not initialized', () => {
            expect(() => getApiClient()).toThrow('API client not initialized');
        });
    });

    describe('apiClient', () => {
        it('delegates to the current client instance', async () => {
            createApiClient({ baseUrl: 'https://cms.example.com/api' });
            await expect(apiClient.get('/x')).resolves.toEqual({ ok: true });
            expect(fetchMock.mock.calls[0][0]).toBe('https://cms.example.com/api/x');
        });

        it('rejects when not initialized', async () => {
            await expect(apiClient.get('/x')).rejects.toThrow('API client not initialized');
        });
    });
});
