export interface SdkConfig {
    baseUrl: string;
    fileBaseUrl?: string;
    apiKey?: string;
    tenant?: string;
    timeoutMs?: number;
    logger?: {
        debug?: (...args: unknown[]) => void;
        warn?: (...args: unknown[]) => void;
        error?: (...args: unknown[]) => void;
    };
}
