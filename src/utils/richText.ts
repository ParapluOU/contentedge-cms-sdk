/**
 * Strips HTML tags from a string, returning plain text.
 *
 * Uses a regex approach rather than the browser DOM (`document.createElement`)
 * so it is safe to call in any environment: browser, Node.js, SSR, edge functions.
 *
 * Designed for TipTap-generated HTML (paragraphs, bold, italic, lists, links).
 * Block-level elements (`<p>`, `<li>`, `<br>`) are replaced with a space so
 * adjacent words from different blocks are not concatenated. The result is
 * then trimmed and excess internal whitespace is normalized.
 *
 * @example
 * stripHtmlTags('<p>Hello <strong>world</strong></p>') // → 'Hello world'
 * stripHtmlTags('<ul><li>A</li><li>B</li></ul>')       // → 'A B'
 */
export function stripHtmlTags(html: string): string {
    if (!html) return '';

    return html
        // Replace block-level closing tags with a space separator so words don't merge
        .replace(/<\/(p|li|h[1-6]|blockquote|div|tr)>/gi, ' ')
        // Replace <br> variants with a space
        .replace(/<br\s*\/?>/gi, ' ')
        // Remove all remaining HTML tags
        .replace(/<[^>]*>/g, '')
        // Collapse multiple whitespace characters into a single space
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Returns `true` if the given string contains HTML markup.
 *
 * Specifically detects well-formed opening HTML tags — a `<` followed by a
 * known tag name and at least one non-`>` character or an immediate `>`.
 * This avoids false-positives from plain-text angle brackets such as
 * comparison operators ("if x < 10 then").
 *
 * Useful for deciding whether to render a value via a rich text renderer
 * (TipTap, `dangerouslySetInnerHTML`) or as plain text.
 *
 * @example
 * isHtmlContent('<p>Bold</p>')            // → true
 * isHtmlContent('Just text')              // → false
 * isHtmlContent('if x < 10 then')        // → false
 */
export function isHtmlContent(value: string): boolean {
    if (!value) return false;
    // Matches an opening tag: <tagname followed by whitespace, attribute chars, or >
    return /<([a-zA-Z][a-zA-Z0-9]*)(\s[^>]*)?>/.test(value);
}
