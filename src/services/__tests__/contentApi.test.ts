import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchContentByType, fetchContentById, downloadFile } from '../contentApi';
import { createApiClient, resetApiClient } from '../apiClient';
import { resetConfig } from '../../config/sdkConfig';
import { CmsError } from '../../errors/CmsError';
import type { ContentResponse } from '../../types/content';

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function emptyListResponse(): ContentResponse {
    return {
        status: 'SUCCESS',
        message: '',
        data: { content: [] },
    };
}

function lastRequest(fetchMock: ReturnType<typeof vi.fn>): { url: URL; init: RequestInit } {
    const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
    return { url: new URL(url), init: init ?? {} };
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
    fetchMock = vi.fn().mockImplementation(async () => jsonResponse(emptyListResponse()));
    vi.stubGlobal('fetch', fetchMock);
    createApiClient({
        baseUrl: 'https://cms.example.com/api',
        fileBaseUrl: 'https://files.example.com',
        apiKey: 'secret',
        tenant: 'acme',
    });
});

afterEach(() => {
    resetApiClient();
    resetConfig();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('fetchContentByType', () => {
    it('omits sortBy and direction by default', async () => {
        await fetchContentByType({ type: 'NEWS', page: 0, size: 10 });

        const { url } = lastRequest(fetchMock);
        expect(url.origin + url.pathname).toBe('https://cms.example.com/api/content/type/NEWS');
        expect(url.searchParams.get('page')).toBe('0');
        expect(url.searchParams.get('size')).toBe('10');
        expect(url.searchParams.has('sortBy')).toBe(false);
        expect(url.searchParams.has('direction')).toBe(false);
    });

    it('sends sortBy=id when the caller opts into id order', async () => {
        await fetchContentByType({ type: 'NEWS', page: 0, size: 10, sortBy: 'id' });

        const { url } = lastRequest(fetchMock);
        expect(url.searchParams.get('sortBy')).toBe('id');
        expect(url.searchParams.has('direction')).toBe(false);
    });

    it('sends sortBy=sortOrder and direction when provided', async () => {
        await fetchContentByType({
            type: 'NEWS',
            page: 0,
            size: 10,
            sortBy: 'sortOrder',
            direction: 'ASC',
        });

        const { url } = lastRequest(fetchMock);
        expect(url.searchParams.get('sortBy')).toBe('sortOrder');
        expect(url.searchParams.get('direction')).toBe('ASC');
    });

    it('appends filters and skips null/undefined values', async () => {
        await fetchContentByType({
            type: 'NEWS',
            filters: { category: 'tech news', featured: true, empty: null, missing: undefined },
        });

        const { url } = lastRequest(fetchMock);
        expect(url.searchParams.get('category')).toBe('tech news');
        expect(url.searchParams.get('featured')).toBe('true');
        expect(url.searchParams.has('empty')).toBe(false);
        expect(url.searchParams.has('missing')).toBe(false);
    });

    it('falls back to defaults for invalid page/size and encodes the type', async () => {
        await fetchContentByType({ type: 'A/B', page: -1, size: 5000 });

        const { url } = lastRequest(fetchMock);
        expect(url.pathname).toBe('/api/content/type/A%2FB');
        expect(url.searchParams.get('page')).toBe('0');
        expect(url.searchParams.get('size')).toBe('10');
    });

    it('exposes sortOrder from the API payload', async () => {
        const payload: ContentResponse = {
            status: 'SUCCESS',
            message: '',
            data: {
                content: [{
                    id: 1,
                    title: 'A',
                    text: 't',
                    type: 'NEWS',
                    sortOrder: 3,
                    customFields: {},
                }],
            },
        };
        fetchMock.mockResolvedValueOnce(jsonResponse(payload));

        const result = await fetchContentByType({ type: 'NEWS', page: 0, size: 10 });

        expect(result.data.content[0].sortOrder).toBe(3);
    });

    it('passes the caller signal through', async () => {
        const controller = new AbortController();
        await fetchContentByType({ type: 'NEWS' }, { signal: controller.signal });

        const { init } = lastRequest(fetchMock);
        expect(init.signal).toBeInstanceOf(AbortSignal);
        controller.abort();
        expect(init.signal!.aborted).toBe(true);
    });

    it('rejects with CmsError on non-ok responses', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'boom' }, 500));

        const error = await fetchContentByType({ type: 'NEWS' }).catch((e: unknown) => e);

        expect(error).toBeInstanceOf(CmsError);
        expect((error as CmsError).status).toBe(500);
        expect((error as CmsError).data).toEqual({ message: 'boom' });
    });
});

describe('fetchContentById', () => {
    it('requests the item by id and returns the body', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse({ status: 'SUCCESS', message: '', data: { id: 7 } }));

        const result = await fetchContentById(7);

        expect(lastRequest(fetchMock).url.href).toBe('https://cms.example.com/api/content/7');
        expect(result.data).toEqual({ id: 7 });
    });
});

describe('downloadFile', () => {
    it('fetches CMS files with auth headers and returns a Blob', async () => {
        fetchMock.mockResolvedValueOnce(new Response(new Blob(['pdf'])));

        const blob = await downloadFile('https://files.example.com/docs/a.pdf');

        const { url, init } = lastRequest(fetchMock);
        expect(url.href).toBe('https://files.example.com/docs/a.pdf');
        expect(init.headers).toMatchObject({ 'X-API-Key': 'secret', 'X-Tenant': 'acme' });
        expect(blob).toBeInstanceOf(Blob);
        expect(await blob.text()).toBe('pdf');
    });

    it('fetches external files without auth headers and returns a Blob', async () => {
        fetchMock.mockResolvedValueOnce(new Response(new Blob(['img'])));

        const blob = await downloadFile('https://other-cdn.example.org/img.png');

        const { url, init } = lastRequest(fetchMock);
        expect(url.href).toBe('https://other-cdn.example.org/img.png');
        expect(init.headers).toBeUndefined();
        expect(JSON.stringify(init)).not.toContain('secret');
        expect(blob).toBeInstanceOf(Blob);
        expect(await blob.text()).toBe('img');
    });

    it('rejects with CmsError when an external file returns non-ok', async () => {
        fetchMock.mockResolvedValueOnce(new Response('gone', { status: 404 }));

        const error = await downloadFile('https://other-cdn.example.org/missing.png').catch((e: unknown) => e);

        expect(error).toBeInstanceOf(CmsError);
        expect((error as CmsError).status).toBe(404);
    });
});
