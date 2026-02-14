// src/config/sdkConfig.ts
import type { SdkConfig } from '../types/config';

let currentConfig: SdkConfig | null = null;

/**
 * Checks if a value looks like an unresolved CI/CD template variable
 */
function isTemplateString(value: string | undefined): boolean {
    if (!value) return false;
    // Detect common CI/CD template patterns: ${VAR}, $VAR, {{VAR}}, etc.
    return /^(\$\{[^}]+\}|\$[A-Z_]+|\{\{[^}]+\}\})$/.test(value.trim());
}

/**
 * Get the current SDK configuration
 */
export function getConfig(): SdkConfig {
    if (!currentConfig) {
        throw new Error('SDK not initialized. Call createApiClient() first.');
    }
    return currentConfig;
}

/**
 * Set the SDK configuration
 */
export function setConfig(config: SdkConfig): void {
    // Clean up base URLs
    const baseUrl = config.baseUrl.replace(/\/+$/, '');
    const fileBaseUrl = config.fileBaseUrl?.replace(/\/+$/, '');

    // Validate required fields
    if (!baseUrl || isTemplateString(baseUrl)) {
        throw new Error('Invalid baseUrl: must be a valid URL string');
    }

    currentConfig = {
        ...config,
        baseUrl,
        fileBaseUrl,
        timeoutMs: config.timeoutMs ?? 30_000,
    };
}

/**
 * Check if SDK is initialized
 */
export function isInitialized(): boolean {
    return currentConfig !== null;
}

/**
 * Reset configuration (useful for testing)
 */
export function resetConfig(): void {
    currentConfig = null;
}
