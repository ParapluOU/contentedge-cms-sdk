// src/queries/useContentQueries.ts
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { contentQueries } from './contentQueries';
import { contentKeys } from './queryKeys';
import type { FetchAllOptions } from '../services/contentFetchAll';
import type {
    ApiResponse,
    ContentDto,
    ContentListParams,
    ContentResponse,
    CustomFields,
} from '../types/content';

/**
 * Hook for fetching paginated content list
 * @param params - List parameters including type, pagination, filters
 */
export function useContentList<C extends CustomFields = CustomFields>(
    params: ContentListParams = {}
): UseQueryResult<ContentResponse<C>> {
    return useQuery(contentQueries.list<C>(params));
}

/**
 * Hook for fetching a single content item by ID
 * @param id - Content item ID
 */
export function useContentDetail<C extends CustomFields = CustomFields>(
    id: number
): UseQueryResult<ApiResponse<ContentDto<C>>> {
    return useQuery(contentQueries.detail<C>(id));
}

/**
 * Hook for fetching all content items across pages
 * @param params - List parameters (without page)
 * @param options - Fetch options including mapping and deduplication
 */
export function useContentAll<C extends CustomFields = CustomFields, T = ContentDto<C>>(
    params: Omit<ContentListParams, 'page'> & { page?: never },
    options: FetchAllOptions<C, T> = {}
): UseQueryResult<T[]> {
    return useQuery(contentQueries.listAll<C, T>(params, options));
}

/**
 * Hook for prefetching content queries
 * Useful for optimistic navigation and hover effects
 */
export function useContentPrefetch() {
    const queryClient = useQueryClient();

    return {
        /**
         * Prefetch a content list
         */
        prefetchList: <C extends CustomFields = CustomFields>(params: ContentListParams) => {
            return queryClient.prefetchQuery(contentQueries.list<C>(params));
        },

        /**
         * Prefetch a content detail
         */
        prefetchDetail: <C extends CustomFields = CustomFields>(id: number) => {
            return queryClient.prefetchQuery(contentQueries.detail<C>(id));
        },

        /**
         * Invalidate content lists (force refetch)
         */
        invalidateLists: () => {
            return queryClient.invalidateQueries({ queryKey: contentKeys.lists() });
        },

        /**
         * Invalidate a specific content detail
         */
        invalidateDetail: (id: number) => {
            return queryClient.invalidateQueries({ queryKey: contentKeys.detail(id) });
        },

        /**
         * Invalidate all content queries
         */
        invalidateAll: () => {
            return queryClient.invalidateQueries({ queryKey: contentKeys.all });
        },
    };
}
