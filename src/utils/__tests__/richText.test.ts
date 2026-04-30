import { describe, it, expect } from 'vitest';
import { stripHtmlTags, isHtmlContent } from '../richText';

describe('stripHtmlTags', () => {
    it('returns plain text unchanged', () => {
        expect(stripHtmlTags('Hello, world!')).toBe('Hello, world!');
    });

    it('strips simple tags', () => {
        expect(stripHtmlTags('<p>Hello</p>')).toBe('Hello');
    });

    it('strips bold and italic', () => {
        expect(stripHtmlTags('<p>This is <strong>bold</strong> and <em>italic</em>.</p>'))
            .toBe('This is bold and italic.');
    });

    it('strips bullet lists and preserves text content', () => {
        const html = '<ul><li>First item</li><li>Second item</li></ul>';
        const result = stripHtmlTags(html);
        expect(result).toContain('First item');
        expect(result).toContain('Second item');
        expect(result).not.toContain('<');
    });

    it('strips ordered lists', () => {
        const html = '<ol><li>One</li><li>Two</li></ol>';
        const result = stripHtmlTags(html);
        expect(result).toContain('One');
        expect(result).toContain('Two');
        expect(result).not.toContain('<ol>');
    });

    it('strips links but preserves link text', () => {
        const html = '<a href="https://example.com" class="text-blue-500">Click here</a>';
        expect(stripHtmlTags(html)).toBe('Click here');
    });

    it('strips nested tags', () => {
        const html = '<p><strong><em>Nested</em></strong></p>';
        expect(stripHtmlTags(html)).toBe('Nested');
    });

    it('handles empty string', () => {
        expect(stripHtmlTags('')).toBe('');
    });

    it('does not introduce XSS via malformed tags', () => {
        const result = stripHtmlTags('<script>alert("xss")</script>');
        expect(result).not.toContain('<script>');
        expect(result).not.toContain('</script>');
    });

    it('collapses excess whitespace from block elements', () => {
        const html = '<p>First paragraph</p><p>Second paragraph</p>';
        const result = stripHtmlTags(html);
        expect(result.trim()).toMatch(/First paragraph.+Second paragraph/s);
    });
});

describe('isHtmlContent', () => {
    it('returns false for plain text', () => {
        expect(isHtmlContent('Just some text')).toBe(false);
    });

    it('returns false for empty string', () => {
        expect(isHtmlContent('')).toBe(false);
    });

    it('returns true for paragraph HTML', () => {
        expect(isHtmlContent('<p>Some content</p>')).toBe(true);
    });

    it('returns true for TipTap bullet list output', () => {
        expect(isHtmlContent('<ul><li>Item one</li><li>Item two</li></ul>')).toBe(true);
    });

    it('returns true for TipTap ordered list output', () => {
        expect(isHtmlContent('<ol><li>Step 1</li></ol>')).toBe(true);
    });

    it('returns true for bold/italic inline HTML', () => {
        expect(isHtmlContent('Text with <strong>bold</strong> words')).toBe(true);
    });

    it('returns true for anchor tags', () => {
        expect(isHtmlContent('<a href="https://example.com">link</a>')).toBe(true);
    });

    it('returns false for text that happens to contain angle brackets (math)', () => {
        // Should not false-positive on plain comparison operators with spaces
        expect(isHtmlContent('if x < 10 then')).toBe(false);
    });
});
