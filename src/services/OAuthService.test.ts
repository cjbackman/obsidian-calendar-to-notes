import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OAuthService, OAuthConfig, TokenStorage } from './OAuthService';
import { requestUrl } from 'obsidian';

describe('OAuthService', () => {
	let oauthService: OAuthService;
	let mockStorage: TokenStorage;
	const mockConfig: OAuthConfig = {
		clientId: 'test-client-id',
		clientSecret: 'test-client-secret',
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockStorage = {
			getTokens: vi.fn(() => null),
			saveTokens: vi.fn(async () => {}),
			clearTokens: vi.fn(async () => {}),
		};

		oauthService = new OAuthService(mockConfig, mockStorage);
	});

	describe('getAuthorizationUrl', () => {
		it('returns URL with correct parameters', () => {
			const url = oauthService.getAuthorizationUrl();
			const parsedUrl = new URL(url);

			expect(parsedUrl.origin + parsedUrl.pathname).toBe(
				'https://accounts.google.com/o/oauth2/v2/auth'
			);
			expect(parsedUrl.searchParams.get('client_id')).toBe('test-client-id');
			expect(parsedUrl.searchParams.get('redirect_uri')).toBe('http://127.0.0.1');
			expect(parsedUrl.searchParams.get('response_type')).toBe('code');
			expect(parsedUrl.searchParams.get('access_type')).toBe('offline');
			expect(parsedUrl.searchParams.get('prompt')).toBe('consent');
		});

		it('includes required calendar scopes', () => {
			const url = oauthService.getAuthorizationUrl();
			const parsedUrl = new URL(url);
			const scopes = parsedUrl.searchParams.get('scope');

			expect(scopes).toContain('https://www.googleapis.com/auth/calendar.readonly');
			expect(scopes).toContain('https://www.googleapis.com/auth/calendar.events.readonly');
		});
	});

	describe('exchangeCodeForTokens', () => {
		it('correctly handles token exchange without code verifier', async () => {
			const mockTokenResponse = {
				json: {
					access_token: 'test-access-token',
					refresh_token: 'test-refresh-token',
					expires_in: 3600,
				},
			};

			vi.mocked(requestUrl).mockResolvedValue(mockTokenResponse as never);

			const tokens = await oauthService.exchangeCodeForTokens('test-auth-code');

			// Verify requestUrl was called with correct parameters
			expect(requestUrl).toHaveBeenCalledOnce();
			const callArgs = vi.mocked(requestUrl).mock.calls[0]?.[0];

			expect(callArgs).toBeDefined();
			expect(callArgs?.url).toBe('https://oauth2.googleapis.com/token');
			expect(callArgs?.method).toBe('POST');
			expect(callArgs?.headers?.['Content-Type']).toBe('application/x-www-form-urlencoded');

			// Parse the body to verify parameters
			const bodyParams = new URLSearchParams(callArgs?.body as string);
			expect(bodyParams.get('client_id')).toBe('test-client-id');
			expect(bodyParams.get('client_secret')).toBe('test-client-secret');
			expect(bodyParams.get('code')).toBe('test-auth-code');
			expect(bodyParams.get('grant_type')).toBe('authorization_code');
			expect(bodyParams.get('redirect_uri')).toBe('http://127.0.0.1');

			// Verify no code_verifier is included (this is the key assertion)
			expect(bodyParams.has('code_verifier')).toBe(false);

			// Verify returned tokens
			expect(tokens.accessToken).toBe('test-access-token');
			expect(tokens.refreshToken).toBe('test-refresh-token');
			expect(tokens.expiresAt).toBeGreaterThan(Date.now());
		});

		it('saves tokens to storage after exchange', async () => {
			const mockTokenResponse = {
				json: {
					access_token: 'test-access-token',
					refresh_token: 'test-refresh-token',
					expires_in: 3600,
				},
			};

			vi.mocked(requestUrl).mockResolvedValue(mockTokenResponse as never);

			await oauthService.exchangeCodeForTokens('test-auth-code');

			expect(mockStorage.saveTokens).toHaveBeenCalledOnce();
			expect(mockStorage.saveTokens).toHaveBeenCalledWith(
				expect.objectContaining({
					accessToken: 'test-access-token',
					refreshToken: 'test-refresh-token',
				})
			);
		});
	});
});
