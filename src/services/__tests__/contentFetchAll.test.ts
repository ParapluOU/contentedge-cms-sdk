import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchAllContent } from '../contentFetchAll';
import * as contentApi from '../contentApi';
import { createApiClient, resetApiClient } from '../apiClient';
import { resetConfig } from '../../config/sdkConfig';
import type { ContentDto, ContentResponse } from '../../types/content';

function makePage(
    items: ContentDto[],
    page: number,
    totalPages: number
): ContentResponse {
    return {
        status: 'SUCCESS',
        message: '',
        data: {
            content: items,
            number: page,
            size: items.length || 1,
            numberOfElements: items.length,
            totalPages,
        },
    };
}

describe('fetchAllContent', () => {
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

    it('aggregates pages and dedupes by id', async () => {
        const spy = vi.spyOn(contentApi, 'fetchContentByType')
            .mockResolvedValueOnce(makePage([{ id: 1, title: 'A', text: 't', type: 'T', customFields: {} }], 0, 3))
            .mockResolvedValueOnce(makePage([
                { id: 1, title: 'A', text: 't', type: 'T', customFields: {} },
                { id: 2, title: 'B', text: 't', type: 'T', customFields: {} },
            ], 1, 3))
            .mockResolvedValueOnce(makePage([], 2, 3));

        const all = await fetchAllContent({
            type: 'T',
            size: 1,
            sortBy: 'id',
            direction: 'ASC',
        });

        expect(all.map(x => x.id)).toEqual([1, 2]);
        expect(spy).toHaveBeenCalledTimes(3);
    });

    it('stops at hardStopMaxPages', async () => {
        let callCount = 0;
        const spy = vi.spyOn(contentApi, 'fetchContentByType')
            .mockImplementation(async () => {
                const page = callCount++;
                return makePage(
                    [{ id: page, title: 'A', text: 't', type: 'T', customFields: {} }],
                    page,
                    100 // Many pages available
                );
            });

        await fetchAllContent(
            { type: 'T', size: 1 },
            { hardStopMaxPages: 5 }
        );

        expect(spy).toHaveBeenCalledTimes(5);
    });

    it('handles custom mapping', async () => {
        vi.spyOn(contentApi, 'fetchContentByType')
            .mockResolvedValueOnce(makePage([
                { id: 1, title: 'A', text: 't', type: 'T', customFields: {} },
                { id: 2, title: 'B', text: 't', type: 'T', customFields: {} },
            ], 0, 1));

        const all = await fetchAllContent(
            { type: 'T' },
            {
                mapItem: (item) => ({ ...item, mapped: true }),
            }
        );

        expect(all.every(x => 'mapped' in x && x.mapped === true)).toBe(true);
    });

    it('stops when no new items are added (all duplicates)', async () => {
        const spy = vi.spyOn(contentApi, 'fetchContentByType')
            .mockResolvedValueOnce(makePage([{ id: 1, title: 'A', text: 't', type: 'T', customFields: {} }], 0, 3))
            .mockResolvedValueOnce(makePage([{ id: 1, title: 'A', text: 't', type: 'T', customFields: {} }], 1, 3));

        const all = await fetchAllContent({
            type: 'T',
            size: 1,
        });

        expect(all.length).toBe(1);
        expect(spy).toHaveBeenCalledTimes(2);
    });
});
