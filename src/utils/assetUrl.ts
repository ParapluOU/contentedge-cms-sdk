// src/utils/assetUrl.ts
type BuildAssetUrlOpts = {
    apiBase?: string;
    fileBase?: string;
};

export const buildAssetUrl = (rawPath?: string | null, opts?: BuildAssetUrlOpts): string => {
    if (!rawPath) return '';
    const trimmed = rawPath.trim();
    if (!trimmed) return '';

    const apiBase = (opts?.apiBase || '').replace(/\/+$/, '');
    const fileBase = (opts?.fileBase || '').replace(/\/+$/, '');
    const originBase = apiBase.replace(/\/api$/, '');
    const preferredBase = fileBase || originBase || apiBase;

    const lower = trimmed.toLowerCase();
    const isAbsolute = lower.startsWith('http://')
        || lower.startsWith('https://')
        || lower.startsWith('data:')
        || lower.startsWith('blob:')
        || trimmed.startsWith('//');

    if (isAbsolute) {
        if (apiBase && preferredBase && lower.startsWith(apiBase.toLowerCase())) {
            const afterApiBase = trimmed.slice(apiBase.length);
            return `${preferredBase}${afterApiBase.startsWith('/') ? '' : '/'}${afterApiBase}`;
        }
        const originApiPrefix = `${originBase}/api`.toLowerCase();
        if (originBase && preferredBase && lower.startsWith(originApiPrefix)) {
            const afterOriginApi = trimmed.slice((originBase + '/api').length);
            return `${preferredBase}${afterOriginApi.startsWith('/') ? '' : '/'}${afterOriginApi}`;
        }
        if (fileBase && lower.startsWith(fileBase.toLowerCase())) return trimmed;
        return trimmed;
    }

    let relative = trimmed.replace(/^\/+/, '');
    relative = relative.replace(/^api\//, '');
    return preferredBase ? `${preferredBase}/${relative}` : `/${relative}`;
};