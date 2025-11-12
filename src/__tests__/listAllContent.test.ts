import { describe, it, expect, vi } from 'vitest';
import { CmsClient } from '../CmsClient';
import type { ContentDto, ContentResponse } from '../types/content';

function makePage<C>(items: ContentDto<C>[], page: number, totalPages: number): ContentResponse<C> {
    return {
        status: 'SUCCESS',
        message: '',
        data: {
            content: items,
            number: page,
            size: items.length || 1,
            numberOfElements: items.length,
            totalPages
        }
    };
}

describe('listAllContent', () => {
    it('aggregates pages and dedupes by id', async () => {
        const client = new CmsClient({ baseUrl: 'https://cms.example.com/api' });

        const spy = vi.spyOn(client, 'listContent')
            // page 0
            .mockResolvedValueOnce(makePage([{ id: 1, title: 'A', text: 't', type: 'T', customFields: {} }], 0, 3))
            // page 1 includes dup id:1 and new id:2
            .mockResolvedValueOnce(makePage([
                { id: 1, title: 'A', text: 't', type: 'T', customFields: {} },
                { id: 2, title: 'B', text: 't', type: 'T', customFields: {} }
            ], 1, 3))
            // page 2 empty -> stop
            .mockResolvedValueOnce(makePage([], 2, 3));

        const all = await client.listAllContent({ type: 'T', size: 1, sortBy: 'id', direction: 'ASC' });

        expect(all.map((x: any) => x.id)).toEqual([1, 2]);
        expect(spy).toHaveBeenCalledTimes(3);
    });
});