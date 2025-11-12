export class CmsError extends Error {
    readonly status?: number;
    readonly data?: unknown;
    constructor(message: string, opts?: { status?: number; data?: unknown; cause?: unknown }) {
        super(message);
        this.name = 'CmsError';
        this.status = opts?.status;
        this.data = opts?.data;
        if (opts?.cause) {
            // @ts-ignore
            this.cause = opts.cause;
        }
    }
}