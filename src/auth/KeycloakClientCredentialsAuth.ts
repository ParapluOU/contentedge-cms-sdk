import axios from 'axios';
import type { AuthProvider } from './AuthProvider';

type KeycloakCreds = {
    tokenUrl: string;
    clientId: string;
    clientSecret: string;
};

type TokenState = {
    accessToken: string | null;
    expiresAt: number;
    inFlight: Promise<string> | null;
};

export class KeycloakClientCredentialsAuth implements AuthProvider {
    private readonly tokenUrl: string;
    private readonly clientId: string;
    private readonly clientSecret: string;
    private state: TokenState = { accessToken: null, expiresAt: 0, inFlight: null };

    constructor(opts: KeycloakCreds) {
        this.tokenUrl = opts.tokenUrl;
        this.clientId = opts.clientId;
        this.clientSecret = opts.clientSecret;
    }

    async getAccessToken(opts?: { forceRefresh?: boolean }): Promise<string> {
        const now = Date.now();
        if (!opts?.forceRefresh && this.state.accessToken && now < this.state.expiresAt) {
            return this.state.accessToken;
        }
        if (this.state.inFlight) {
            return this.state.inFlight;
        }
        this.state.inFlight = this.fetchNewToken()
            .finally(() => {
                this.state.inFlight = null;
            });
        return this.state.inFlight;
    }

    private async fetchNewToken(): Promise<string> {
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', this.clientId);
        params.append('client_secret', this.clientSecret);

        const res = await axios.post<{ access_token: string; expires_in: number }>(
            this.tokenUrl,
            params.toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const safety = 10_000;
        this.state.accessToken = res.data.access_token;
        this.state.expiresAt = Date.now() + Math.max(0, (res.data.expires_in * 1000) - safety);
        return this.state.accessToken!;
    }
}