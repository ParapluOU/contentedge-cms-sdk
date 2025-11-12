// src/CmsClient.ts
import axios, {type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig, AxiosError } from 'axios';
import type { AuthProvider } from './auth/AuthProvider';
import { CmsError } from './errors/CmsError';
import type {
    ApiResponse,
    ContentDto,
    ContentListParams,
    ContentResponse,
    CustomFields,
    PaginatedData
} from './types/content';
import { buildAssetUrl } from './utils/assetUrl';

export type CmsClientConfig = {
    baseUrl: string;
    fileBaseUrl?: string;
    tenant?: string;
    timeoutMs?: number;
    logger?: { debug?: (...a: unknown[]) => void; warn?: (...a: unknown[]) => void; error?: (...a: unknown[]) => void };
    auth?: AuthProvider;
};

export class CmsClient {
    private readonly http: AxiosInstance;
    private readonly baseUrl: string;
    private readonly fileBaseUrl?: string;
    private readonly logger?: CmsClientConfig['logger'];
    private readonly auth?: AuthProvider;

    constructor(cfg: CmsClientConfig) {
        this.baseUrl = cfg.baseUrl.replace(/\/+$/, '');
        this.fileBaseUrl = cfg.fileBaseUrl?.replace(/\/+$/, '');
        this.logger = cfg.logger;
        this.auth = cfg.auth;

        this.http = axios.create({
            baseURL: this.baseUrl,
            timeout: cfg.timeoutMs ?? 30_000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...(cfg.tenant ? { 'X-Tenant': cfg.tenant } : {})
            }
        });

        this.http.interceptors.request.use(
            async (config: InternalAxiosRequestConfig) => {
                if (this.auth) {
                    try {
                        const token = await this.auth.getAccessToken();
                        if (token) config.headers.Authorization = `Bearer ${token}`;
                    } catch (e) {
                        this.logger?.error?.('Auth token fetch failed', e);
                    }
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        this.http.interceptors.response.use(
            (response: AxiosResponse) => response,
            async (error: AxiosError) => {
                type RetriableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };
                const original = ((error.config ?? {}) as RetriableRequestConfig);
                if (error.response?.status === 401 && this.auth && !original._retry) {
                    original._retry = true;
                    try {
                        const token = await this.auth.getAccessToken({ forceRefresh: true });
                        if (token) {
                            original.headers = { ...(original.headers || {}), Authorization: `Bearer ${token}` };
                            return this.http(original);
                        }
                    } catch (e) {
                        this.logger?.error?.('Forced token refresh failed', e);
                    }
                }
                const status = error.response?.status;
                const data = error.response?.data;
                throw new CmsError(`CMS request failed${status ? ` (${status})` : ''}`, { status, data, cause: error });
            }
        );
    }

    // Generic list by type with arbitrary filters
    async listContent<C extends CustomFields = CustomFields>(
        params: ContentListParams = {}
    ): Promise<ContentResponse<C>> {
        const type = encodeURIComponent(params.type ?? 'ALL');
        const page = Number.isInteger(params.page) && (params.page as number) >= 0 ? params.page : 0;
        const size = Number.isInteger(params.size) && (params.size as number) > 0 ? params.size : 10;

        const usp = new URLSearchParams({
            page: String(page),
            size: String(size),
            sortBy: params.sortBy ?? 'id',
            direction: params.direction ?? 'DESC'
        });

        if (params.filters) {
            for (const [k, v] of Object.entries(params.filters)) {
                if (v === undefined || v === null) continue;
                usp.append(k, String(v));
            }
        }

        const url = `/content/type/${type}?${usp.toString()}`;
        const res = await this.http.get<ContentResponse<C>>(url);
        return res.data;
    }

    async getContentById<C extends CustomFields = CustomFields>(
        id: number
    ): Promise<ApiResponse<ContentDto<C>>> {
        const res = await this.http.get<ApiResponse<ContentDto<C>>>(`/content/${id}`);
        return res.data;
    }

    // Fetch-all aggregator (optional mapping + dedupe)
    async listAllContent<C extends CustomFields = CustomFields, T = ContentDto<C>>(
        params: Omit<ContentListParams, 'page'> & { page?: never },
        opts?: {
            mapItem?: (item: ContentDto<C>) => T;
            dedupeBy?: (item: T) => string | number;
            hardStopMaxPages?: number;
        }
    ): Promise<T[]> {
        const size = params.size ?? 100;
        const sortBy = params.sortBy ?? 'id';
        const direction = params.direction ?? 'DESC';
        const mapItem = opts?.mapItem ?? ((i) => i as unknown as T);
        const dedupeBy = opts?.dedupeBy ?? ((i: T) => (i as { id: string | number }).id);
        const hardStopMaxPages = opts?.hardStopMaxPages ?? 20;

        let page = 0;
        const dedup = new Map<string | number, T>();

        for (let i = 0; i < hardStopMaxPages; i++) {
            const res = await this.listContent<C>({ ...params, page, size, sortBy, direction });
            const data = res?.data as PaginatedData<ContentDto<C>> | undefined;
            if (!data) break;

            const items = data.content ?? [];
            if (items.length === 0) break;

            let addedThisPage = 0;
            for (const item of items) {
                const mapped = mapItem(item);
                const key = dedupeBy(mapped);
                if (!dedup.has(key)) {
                    dedup.set(key, mapped);
                    addedThisPage++;
                }
            }
            if (addedThisPage === 0) break;

            const current = typeof data.number === 'number' ? data.number : page;
            const pageSize = typeof data.size === 'number' ? data.size : size;
            const numberOfElements = typeof data.numberOfElements === 'number' ? data.numberOfElements : items.length;

            const hasNext =
                typeof data.totalPages === 'number' ? (current + 1 < data.totalPages)
                    : typeof data.totalElements === 'number' ? ((current * pageSize + numberOfElements) < data.totalElements)
                        : typeof data.last === 'boolean' ? !data.last
                            : (numberOfElements === pageSize);

            if (!hasNext) break;
            page = current + 1;
        }

        return Array.from(dedup.values());
    }

    buildAssetUrl(path?: string | null): string {
        return buildAssetUrl(path, { apiBase: this.baseUrl, fileBase: this.fileBaseUrl });
    }

    async downloadFile(path: string): Promise<Blob> {
        const lower = path.toLowerCase();
        const api = (this.baseUrl || '').toLowerCase();
        const file = (this.fileBaseUrl || '').toLowerCase();
        const isCms = (api && lower.startsWith(api)) || (file && lower.startsWith(file));

        if (isCms) {
            const res = await this.http.get(path, { responseType: 'blob' });
            return res.data as Blob;
        }
        const res = await axios.get(path, { responseType: 'blob' });
        return res.data as Blob;
    }
}