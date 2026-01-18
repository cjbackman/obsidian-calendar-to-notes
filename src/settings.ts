import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import type CalendarToNotesPlugin from './main';
import { ConflictPolicy } from './types';
import { OAuthService } from './services/OAuthService';

export type { PluginSettings } from './types';
export { DEFAULT_SETTINGS } from './types';

/**
 * Settings tab for the Calendar to Notes plugin.
 */
export class CalendarToNotesSettingTab extends PluginSettingTab {
	plugin: CalendarToNotesPlugin;

	constructor(app: App, plugin: CalendarToNotesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Calendar to Notes settings' });

		// Google OAuth Section
		containerEl.createEl('h3', { text: 'Google Calendar connection' });

		new Setting(containerEl)
			.setName('Client ID')
			.setDesc('Google OAuth Client ID from Google Cloud Console')
			.addText(text => text
				.setPlaceholder('Enter your Client ID')
				.setValue(this.plugin.settings.googleClientId)
				.onChange(async (value) => {
					this.plugin.settings.googleClientId = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Client secret')
			.setDesc('Google OAuth Client Secret from Google Cloud Console')
			.addText(text => {
				text
					.setPlaceholder('Enter your Client Secret')
					.setValue(this.plugin.settings.googleClientSecret)
					.onChange(async (value) => {
						this.plugin.settings.googleClientSecret = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.type = 'password';
			});

		// Connection status and buttons
		const isConnected = this.plugin.isAuthenticated();

		new Setting(containerEl)
			.setName('Connection status')
			.setDesc(isConnected ? 'Connected to Google Calendar' : 'Not connected')
			.addButton(button => {
				if (isConnected) {
					button
						.setButtonText('Disconnect')
						.onClick(async () => {
							await this.plugin.disconnect();
							this.display(); // Refresh
						});
				} else {
					button
						.setButtonText('Connect to Google')
						.setCta()
						.onClick(async () => {
							if (!this.plugin.settings.googleClientId || !this.plugin.settings.googleClientSecret) {
								new Notice('Please enter Client ID and Client Secret first');
								return;
							}
							await this.plugin.startOAuthFlow();
						});
				}
			});

		// Setup instructions
		const infoEl = containerEl.createDiv({ cls: 'setting-item-description' });
		infoEl.createEl('p', {
			text: 'To connect to Google Calendar, you need to create OAuth credentials in Google Cloud Console:'
		});
		const steps = infoEl.createEl('ol');
		steps.createEl('li', { text: 'Go to Google Cloud Console and create a new project' });
		steps.createEl('li', { text: 'Enable the Google Calendar API' });
		steps.createEl('li', { text: 'Create OAuth 2.0 credentials (Desktop application)' });
		steps.createEl('li', { text: `Add redirect URI: ${OAuthService.getRedirectUri()}` });
		steps.createEl('li', { text: 'Copy the Client ID and Client Secret above' });

		// Template Section
		containerEl.createEl('h3', { text: 'Note template' });

		new Setting(containerEl)
			.setName('Template note path')
			.setDesc('Path to the markdown note to use as template (e.g., Templates/Meeting.md)')
			.addText(text => text
				.setPlaceholder('Templates/Meeting.md')
				.setValue(this.plugin.settings.templateNotePath)
				.onChange(async (value) => {
					this.plugin.settings.templateNotePath = value;
					await this.plugin.saveSettings();
				}));

		// Template variables info
		const templateInfoEl = containerEl.createDiv({ cls: 'setting-item-description' });
		templateInfoEl.createEl('p', { text: 'Supported template variables:' });
		const varList = templateInfoEl.createEl('ul');
		varList.createEl('li', { text: '{{title}} - Event title' });
		varList.createEl('li', { text: '{{date}} - Date (YYYY-MM-DD)' });
		varList.createEl('li', { text: '{{startTime}} - Start time (HH:mm)' });
		varList.createEl('li', { text: '{{endTime}} - End time (HH:mm)' });
		varList.createEl('li', { text: '{{attendees}} - Attendees as wiki links' });

		// Conflict Policy Section
		containerEl.createEl('h3', { text: 'Note generation' });

		new Setting(containerEl)
			.setName('Conflict policy')
			.setDesc('What to do when a note for the same event already exists')
			.addDropdown(dropdown => dropdown
				.addOption('skip', 'Skip (do not overwrite)')
				.addOption('overwrite', 'Overwrite existing note')
				.addOption('suffix', 'Create with numeric suffix')
				.setValue(this.plugin.settings.conflictPolicy)
				.onChange(async (value) => {
					this.plugin.settings.conflictPolicy = value as ConflictPolicy;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Default calendar')
			.setDesc('Calendar ID to use by default (leave empty for primary)')
			.addText(text => text
				.setPlaceholder('primary')
				.setValue(this.plugin.settings.defaultCalendarId)
				.onChange(async (value) => {
					this.plugin.settings.defaultCalendarId = value;
					await this.plugin.saveSettings();
				}));
	}
}
