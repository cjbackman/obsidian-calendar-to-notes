import { Menu, Notice, Plugin, TFile, TFolder } from 'obsidian';
import { PluginSettings, DEFAULT_SETTINGS, CalendarToNotesSettingTab } from './settings';
import { OAuthService, OAuthConfig, TokenStorage } from './services/OAuthService';
import { GoogleCalendarClient } from './services/GoogleCalendarClient';
import { CalendarModal } from './ui/CalendarModal';
import { AuthCodeModal } from './ui/AuthCodeModal';
import { VaultAdapter } from './services/NoteWriter';
import { OAuthTokens } from './types';

/**
 * Calendar to Notes - Obsidian Plugin
 * Creates meeting notes from Google Calendar events.
 */
export default class CalendarToNotesPlugin extends Plugin {
	settings: PluginSettings;
	private oauthService: OAuthService | null = null;
	private calendarClient: GoogleCalendarClient | null = null;

	async onload() {
		await this.loadSettings();

		// Initialize OAuth service
		this.initializeOAuthService();

		// Add settings tab
		this.addSettingTab(new CalendarToNotesSettingTab(this.app, this));

		// Register folder context menu item
		this.registerEvent(
			this.app.workspace.on('file-menu', (menu: Menu, file) => {
				if (file instanceof TFolder) {
					menu.addItem((item) => {
						item
							.setTitle('Create meeting notes from calendar')
							.setIcon('calendar')
							.onClick(() => this.openCalendarModal(file));
					});
				}
			})
		);

		// Add command for opening modal
		this.addCommand({
			id: 'create-meeting-notes',
			name: 'Create meeting notes from calendar',
			callback: () => {
				// Use current folder or root
				const activeFile = this.app.workspace.getActiveFile();
				let folder: TFolder | null = null;

				if (activeFile) {
					const parent = activeFile.parent;
					if (parent) {
						folder = parent;
					}
				}

				if (!folder) {
					folder = this.app.vault.getRoot();
				}

				this.openCalendarModal(folder);
			}
		});
	}

	onunload() {
		// Cleanup if needed
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<PluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * Initialize or reinitialize the OAuth service.
	 */
	private initializeOAuthService() {
		const config: OAuthConfig = {
			clientId: this.settings.googleClientId,
			clientSecret: this.settings.googleClientSecret,
		};

		const storage: TokenStorage = {
			getTokens: () => this.settings.oauthTokens,
			saveTokens: async (tokens: OAuthTokens) => {
				this.settings.oauthTokens = tokens;
				await this.saveSettings();
			},
			clearTokens: async () => {
				this.settings.oauthTokens = null;
				await this.saveSettings();
			},
		};

		this.oauthService = new OAuthService(config, storage);
		this.calendarClient = new GoogleCalendarClient(this.oauthService);
	}

	/**
	 * Check if the user is authenticated with Google.
	 */
	isAuthenticated(): boolean {
		return this.oauthService?.isAuthenticated() ?? false;
	}

	/**
	 * Start the OAuth flow to connect to Google.
	 * @param onComplete Optional callback when auth completes successfully
	 */
	async startOAuthFlow(onComplete?: () => void) {
		if (!this.oauthService) {
			this.initializeOAuthService();
		}

		if (!this.oauthService) {
			new Notice('Failed to initialize authorization service');
			return;
		}

		const authUrl = this.oauthService.getAuthorizationUrl();

		// Open the auth URL in the default browser
		window.open(authUrl);

		// Show modal to enter the code
		const oauthService = this.oauthService;
		new AuthCodeModal(this.app, async (code) => {
			if (!code) {
				new Notice('Authorization cancelled');
				return;
			}

			try {
				// Exchange the code for tokens
				await oauthService.exchangeCodeForTokens(code);
				new Notice('Successfully connected to calendar');

				// Reinitialize to ensure fresh client
				this.initializeOAuthService();

				// Notify caller that auth is complete
				if (onComplete) {
					onComplete();
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unknown error';
				new Notice(`Failed to connect: ${message}`);
			}
		}).open();
	}

	/**
	 * Disconnect from Google (clear tokens).
	 */
	async disconnect() {
		if (this.oauthService) {
			await this.oauthService.disconnect();
			new Notice('Disconnected from calendar');
		}
	}

	/**
	 * Open the calendar modal for a folder.
	 */
	private openCalendarModal(folder: TFolder) {
		if (!this.isAuthenticated()) {
			new Notice('Please connect to calendar in settings first');
			return;
		}

		if (!this.settings.templateNotePath) {
			new Notice('Please configure a template note path in settings first');
			return;
		}

		if (!this.calendarClient) {
			new Notice('Calendar client not initialized');
			return;
		}

		const vaultAdapter: VaultAdapter = {
			exists: (path: string) => {
				return this.app.vault.getAbstractFileByPath(path) !== null;
			},
			read: (path: string) => {
				const file = this.app.vault.getAbstractFileByPath(path);
				if (file instanceof TFile) {
					// Note: This is synchronous, so we read from cache
					const cache = this.app.metadataCache.getFileCache(file);
					if (cache?.frontmatter) {
						// Reconstruct basic frontmatter for matching
						const fm = cache.frontmatter;
						return `---\ncalendarEventId: ${fm['calendarEventId'] || ''}\ncalendarEventStart: ${fm['calendarEventStart'] || ''}\n---`;
					}
				}
				return '';
			},
			create: async (path: string, content: string) => {
				await this.app.vault.create(path, content);
			},
			modify: async (path: string, content: string) => {
				const file = this.app.vault.getAbstractFileByPath(path);
				if (file instanceof TFile) {
					await this.app.vault.modify(file, content);
				}
			},
			listFiles: (folderPath: string) => {
				const folder = this.app.vault.getAbstractFileByPath(folderPath);
				if (folder instanceof TFolder) {
					return folder.children
						.filter((f): f is TFile => f instanceof TFile)
						.map(f => ({ path: f.path }));
				}
				return [];
			},
		};

		const modal = new CalendarModal(
			this.app,
			this.settings,
			this.calendarClient,
			folder,
			vaultAdapter,
			() => {
				// On complete callback - could refresh view if needed
			}
		);
		modal.open();
	}
}
