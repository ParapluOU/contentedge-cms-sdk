import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchContentByType } from '../contentApi';
import { createApiClient, getApiClient, resetApiClient } from '../apiClient';
import { resetConfig } from '../../config/sdkConfig';
import type { ContentResponse } from '../../types/content';

function parseRequestUrl(url: string): { path: string; params: URLSearchParams } {
    const [path, query = ''] = url.split('?');
    return { path, params: new URLSearchParams(query) };
}

function emptyListResponse(): ContentResponse {
    return {
        status: 'SUCCESS',
        message: '',
        data: { content: [] },
    };
}

describe('fetchContentByType', () => {
    beforeEach(() => {
        createApiClient({
            baseUrl: 'https://cms.example.com/api',
        });
    });

    afterEach(() => {
        resetApiClient();
        resetConfig();
        vi.restoreAllMocks();
    });

    it('omits sortBy and direction by default', async () => {
        const getSpy = vi.spyOn(getApiClient(), 'get').mockResolvedValue({ data: emptyListResponse() });

        await fetchContentByType({ type: 'NEWS', page: 0, size: 10 });

        const url = getSpy.mock.calls[0][0] as string;
        const { path, params } = parseRequestUrl(url);

        expect(path).toBe('/content/type/NEWS');
        expect(params.get('page')).toBe('0');
        expect(params.get('size')).toBe('10');
        expect(params.has('sortBy')).toBe(false);
        expect(params.has('direction')).toBe(false);
    });

    it('sends sortBy=id when the caller opts into id order', async () => {
        const getSpy = vi.spyOn(getApiClient(), 'get').mockResolvedValue({ data: emptyListResponse() });

        await fetchContentByType({ type: 'NEWS', page: 0, size: 10, sortBy: 'id' });

        const { params } = parseRequestUrl(getSpy.mock.calls[0][0] as string);
        expect(params.get('sortBy')).toBe('id');
        expect(params.has('direction')).toBe(false);
    });

    it('sends sortBy=sortOrder and direction when provided', async () => {
        const getSpy = vi.spyOn(getApiClient(), 'get').mockResolvedValue({ data: emptyListResponse() });

        await fetchContentByType({
            type: 'NEWS',
            page: 0,
            size: 10,
            sortBy: 'sortOrder',
            direction: 'ASC',
        });

        const { params } = parseRequestUrl(getSpy.mock.calls[0][0] as string);
        expect(params.get('sortBy')).toBe('sortOrder');
        expect(params.get('direction')).toBe('ASC');
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
        vi.spyOn(getApiClient(), 'get').mockResolvedValue({ data: payload });

        const result = await fetchContentByType({ type: 'NEWS', page: 0, size: 10 });

        expect(result.data.content[0].sortOrder).toBe(3);
    });
});
