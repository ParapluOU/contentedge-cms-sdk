// src/queries/queryKeys.ts
import type { ContentListParams } from '../types/content';

/**
 * Hierarchical query key factory for content queries
 * Following TanStack Query best practices for key structure
 */
export const contentKeys = {
    /**
     * Base key for all content queries
     */
    all: ['content'] as const,
    
    /**
     * Key for all list queries
     */
    lists: () => [...contentKeys.all, 'list'] as const,
    
    /**
     * Key for a specific list query with parameters
     * @param type - Content type (e.g., 'NEWS', 'REPORT')
     * @param params - Additional list parameters
     */
    list: (type: string | undefined, params: ContentListParams) =>
        [...contentKeys.lists(), type ?? 'ALL', params] as const,
    
    /**
     * Key for all detail queries
     */
    details: () => [...contentKeys.all, 'detail'] as const,
    
    /**
     * Key for a specific detail query by ID
     * @param id - Content item ID
     */
    detail: (id: number) => [...contentKeys.details(), id] as const,
    
    /**
     * Key for all "fetch all" queries
     */
    allLists: () => [...contentKeys.all, 'all'] as const,
    
    /**
     * Key for a specific "fetch all" query
     * @param type - Content type
     * @param params - List parameters (without page)
     */
    allList: (type: string | undefined, params: Omit<ContentListParams, 'page'>) =>
        [...contentKeys.allLists(), type ?? 'ALL', { ...params, mode: 'all' }] as const,
};
