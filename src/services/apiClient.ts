import { CmsError } from '../errors/CmsError';
import { getConfig, setConfig, isInitialized } from '../config/sdkConfig';
import type { SdkConfig } from '../types/config';

export type QueryParamValue = string | number | boolean | null | undefined;

export interface CmsRequestOptions {
    /** Query parameters appended to the URL. `null`/`undefined` values are skipped. */
    params?: Record<string, QueryParamValue>;
    /** Caller-provided signal, combined with the configured timeout. */
    signal?: AbortSignal;
    /** How to read the response body. Defaults to `'json'`. */
    responseType?: 'json' | 'blob' | 'text';
}

export interface CmsClient {
    /**
     * Perform a GET request. Relative paths are joined to `baseUrl`; absolute
     * `http(s)://` URLs are used as-is (still with the SDK's auth headers).
     * Resolves to the parsed response body.
     */
    get<T = unknown>(path: string, options?: CmsRequestOptions): Promise<T>;
}

let client: CmsClient | null = null;

const ABSOLUTE_URL = /^https?:\/\//i;

function buildUrl(baseUrl: string, path: string, params?: CmsRequestOptions['params']): string {
    let url = ABSOLUTE_URL.test(path)
        ? path
        : `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;

    if (params) {
        const search = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
            if (value === undefined || value === null) continue;
            search.append(key, String(value));
        }
        const query = search.toString();
        if (query) url += `${url.includes('?') ? '&' : '?'}${query}`;
    }

    return url;
}

/**
 * Combine an optional caller signal with a timeout. Uses `AbortSignal.any`
 * where available and falls back to a manual controller elsewhere.
 */
export function combineSignals(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal | undefined {
    const signals: AbortSignal[] = [];
    if (signal) signals.push(signal);
    if (timeoutMs > 0) signals.push(AbortSignal.timeout(timeoutMs));

    if (signals.length === 0) return undefined;
    if (signals.length === 1) return signals[0];
    if (typeof AbortSignal.any === 'function') return AbortSignal.any(signals);

    const controller = new AbortController();
    for (const s of signals) {
        if (s.aborted) {
            controller.abort(s.reason);
            break;
        }
        s.addEventListener('abort', () => controller.abort(s.reason), { once: true });
    }
    return controller.signal;
}

/** Read a body as JSON, falling back to raw text; empty bodies yield `undefined`. */
async function readJsonOrText(response: Response): Promise<unknown> {
    let text: string;
    try {
        text = await response.text();
    } catch {
        return undefined;
    }
    if (!text) return undefined;
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

function logFailure(cfg: SdkConfig, status: number | undefined, data: unknown, url: string): void {
    if (!cfg.logger?.error) return;
    let message = `API request failed`;
    if (status) message += ` (${status})`;
    if (status === 401) message += ': Unauthorized - check your API key';
    if (status === 403) message += ': Permission denied';
    if (status === 404) message += ': Resource not found';
    if (status === 429) message += ': Rate limit exceeded';
    if (status && status >= 500) message += ': Server error';
    cfg.logger.error(message, { status, data, url });
}

/**
 * Create and configure the API client with the given configuration
 */
export function createApiClient(config: SdkConfig): CmsClient {
    setConfig(config);

    const cfg = getConfig();
    const timeoutMs = cfg.timeoutMs ?? 30_000;
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(cfg.tenant ? { 'X-Tenant': cfg.tenant } : {}),
        ...(cfg.apiKey ? { 'X-API-Key': cfg.apiKey } : {}),
    };

    async function get<T>(path: string, options: CmsRequestOptions = {}): Promise<T> {
        const url = buildUrl(cfg.baseUrl, path, options.params);

        let response: Response;
        try {
            response = await fetch(url, {
                method: 'GET',
                headers,
                signal: combineSignals(options.signal, timeoutMs),
            });
        } catch (error) {
            // Network failure, timeout or caller abort
            logFailure(cfg, undefined, undefined, url);
            throw new CmsError('CMS request failed', { cause: error });
        }

        if (!response.ok) {
            const data = await readJsonOrText(response);
            logFailure(cfg, response.status, data, url);
            throw new CmsError(`CMS request failed (${response.status})`, {
                status: response.status,
                data,
            });
        }

        try {
            switch (options.responseType) {
                case 'blob':
                    return (await response.blob()) as T;
                case 'text':
                    return (await response.text()) as T;
                default:
                    return (await readJsonOrText(response)) as T;
            }
        } catch (error) {
            // Body stream aborted (e.g. timeout while downloading)
            logFailure(cfg, response.status, undefined, url);
            throw new CmsError(`CMS request failed (${response.status})`, {
                status: response.status,
                cause: error,
            });
        }
    }

    client = { get };
    return client;
}

/**
 * Get the current API client instance
 * Throws if not initialized
 */
export function getApiClient(): CmsClient {
    if (!client || !isInitialized()) {
        throw new Error('API client not initialized. Call createApiClient() first.');
    }
    return client;
}

/**
 * Reset the API client (useful for testing)
 */
export function resetApiClient(): void {
    client = null;
}

/** Lazily resolves to the current client; throws if `createApiClient()` has not been called. */
export const apiClient: CmsClient = {
    async get<T>(path: string, options?: CmsRequestOptions): Promise<T> {
        return getApiClient().get<T>(path, options);
    },
};
