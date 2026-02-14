import { buildAssetUrl } from './assetUrl';
import { getConfig } from '../config/sdkConfig';
import type { ContentDto, CustomFields, NormalizedContentItem } from '../types/content';

/**
 * Normalize a content item to a standard format with asset URLs resolved
 * 
 * This function provides a default normalization strategy that:
 * - Extracts common fields from customFields
 * - Resolves asset URLs using SDK configuration
 * - Handles PDF path resolution for different content types
 * - Provides sensible defaults for missing fields
 * 
 * @param item - Raw content item from the API
 * @returns Normalized content item
 */
export function normalizeContentItem<C extends CustomFields = CustomFields>(
    item: ContentDto<C>
): NormalizedContentItem {
    const config = getConfig();
    const customFields = item.customFields as Record<string, unknown>;

    // Helper to get custom field value
    const getField = (key: string): string | null => {
        const value = customFields[key];
        return typeof value === 'string' ? value : null;
    };

    // Resolve PDF path based on content type
    const resolvePdfPath = (): string | null => {
        const type = item.type.toUpperCase();
        
        // For GAMEHEARTS_PUBLICATION type
        if (type === 'GAMEHEARTS_PUBLICATION' || type === 'REPORT') {
            return getField('publication_pdf') ?? getField('pdfPath');
        }
        
        // For EXTERNAL_PUBLICATION type
        if (type === 'EXTERNAL_PUBLICATION') {
            return getField('pdf') ?? getField('pdfPath');
        }
        
        // Default to pdfPath field
        return getField('pdfPath');
    };

    const pdfPath = resolvePdfPath();

    return {
        id: item.id,
        title: getField('title') || item.title,
        text: getField('text') || item.text,
        type: item.type,
        insideImage: buildAssetUrl(getField('insideImage') || '', {
            apiBase: config.baseUrl,
            fileBase: config.fileBaseUrl,
        }),
        outsideImage: buildAssetUrl(getField('outsideImage') || '', {
            apiBase: config.baseUrl,
            fileBase: config.fileBaseUrl,
        }),
        pdfPath: buildAssetUrl(pdfPath, {
            apiBase: config.baseUrl,
            fileBase: config.fileBaseUrl,
        }),
        references: getField('referencesList') ?? getField('references'),
        citation: getField('citation'),
        abstract: getField('abstractText') ?? getField('abstract'),
        team: getField('team'),
        publicationType: getField('publicationType'),
        fake: customFields.fake === true ? true : null,
    };
}

/**
 * Build an asset URL using the SDK's configured base URLs
 * This is a convenience wrapper that automatically uses SDK config
 * 
 * @param path - Path to the asset (can be relative or absolute)
 * @returns Full URL to the asset
 */
export function buildAssetUrlWithConfig(path?: string | null): string {
    const config = getConfig();
    return buildAssetUrl(path, {
        apiBase: config.baseUrl,
        fileBase: config.fileBaseUrl,
    });
}
