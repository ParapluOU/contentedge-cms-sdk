export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type CustomFields = Record<string, JsonValue>;

export interface ContentDto<C extends CustomFields = CustomFields> {
    id: number;
    title: string;
    text: string;
    type: string;          // user-configurable
    customFields: C;       // all user-defined fields (JSONB)
}

export interface ApiResponse<T> {
    status: 'SUCCESS' | 'FAILURE';
    message: string;
    data: T;
}

// Pagination metadata is tolerant (optional) to handle backend variations
export interface PaginatedData<T> {
    content: T[];
    number?: number;
    size?: number;
    numberOfElements?: number;
    totalElements?: number;
    totalPages?: number;
    first?: boolean;
    last?: boolean;
    empty?: boolean;
    sort?: unknown;
    pageable?: unknown;
}

export type ContentResponse<C extends CustomFields = CustomFields> =
    ApiResponse<PaginatedData<ContentDto<C>>>;

export interface ContentListParams {
    type?: string; // if omitted, defaults to 'ALL'
    page?: number;
    size?: number;
    sortBy?: string;
    direction?: 'ASC' | 'DESC';
    // Arbitrary filters (e.g., publicationType, tags, etc.)
    filters?: Record<string, string | number | boolean | null | undefined>;
}

/**
 * Normalized content item with commonly used fields
 * This type is exported for convenience but normalization is handled
 * by the normalizeContentItem function in utils/normalization
 */
export interface NormalizedContentItem {
    id: number;
    title: string;
    text: string;
    type: string;
    insideImage: string;
    outsideImage: string;
    pdfPath: string | null;
    references: string | null;
    citation: string | null;
    abstract: string | null;
    team: string | null;
    publicationType: string | null;
    fake: boolean | null;
}