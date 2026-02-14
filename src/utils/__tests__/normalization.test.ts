import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { normalizeContentItem, buildAssetUrlWithConfig } from '../normalization';
import { createApiClient, resetApiClient } from '../../services/apiClient';
import { resetConfig } from '../../config/sdkConfig';
import type { ContentDto } from '../../types/content';

describe('normalization', () => {
    beforeEach(() => {
        createApiClient({
            baseUrl: 'https://cms.example.com/api',
            fileBaseUrl: 'https://cms.example.com',
        });
    });

    afterEach(() => {
        resetApiClient();
        resetConfig();
    });

    describe('normalizeContentItem', () => {
        it('normalizes content item with basic fields', () => {
            const item: ContentDto = {
                id: 1,
                title: 'Test Title',
                text: 'Test Text',
                type: 'NEWS',
                customFields: {
                    title: 'Custom Title',
                    text: 'Custom Text',
                    insideImage: '/images/inside.jpg',
                    outsideImage: '/images/outside.jpg',
                },
            };

            const normalized = normalizeContentItem(item);

            expect(normalized.id).toBe(1);
            expect(normalized.title).toBe('Custom Title');
            expect(normalized.text).toBe('Custom Text');
            expect(normalized.type).toBe('NEWS');
            expect(normalized.insideImage).toBe('https://cms.example.com/images/inside.jpg');
            expect(normalized.outsideImage).toBe('https://cms.example.com/images/outside.jpg');
        });

        it('handles GAMEHEARTS_PUBLICATION pdf paths', () => {
            const item: ContentDto = {
                id: 1,
                title: 'Report',
                text: 'Text',
                type: 'GAMEHEARTS_PUBLICATION',
                customFields: {
                    publication_pdf: '/files/report.pdf',
                    pdfPath: '/files/old.pdf',
                },
            };

            const normalized = normalizeContentItem(item);
            expect(normalized.pdfPath).toBe('https://cms.example.com/files/report.pdf');
        });

        it('handles EXTERNAL_PUBLICATION pdf paths', () => {
            const item: ContentDto = {
                id: 1,
                title: 'External',
                text: 'Text',
                type: 'EXTERNAL_PUBLICATION',
                customFields: {
                    pdf: '/files/external.pdf',
                    pdfPath: '/files/old.pdf',
                },
            };

            const normalized = normalizeContentItem(item);
            expect(normalized.pdfPath).toBe('https://cms.example.com/files/external.pdf');
        });

        it('falls back to pdfPath for unknown types', () => {
            const item: ContentDto = {
                id: 1,
                title: 'Other',
                text: 'Text',
                type: 'OTHER',
                customFields: {
                    pdfPath: '/files/generic.pdf',
                },
            };

            const normalized = normalizeContentItem(item);
            expect(normalized.pdfPath).toBe('https://cms.example.com/files/generic.pdf');
        });

        it('handles null and missing fields gracefully', () => {
            const item: ContentDto = {
                id: 1,
                title: 'Minimal',
                text: 'Text',
                type: 'NEWS',
                customFields: {},
            };

            const normalized = normalizeContentItem(item);
            expect(normalized.references).toBeNull();
            expect(normalized.citation).toBeNull();
            expect(normalized.abstract).toBeNull();
            expect(normalized.team).toBeNull();
            expect(normalized.publicationType).toBeNull();
            expect(normalized.fake).toBeNull();
        });
    });

    describe('buildAssetUrlWithConfig', () => {
        it('builds asset URL using SDK config', () => {
            const url = buildAssetUrlWithConfig('/images/test.jpg');
            expect(url).toBe('https://cms.example.com/images/test.jpg');
        });

        it('returns empty for null/undefined', () => {
            expect(buildAssetUrlWithConfig(null)).toBe('');
            expect(buildAssetUrlWithConfig(undefined)).toBe('');
        });
    });
});
