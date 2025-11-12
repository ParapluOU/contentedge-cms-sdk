export interface AuthProvider {
    getAccessToken(opts?: { forceRefresh?: boolean }): Promise<string>;
}