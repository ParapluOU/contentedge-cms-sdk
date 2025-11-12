import { describe, it, expect } from 'vitest';
import { buildAssetUrl } from '../utils/assetUrl';

describe('buildAssetUrl', () => {
    const apiBase = 'https://cms.example.com/api';
    const fileBase = 'https://cms.example.com';

    it('returns empty for falsy values', () => {
        expect(buildAssetUrl(undefined, { apiBase, fileBase })).toBe('');
        expect(buildAssetUrl('', { apiBase, fileBase })).toBe('');
    });

    it('keeps absolute non-cms urls as-is', () => {
        expect(buildAssetUrl('https://other.com/a.pdf', { apiBase, fileBase })).toBe('https://other.com/a.pdf');
    });

    it('maps /api absolute to preferred base', () => {
        const u = buildAssetUrl('https://cms.example.com/api/files/a.pdf', { apiBase, fileBase });
        expect(u).toBe('https://cms.example.com/files/a.pdf');
    });

    it('handles relative paths', () => {
        const u = buildAssetUrl('/files/a.pdf', { apiBase, fileBase });
        expect(u).toBe('https://cms.example.com/files/a.pdf');
    });
});