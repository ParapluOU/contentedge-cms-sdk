export class CmsError extends Error {
    readonly status?: number;
    readonly data?: unknown;
    constructor(message: string, opts?: { status?: number; data?: unknown; cause?: unknown }) {
        super(message, opts?.cause ? { cause: opts.cause } : undefined);
        this.name = 'CmsError';
        this.status = opts?.status;
        this.data = opts?.data;
    }
}