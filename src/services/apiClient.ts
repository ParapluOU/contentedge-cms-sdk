import axios, { type AxiosInstance, type AxiosResponse, AxiosError } from 'axios';
import { CmsError } from '../errors/CmsError';
import { getConfig, setConfig, isInitialized } from '../config/sdkConfig';
import type { SdkConfig } from '../types/config';

let axiosInstance: AxiosInstance | null = null;

/**
 * Create and configure the API client with the given configuration
 */
export function createApiClient(config: SdkConfig): AxiosInstance {
    setConfig(config);
    
    const cfg = getConfig();
    
    axiosInstance = axios.create({
        baseURL: cfg.baseUrl,
        timeout: cfg.timeoutMs ?? 30_000,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(cfg.tenant ? { 'X-Tenant': cfg.tenant } : {}),
            ...(cfg.apiKey ? { 'X-API-Key': cfg.apiKey } : {}),
        },
    });

    // Response interceptor for error handling
    axiosInstance.interceptors.response.use(
        (response: AxiosResponse) => response,
        (error: AxiosError) => {
            const status = error.response?.status;
            const data = error.response?.data;
            
            // Log errors if logger is configured
            if (cfg.logger?.error) {
                let message = `API request failed`;
                if (status) message += ` (${status})`;
                if (status === 401) message += ': Unauthorized - check your API key';
                if (status === 403) message += ': Permission denied';
                if (status === 404) message += ': Resource not found';
                if (status === 429) message += ': Rate limit exceeded';
                if (status && status >= 500) message += ': Server error';
                
                cfg.logger.error(message, { status, data, url: error.config?.url });
            }
            
            throw new CmsError(
                `CMS request failed${status ? ` (${status})` : ''}`,
                { status, data, cause: error }
            );
        }
    );

    return axiosInstance;
}

/**
 * Get the current API client instance
 * Throws if not initialized
 */
export function getApiClient(): AxiosInstance {
    if (!axiosInstance || !isInitialized()) {
        throw new Error('API client not initialized. Call createApiClient() first.');
    }
    return axiosInstance;
}

/**
 * Reset the API client (useful for testing)
 */
export function resetApiClient(): void {
    axiosInstance = null;
}

// Export a default instance getter for convenience
export const apiClient = new Proxy({} as AxiosInstance, {
    get(_target, prop) {
        const instance = getApiClient();
        const value = instance[prop as keyof AxiosInstance];
        return typeof value === 'function' ? value.bind(instance) : value;
    },
});
