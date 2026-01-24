import { requestUrl } from 'obsidian';
import { OAuthTokens } from '../types';

/**
 * Google OAuth configuration.
 */
export interface OAuthConfig {
	clientId: string;
	clientSecret: string;
}

/**
 * Interface for token persistence (implemented by plugin).
 */
export interface TokenStorage {
	getTokens(): OAuthTokens | null;
	saveTokens(tokens: OAuthTokens): Promise<void>;
	clearTokens(): Promise<void>;
}

/**
 * Service for handling Google OAuth 2.0 authentication.
 * Uses authorization code flow for desktop apps with manual code entry.
 */
export class OAuthService {
	private static readonly AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
	private static readonly TOKEN_URL = 'https://oauth2.googleapis.com/token';
	// Loopback redirect - Google will show the code in the browser URL/page
	private static readonly REDIRECT_URI = 'http://127.0.0.1';
	private static readonly SCOPES = [
		'https://www.googleapis.com/auth/calendar.readonly',
		'https://www.googleapis.com/auth/calendar.events.readonly',
	];

	// Buffer time before token expiry to refresh (5 minutes)
	private static readonly REFRESH_BUFFER_MS = 5 * 60 * 1000;

	private config: OAuthConfig;
	private storage: TokenStorage;

	constructor(config: OAuthConfig, storage: TokenStorage) {
		this.config = config;
		this.storage = storage;
	}

	/**
	 * Check if the user is authenticated.
	 */
	isAuthenticated(): boolean {
		const tokens = this.storage.getTokens();
		return tokens !== null && tokens.accessToken !== '';
	}

	/**
	 * Get a valid access token, refreshing if necessary.
	 * Throws if not authenticated.
	 */
	async getAccessToken(): Promise<string> {
		const tokens = this.storage.getTokens();
		if (!tokens) {
			throw new Error('Not authenticated. Please connect to Google Calendar first.');
		}

		// Check if token needs refresh
		const needsRefresh = Date.now() >= (tokens.expiresAt - OAuthService.REFRESH_BUFFER_MS);
		
		if (needsRefresh) {
			const refreshedTokens = await this.refreshTokens(tokens.refreshToken);
			await this.storage.saveTokens(refreshedTokens);
			return refreshedTokens.accessToken;
		}

		return tokens.accessToken;
	}

	/**
	 * Generate the authorization URL for the OAuth flow.
	 */
	getAuthorizationUrl(): string {
		const params = new URLSearchParams({
			client_id: this.config.clientId,
			redirect_uri: OAuthService.REDIRECT_URI,
			response_type: 'code',
			scope: OAuthService.SCOPES.join(' '),
			access_type: 'offline',
			prompt: 'consent',
		});

		return `${OAuthService.AUTH_URL}?${params.toString()}`;
	}

	/**
	 * Exchange authorization code for tokens.
	 */
	async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
		const params = new URLSearchParams({
			client_id: this.config.clientId,
			client_secret: this.config.clientSecret,
			code,
			grant_type: 'authorization_code',
			redirect_uri: OAuthService.REDIRECT_URI,
		});

		const response = await requestUrl({
			url: OAuthService.TOKEN_URL,
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: params.toString(),
		});

		const data = response.json as {
			access_token: string;
			refresh_token: string;
			expires_in: number;
		};

		const tokens: OAuthTokens = {
			accessToken: data.access_token,
			refreshToken: data.refresh_token,
			expiresAt: Date.now() + (data.expires_in * 1000),
		};

		await this.storage.saveTokens(tokens);

		return tokens;
	}

	/**
	 * Refresh expired tokens.
	 */
	private async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
		const params = new URLSearchParams({
			client_id: this.config.clientId,
			client_secret: this.config.clientSecret,
			refresh_token: refreshToken,
			grant_type: 'refresh_token',
		});

		const response = await requestUrl({
			url: OAuthService.TOKEN_URL,
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: params.toString(),
		});

		const data = response.json as {
			access_token: string;
			expires_in: number;
			refresh_token?: string;
		};

		return {
			accessToken: data.access_token,
			// Use new refresh token if provided, otherwise keep the old one
			refreshToken: data.refresh_token || refreshToken,
			expiresAt: Date.now() + (data.expires_in * 1000),
		};
	}

	/**
	 * Disconnect from Google (clear tokens).
	 */
	async disconnect(): Promise<void> {
		await this.storage.clearTokens();
	}

	/**
	 * Get the redirect URI for setting up OAuth credentials.
	 */
	static getRedirectUri(): string {
		return OAuthService.REDIRECT_URI;
	}

	/**
	 * Get the required scopes for display in documentation.
	 */
	static getRequiredScopes(): string[] {
		return [...OAuthService.SCOPES];
	}
}
