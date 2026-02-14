import axios from 'axios';
import { getApiClient } from './apiClient';
import { getConfig } from '../config/sdkConfig';
import type {
    ApiResponse,
    ContentDto,
    ContentListParams,
    ContentResponse,
    CustomFields,
} from '../types/content';

/**
 * Fetch content by type with pagination and filters
 */
export async function fetchContentByType<C extends CustomFields = CustomFields>(
    params: ContentListParams = {}
): Promise<ContentResponse<C>> {
    const client = getApiClient();
    
    // Sanitize and validate inputs
    const type = encodeURIComponent(params.type ?? 'ALL');
    const page = Number.isInteger(params.page) && (params.page as number) >= 0 ? params.page : 0;
    const size = Number.isInteger(params.size) && (params.size as number) > 0 && (params.size as number) <= 1000
        ? params.size
        : 10;

    // Build query parameters
    const queryParams = new URLSearchParams({
        page: String(page),
        size: String(size),
        sortBy: params.sortBy ?? 'id',
        direction: params.direction ?? 'DESC',
    });

    // Add arbitrary filters
    if (params.filters) {
        for (const [key, value] of Object.entries(params.filters)) {
            if (value === undefined || value === null) continue;
            queryParams.append(key, String(value));
        }
    }

    const url = `/content/type/${type}?${queryParams.toString()}`;
    const response = await client.get<ContentResponse<C>>(url);
    return response.data;
}

/**
 * Fetch a single content item by ID
 */
export async function fetchContentById<C extends CustomFields = CustomFields>(
    id: number
): Promise<ApiResponse<ContentDto<C>>> {
    const client = getApiClient();
    const response = await client.get<ApiResponse<ContentDto<C>>>(`/content/${id}`);
    return response.data;
}

/**
 * Download a file from a given path
 * @param path - Full URL or relative path to the file
 * @returns Blob containing the file data
 */
export async function downloadFile(path: string): Promise<Blob> {
    const config = getConfig();
    const lower = path.toLowerCase();
    const api = (config.baseUrl || '').toLowerCase();
    const file = (config.fileBaseUrl || '').toLowerCase();
    
    // Check if this is a CMS-hosted file
    const isCmsFile = (api && lower.startsWith(api)) || (file && lower.startsWith(file));

    if (isCmsFile) {
        // Use authenticated client for CMS files
        const client = getApiClient();
        const response = await client.get(path, { responseType: 'blob' });
        return response.data as Blob;
    }
    
    // For external files, use axios directly without auth headers
    const response = await axios.get(path, { responseType: 'blob' });
    return response.data as Blob;
}
