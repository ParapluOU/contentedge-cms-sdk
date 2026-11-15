import { combineSignals, getApiClient } from './apiClient';
import { CmsError } from '../errors/CmsError';
import { getConfig } from '../config/sdkConfig';
import type {
    ApiResponse,
    ContentDto,
    ContentListParams,
    ContentResponse,
    CustomFields,
} from '../types/content';

export interface FetchOptions {
    /** Abort the request (combined with the configured timeout). */
    signal?: AbortSignal;
}

/**
 * Fetch content by type with pagination and filters
 */
export async function fetchContentByType<C extends CustomFields = CustomFields>(
    params: ContentListParams = {},
    options: FetchOptions = {}
): Promise<ContentResponse<C>> {
    const client = getApiClient();
    
    // Sanitize and validate inputs
    const type = encodeURIComponent(params.type ?? 'ALL');
    const page = Number.isInteger(params.page) && (params.page as number) >= 0 ? params.page : 0;
    const size = Number.isInteger(params.size) && (params.size as number) > 0 && (params.size as number) <= 1000
        ? params.size
        : 10;

    // Build query parameters. Omit sortBy/direction unless the caller passed them
    // so the CMS default (admin display order / sortOrder ASC) applies.
    const queryParams = new URLSearchParams({
        page: String(page),
        size: String(size),
    });

    if (params.sortBy) {
        queryParams.set('sortBy', params.sortBy);
    }
    if (params.direction) {
        queryParams.set('direction', params.direction);
    }

    // Add arbitrary filters
    if (params.filters) {
        for (const [key, value] of Object.entries(params.filters)) {
            if (value === undefined || value === null) continue;
            queryParams.append(key, String(value));
        }
    }

    const url = `/content/type/${type}?${queryParams.toString()}`;
    return client.get<ContentResponse<C>>(url, { signal: options.signal });
}

/**
 * Fetch a single content item by ID
 */
export async function fetchContentById<C extends CustomFields = CustomFields>(
    id: number,
    options: FetchOptions = {}
): Promise<ApiResponse<ContentDto<C>>> {
    const client = getApiClient();
    return client.get<ApiResponse<ContentDto<C>>>(`/content/${id}`, { signal: options.signal });
}

/**
 * Download a file from a given path
 * @param path - Full URL or relative path to the file
 * @returns Blob containing the file data
 */
export async function downloadFile(path: string, options: FetchOptions = {}): Promise<Blob> {
    const config = getConfig();
    const lower = path.toLowerCase();
    const api = (config.baseUrl || '').toLowerCase();
    const file = (config.fileBaseUrl || '').toLowerCase();
    
    // Check if this is a CMS-hosted file
    const isCmsFile = (api && lower.startsWith(api)) || (file && lower.startsWith(file));

    if (isCmsFile) {
        // Use authenticated client for CMS files
        return getApiClient().get<Blob>(path, { responseType: 'blob', signal: options.signal });
    }

    // For external files, use plain fetch without auth headers
    let response: Response;
    try {
        response = await fetch(path, {
            signal: combineSignals(options.signal, config.timeoutMs ?? 30_000),
        });
    } catch (error) {
        throw new CmsError('File download failed', { cause: error });
    }
    if (!response.ok) {
        throw new CmsError(`File download failed (${response.status})`, { status: response.status });
    }
    return response.blob();
}
