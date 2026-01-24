import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { requestUrl, Notice } from 'obsidian';
import CalendarToNotesPlugin from './main';

// Create hoisted mock for AuthCodeModal
const mockAuthCodeModal = vi.hoisted(() => vi.fn());

// Mock AuthCodeModal module
vi.mock('./ui/AuthCodeModal', () => ({
	AuthCodeModal: mockAuthCodeModal,
}));

// Mock global window
const mockWindowOpen = vi.fn();
vi.stubGlobal('window', {
	open: mockWindowOpen,
});

describe('CalendarToNotesPlugin', () => {
	let plugin: CalendarToNotesPlugin;
	let capturedOnSubmit: ((code: string | null) => void) | null = null;

	beforeEach(async () => {
		vi.clearAllMocks();
		capturedOnSubmit = null;

		// Setup AuthCodeModal mock to capture the onSubmit callback
		mockAuthCodeModal.mockImplementation(function (
			this: { open: () => void },
			_app: unknown,
			onSubmit: (code: string | null) => void
		) {
			this.open = vi.fn();
			capturedOnSubmit = onSubmit;
			return this;
		});

		// Create plugin instance
		plugin = new CalendarToNotesPlugin(
			{ workspace: { on: vi.fn() }, vault: {}, metadataCache: {} } as never,
			{ id: 'test', name: 'Test Plugin', version: '1.0.0', author: 'Test', minAppVersion: '1.0.0', description: 'Test' }
		);

		// Set up required settings
		plugin.settings = {
			googleClientId: 'test-client-id',
			googleClientSecret: 'test-client-secret',
			oauthTokens: null,
			defaultCalendarId: '',
			templateNotePath: '',
			conflictPolicy: 'skip',
		};
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('startOAuthFlow', () => {
		it('opens auth URL and handles user input via AuthCodeModal', async () => {
			await plugin.startOAuthFlow();

			// Verify window.open was called with an auth URL
			expect(mockWindowOpen).toHaveBeenCalledOnce();
			const authUrl = mockWindowOpen.mock.calls[0]?.[0] as string;
			expect(authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
			expect(authUrl).toContain('client_id=test-client-id');

			// Verify AuthCodeModal was created and opened
			expect(mockAuthCodeModal).toHaveBeenCalledOnce();
			const modalInstance = mockAuthCodeModal.mock.results[0]?.value as { open: () => void };
			expect(modalInstance.open).toHaveBeenCalled();
		});

		it('calls onComplete callback after successful authentication', async () => {
			const onComplete = vi.fn();

			// Mock the token exchange to succeed
			vi.mocked(requestUrl).mockResolvedValue({
				json: {
					access_token: 'test-access-token',
					refresh_token: 'test-refresh-token',
					expires_in: 3600,
				},
			} as never);

			await plugin.startOAuthFlow(onComplete);

			// Simulate user entering a code via the captured callback
			expect(capturedOnSubmit).not.toBeNull();
			capturedOnSubmit?.('valid-auth-code');
			// Wait for async callback to complete
			await vi.waitFor(() => expect(onComplete).toHaveBeenCalled());

			// Verify success notice was shown
			expect((Notice as unknown as { lastMessage: string }).lastMessage).toBe('Successfully connected to calendar');
		});

		it('shows cancellation notice when user cancels', async () => {
			const onComplete = vi.fn();

			await plugin.startOAuthFlow(onComplete);

			// Simulate user cancelling (null code) via the captured callback
			expect(capturedOnSubmit).not.toBeNull();
			capturedOnSubmit?.(null);

			// Verify cancellation notice was shown
			expect((Notice as unknown as { lastMessage: string }).lastMessage).toBe('Authorization cancelled');

			// Verify onComplete was NOT called
			expect(onComplete).not.toHaveBeenCalled();
		});

		it('shows error notice when token exchange fails', async () => {
			const onComplete = vi.fn();

			// Mock the token exchange to fail
			vi.mocked(requestUrl).mockRejectedValue(new Error('Token exchange failed'));

			await plugin.startOAuthFlow(onComplete);

			// Simulate user entering a code via the captured callback
			expect(capturedOnSubmit).not.toBeNull();
			capturedOnSubmit?.('invalid-auth-code');
			// Wait for async callback to complete
			await vi.waitFor(() => expect((Notice as unknown as { lastMessage: string }).lastMessage).toContain('Failed'));

			// Verify error notice was shown
			expect((Notice as unknown as { lastMessage: string }).lastMessage).toBe('Failed to connect: Token exchange failed');

			// Verify onComplete was NOT called
			expect(onComplete).not.toHaveBeenCalled();
		});
	});
});
