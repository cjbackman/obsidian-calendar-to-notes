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

		// Google OAuth Section
		new Setting(containerEl)
			.setName('Google calendar connection')
			.setHeading();

		new Setting(containerEl)
			.setName('Client ID')
			.setDesc('Your client ID')
			.addText(text => text
				.setPlaceholder('Enter your client ID')
				.setValue(this.plugin.settings.googleClientId)
				.onChange(async (value) => {
					this.plugin.settings.googleClientId = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Client secret')
			.setDesc('Your client secret')
			.addText(text => {
				text
					.setPlaceholder('Enter your client secret')
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
						.setButtonText('Connect')
						.setCta()
						.onClick(async () => {
							if (!this.plugin.settings.googleClientId || !this.plugin.settings.googleClientSecret) {
								new Notice('Please enter client ID and client secret first.');
								return;
							}
							await this.plugin.startOAuthFlow(() => {
								this.display(); // Refresh settings after successful auth
							});
						});
				}
			});

		// Setup instructions
		const infoEl = containerEl.createDiv({ cls: 'setting-item-description' });
		infoEl.createEl('p', {
			text: 'To connect, you need to create credentials in the cloud console.'
		});
		const steps = infoEl.createEl('ol');
		steps.createEl('li', { text: 'Go to the cloud console and create a new project.' });
		steps.createEl('li', { text: 'Enable the calendar API.' });
		steps.createEl('li', { text: 'Create credentials (desktop application).' });
		steps.createEl('li', { text: `Add redirect URI: ${OAuthService.getRedirectUri()}` });
		steps.createEl('li', { text: 'Copy the client ID and client secret above.' });

		// Template Section
		new Setting(containerEl)
			.setName('Note template')
			.setHeading();

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
		new Setting(containerEl)
			.setName('Note generation')
			.setHeading();

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
			.setDesc('Calendar ID to use by default')
			.addText(text => text
				.setPlaceholder('')
				.setValue(this.plugin.settings.defaultCalendarId)
				.onChange(async (value) => {
					this.plugin.settings.defaultCalendarId = value;
					await this.plugin.saveSettings();
				}));
	}
}
