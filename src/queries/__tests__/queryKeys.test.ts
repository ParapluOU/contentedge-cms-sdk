import { describe, it, expect } from 'vitest';
import { contentKeys } from '../queryKeys';
import type { ContentListParams } from '../../types/content';

describe('queryKeys', () => {
    it('generates base key', () => {
        expect(contentKeys.all).toEqual(['content']);
    });

    it('generates lists key', () => {
        expect(contentKeys.lists()).toEqual(['content', 'list']);
    });

    it('generates list key with type and params', () => {
        const params: ContentListParams = {
            page: 0,
            size: 10,
            sortBy: 'id',
            direction: 'DESC',
        };
        
        const key = contentKeys.list('NEWS', params);
        expect(key).toEqual(['content', 'list', 'NEWS', params]);
    });

    it('generates list key with undefined type', () => {
        const params: ContentListParams = {
            page: 0,
            size: 10,
        };
        
        const key = contentKeys.list(undefined, params);
        expect(key).toEqual(['content', 'list', 'ALL', params]);
    });

    it('generates details key', () => {
        expect(contentKeys.details()).toEqual(['content', 'detail']);
    });

    it('generates detail key with id', () => {
        expect(contentKeys.detail(123)).toEqual(['content', 'detail', 123]);
    });

    it('generates allLists key', () => {
        expect(contentKeys.allLists()).toEqual(['content', 'all']);
    });

    it('generates allList key with params', () => {
        const params = {
            size: 100,
            sortBy: 'id',
            direction: 'ASC' as const,
        };
        
        const key = contentKeys.allList('REPORT', params);
        expect(key).toEqual(['content', 'all', 'REPORT', { ...params, mode: 'all' }]);
    });

    it('maintains type safety with as const assertions', () => {
        const key = contentKeys.all;
        // TypeScript should infer this as readonly ['content']
        expect(key).toEqual(['content']);
    });
});
