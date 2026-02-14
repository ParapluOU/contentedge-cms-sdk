import { queryOptions } from '@tanstack/react-query';
import { fetchContentByType, fetchContentById } from '../services/contentApi';
import { fetchAllContent, type FetchAllOptions } from '../services/contentFetchAll';
import { contentKeys } from './queryKeys';
import type {
    ContentDto,
    ContentListParams,
    CustomFields,
} from '../types/content';

/**
 * Query options factory for content queries
 * Use with TanStack Query's useQuery hook
 */
export const contentQueries = {
    /**
     * Query options for paginated content list
     * @param params - List parameters including type, pagination, filters
     */
    list: <C extends CustomFields = CustomFields>(params: ContentListParams = {}) =>
        queryOptions({
            queryKey: contentKeys.list(params.type, params),
            queryFn: () => fetchContentByType<C>(params),
            staleTime: 5 * 60_000, // 5 minutes
            gcTime: 10 * 60_000, // 10 minutes (formerly cacheTime)
        }),

    /**
     * Query options for a single content item by ID
     * @param id - Content item ID
     */
    detail: <C extends CustomFields = CustomFields>(id: number) =>
        queryOptions({
            queryKey: contentKeys.detail(id),
            queryFn: () => fetchContentById<C>(id),
            staleTime: 10 * 60_000, // 10 minutes
            gcTime: 30 * 60_000, // 30 minutes
        }),

    /**
     * Query options for fetching all content items (across all pages)
     * @param params - List parameters (without page)
     * @param options - Fetch options including mapping and deduplication
     */
    listAll: <C extends CustomFields = CustomFields, T = ContentDto<C>>(
        params: Omit<ContentListParams, 'page'> & { page?: never },
        options: FetchAllOptions<C, T> = {}
    ) =>
        queryOptions({
            queryKey: contentKeys.allList(params.type, params),
            queryFn: () => fetchAllContent<C, T>(params, options),
            staleTime: 5 * 60_000, // 5 minutes
            gcTime: 10 * 60_000, // 10 minutes
        }),
};
