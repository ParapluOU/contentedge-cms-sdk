import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createApiClient, getApiClient, resetApiClient, apiClient } from '../apiClient';
import { resetConfig } from '../../config/sdkConfig';

describe('apiClient', () => {
    afterEach(() => {
        resetApiClient();
        resetConfig();
    });

    describe('createApiClient', () => {
        it('creates an axios instance with correct config', () => {
            const client = createApiClient({
                baseUrl: 'https://cms.example.com/api',
                apiKey: 'test-key',
                tenant: 'test-tenant',
                timeoutMs: 5000,
            });

            expect(client.defaults.baseURL).toBe('https://cms.example.com/api');
            expect(client.defaults.timeout).toBe(5000);
            expect(client.defaults.headers['X-API-Key']).toBe('test-key');
            expect(client.defaults.headers['X-Tenant']).toBe('test-tenant');
            expect(client.defaults.headers['Content-Type']).toBe('application/json');
        });

        it('uses default timeout when not specified', () => {
            const client = createApiClient({
                baseUrl: 'https://cms.example.com/api',
            });

            expect(client.defaults.timeout).toBe(30_000);
        });

        it('strips trailing slashes from baseUrl', () => {
            const client = createApiClient({
                baseUrl: 'https://cms.example.com/api/',
            });

            expect(client.defaults.baseURL).toBe('https://cms.example.com/api');
        });
    });

    describe('getApiClient', () => {
        it('returns the created client', () => {
            const created = createApiClient({
                baseUrl: 'https://cms.example.com/api',
            });

            const retrieved = getApiClient();
            expect(retrieved).toBe(created);
        });

        it('throws when not initialized', () => {
            expect(() => getApiClient()).toThrow('API client not initialized');
        });
    });

    describe('apiClient proxy', () => {
        beforeEach(() => {
            createApiClient({
                baseUrl: 'https://cms.example.com/api',
            });
        });

        it('proxies to the actual client instance', () => {
            expect(apiClient.defaults.baseURL).toBe('https://cms.example.com/api');
        });

        it('binds methods correctly', () => {
            expect(typeof apiClient.get).toBe('function');
            expect(typeof apiClient.post).toBe('function');
        });
    });
});
