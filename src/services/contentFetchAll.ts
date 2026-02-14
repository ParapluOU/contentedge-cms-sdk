import { fetchContentByType } from './contentApi';
import type {
    ContentDto,
    ContentListParams,
    CustomFields,
    PaginatedData,
} from '../types/content';

export interface FetchAllOptions<C extends CustomFields, T> {
    /**
     * Optional function to transform each content item
     */
    mapItem?: (item: ContentDto<C>) => T;
    
    /**
     * Optional function to extract a unique key for deduplication
     */
    dedupeBy?: (item: T) => string | number;
    
    /**
     * Maximum number of pages to fetch (safety limit)
     * @default 20
     */
    hardStopMaxPages?: number;
}

/**
 * Fetch all content items across multiple pages with automatic pagination
 * 
 * This function will continue fetching pages until:
 * - No more items are returned
 * - The last page is reached (based on pagination metadata)
 * - The hard stop limit is reached
 * - No new items are added (all items are duplicates)
 * 
 * @param params - Content list parameters (without page number)
 * @param options - Fetch options including mapping and deduplication
 * @returns Array of all fetched items
 */
export async function fetchAllContent<
    C extends CustomFields = CustomFields,
    T = ContentDto<C>
>(
    params: Omit<ContentListParams, 'page'> & { page?: never },
    options: FetchAllOptions<C, T> = {}
): Promise<T[]> {
    const size = params.size ?? 100;
    const sortBy = params.sortBy ?? 'id';
    const direction = params.direction ?? 'DESC';
    
    const mapItem = options.mapItem ?? ((item: ContentDto<C>) => item as unknown as T);
    const dedupeBy = options.dedupeBy ?? ((item: T) => (item as { id: string | number }).id);
    const hardStopMaxPages = options.hardStopMaxPages ?? 20;

    let page = 0;
    const dedupMap = new Map<string | number, T>();

    for (let i = 0; i < hardStopMaxPages; i++) {
        const response = await fetchContentByType<C>({
            ...params,
            page,
            size,
            sortBy,
            direction,
        });

        const data = response?.data as PaginatedData<ContentDto<C>> | undefined;
        if (!data) break;

        const items = data.content ?? [];
        if (items.length === 0) break;

        // Process and deduplicate items
        let addedThisPage = 0;
        for (const item of items) {
            const mapped = mapItem(item);
            const key = dedupeBy(mapped);
            if (!dedupMap.has(key)) {
                dedupMap.set(key, mapped);
                addedThisPage++;
            }
        }

        // Stop if no new items were added (all duplicates)
        if (addedThisPage === 0) break;

        // Determine if there are more pages
        const current = typeof data.number === 'number' ? data.number : page;
        const pageSize = typeof data.size === 'number' ? data.size : size;
        const numberOfElements =
            typeof data.numberOfElements === 'number' ? data.numberOfElements : items.length;

        const hasNext =
            typeof data.totalPages === 'number'
                ? current + 1 < data.totalPages
                : typeof data.totalElements === 'number'
                ? current * pageSize + numberOfElements < data.totalElements
                : typeof data.last === 'boolean'
                ? !data.last
                : numberOfElements === pageSize;

        if (!hasNext) break;
        page = current + 1;
    }

    return Array.from(dedupMap.values());
}
