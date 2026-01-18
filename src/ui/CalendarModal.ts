import { App, Modal, Setting, Notice, TFolder } from 'obsidian';
import { CalendarEvent, GoogleCalendar, TimeRangePreset, PluginSettings } from '../types';
import { GoogleCalendarClient } from '../services/GoogleCalendarClient';
import { TimeRangeService } from '../services/TimeRangeService';
import { EventMapper } from '../services/EventMapper';
import { NoteWriter, VaultAdapter } from '../services/NoteWriter';

/**
 * Modal for fetching calendar events and generating meeting notes.
 */
export class CalendarModal extends Modal {
	private settings: PluginSettings;
	private calendarClient: GoogleCalendarClient;
	private targetFolder: TFolder;
	private vaultAdapter: VaultAdapter;
	private onComplete: () => void;

	// Services
	private timeRangeService = new TimeRangeService();
	private eventMapper = new EventMapper();

	// UI State
	private timeRangePreset: TimeRangePreset = 'current-day';
	private customStartDate: string = '';
	private customEndDate: string = '';
	private selectedCalendarId: string = '';
	private calendars: GoogleCalendar[] = [];
	private events: CalendarEvent[] = [];
	private selectedEventIds: Set<string> = new Set();

	// UI elements
	private eventListEl: HTMLElement | null = null;
	private generateBtnEl: HTMLButtonElement | null = null;
	private statusEl: HTMLElement | null = null;

	constructor(
		app: App,
		settings: PluginSettings,
		calendarClient: GoogleCalendarClient,
		targetFolder: TFolder,
		vaultAdapter: VaultAdapter,
		onComplete: () => void
	) {
		super(app);
		this.settings = settings;
		this.calendarClient = calendarClient;
		this.targetFolder = targetFolder;
		this.vaultAdapter = vaultAdapter;
		this.onComplete = onComplete;

		// Set defaults
		this.selectedCalendarId = settings.defaultCalendarId || 'primary';

		// Set default custom dates to today
		const today = this.timeRangeService.formatDateLocal(new Date());
		this.customStartDate = today;
		this.customEndDate = today;
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('calendar-to-notes-modal');

		contentEl.createEl('h2', { text: 'Create meeting notes from Google Calendar' });
		contentEl.createEl('p', {
			text: `Target folder: ${this.targetFolder.path}`,
			cls: 'setting-item-description',
		});

		// Load calendars
		await this.loadCalendars();

		// Time range selector
		this.renderTimeRangeSelector(contentEl);

		// Calendar selector
		this.renderCalendarSelector(contentEl);

		// Fetch button
		this.renderFetchButton(contentEl);

		// Status area
		this.statusEl = contentEl.createDiv({ cls: 'calendar-modal-status' });

		// Event list (initially empty)
		this.eventListEl = contentEl.createDiv({ cls: 'calendar-modal-events' });

		// Generate button (initially disabled)
		const buttonRow = contentEl.createDiv({ cls: 'calendar-modal-buttons' });
		this.generateBtnEl = buttonRow.createEl('button', {
			text: 'Generate notes',
			cls: 'mod-cta',
		});
		this.generateBtnEl.disabled = true;
		this.generateBtnEl.addEventListener('click', () => this.generateNotes());
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	private async loadCalendars() {
		try {
			this.calendars = await this.calendarClient.getCalendars();

			// Set default to primary calendar if not already set
			if (!this.selectedCalendarId || this.selectedCalendarId === 'primary') {
				const primary = this.calendars.find(c => c.primary);
				if (primary) {
					this.selectedCalendarId = primary.id;
				}
			}
		} catch (error) {
			new Notice(`Failed to load calendars: ${error instanceof Error ? error.message : 'Unknown error'}`);
			this.calendars = [];
		}
	}

	private renderTimeRangeSelector(containerEl: HTMLElement) {
		new Setting(containerEl)
			.setName('Time range')
			.setDesc('Select the time range for events')
			.addDropdown(dropdown => {
				dropdown
					.addOption('current-day', 'Current day')
					.addOption('custom', 'Custom range')
					.setValue(this.timeRangePreset)
					.onChange((value: string) => {
						this.timeRangePreset = value as TimeRangePreset;
						this.renderCustomDateInputs(containerEl);
					});
			});

		// Container for custom date inputs
		this.renderCustomDateInputs(containerEl);
	}

	private renderCustomDateInputs(containerEl: HTMLElement) {
		// Remove existing custom inputs
		const existingCustom = containerEl.querySelector('.custom-date-inputs');
		if (existingCustom) {
			existingCustom.remove();
		}

		if (this.timeRangePreset !== 'custom') {
			return;
		}

		const customContainer = containerEl.createDiv({ cls: 'custom-date-inputs' });

		new Setting(customContainer)
			.setName('Start date')
			.addText(text => {
				text
					.setPlaceholder('YYYY-MM-DD')
					.setValue(this.customStartDate)
					.onChange(value => {
						this.customStartDate = value;
					});
				text.inputEl.type = 'date';
			});

		new Setting(customContainer)
			.setName('End date')
			.addText(text => {
				text
					.setPlaceholder('YYYY-MM-DD')
					.setValue(this.customEndDate)
					.onChange(value => {
						this.customEndDate = value;
					});
				text.inputEl.type = 'date';
			});
	}

	private renderCalendarSelector(containerEl: HTMLElement) {
		new Setting(containerEl)
			.setName('Calendar')
			.setDesc('Select which calendar to fetch events from')
			.addDropdown(dropdown => {
				for (const calendar of this.calendars) {
					const label = calendar.primary ? `${calendar.summary} (Primary)` : calendar.summary;
					dropdown.addOption(calendar.id, label);
				}

				dropdown
					.setValue(this.selectedCalendarId)
					.onChange(value => {
						this.selectedCalendarId = value;
					});
			});
	}

	private renderFetchButton(containerEl: HTMLElement) {
		const setting = new Setting(containerEl);
		setting.addButton(button => {
			button
				.setButtonText('Fetch events')
				.setCta()
				.onClick(() => this.fetchEvents());
		});
	}

	private async fetchEvents() {
		if (!this.statusEl || !this.eventListEl) return;

		this.statusEl.setText('Fetching events...');
		this.eventListEl.empty();
		this.events = [];
		this.selectedEventIds.clear();
		this.updateGenerateButton();

		try {
			// Calculate time range
			const timeRange = this.timeRangePreset === 'current-day'
				? this.timeRangeService.getCurrentDayRange()
				: this.timeRangeService.getCustomRange(
					new Date(`${this.customStartDate}T00:00:00`),
					new Date(`${this.customEndDate}T23:59:59.999`)
				);

			// Fetch and map events
			const googleEvents = await this.calendarClient.getEvents(
				this.selectedCalendarId,
				timeRange
			);

			this.events = this.eventMapper.mapEvents(googleEvents);

			if (this.events.length === 0) {
				this.statusEl.setText('No events found for the selected time range.');
				return;
			}

			this.statusEl.setText(`Found ${this.events.length} event(s).`);
			this.renderEventList();
		} catch (error) {
			this.statusEl.setText(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	private renderEventList() {
		if (!this.eventListEl) return;

		this.eventListEl.empty();

		// Select all / none controls
		const controls = this.eventListEl.createDiv({ cls: 'event-list-controls' });
		const selectAllBtn = controls.createEl('button', { text: 'Select all' });
		const selectNoneBtn = controls.createEl('button', { text: 'Select none' });

		selectAllBtn.addEventListener('click', () => {
			this.selectedEventIds = new Set(this.events.map(e => e.id));
			this.renderEventList();
			this.updateGenerateButton();
		});

		selectNoneBtn.addEventListener('click', () => {
			this.selectedEventIds.clear();
			this.renderEventList();
			this.updateGenerateButton();
		});

		// Event list
		const listEl = this.eventListEl.createEl('ul', { cls: 'event-list' });

		for (const event of this.events) {
			const itemEl = listEl.createEl('li', { cls: 'event-item' });

			const checkbox = itemEl.createEl('input', { type: 'checkbox' });
			checkbox.checked = this.selectedEventIds.has(event.id);
			checkbox.addEventListener('change', () => {
				if (checkbox.checked) {
					this.selectedEventIds.add(event.id);
				} else {
					this.selectedEventIds.delete(event.id);
				}
				this.updateGenerateButton();
			});

			const labelEl = itemEl.createEl('label');

			// Event title
			const titleEl = labelEl.createEl('span', { cls: 'event-title', text: event.title });

			// Event time
			const timeText = event.isAllDay
				? 'All day'
				: `${event.startTime} - ${event.endTime}`;
			labelEl.createEl('span', { cls: 'event-time', text: timeText });

			// Make clicking the label toggle the checkbox
			labelEl.addEventListener('click', (e) => {
				if (e.target !== checkbox) {
					checkbox.checked = !checkbox.checked;
					if (checkbox.checked) {
						this.selectedEventIds.add(event.id);
					} else {
						this.selectedEventIds.delete(event.id);
					}
					this.updateGenerateButton();
				}
			});
		}
	}

	private updateGenerateButton() {
		if (this.generateBtnEl) {
			this.generateBtnEl.disabled = this.selectedEventIds.size === 0;
			this.generateBtnEl.textContent = `Generate notes (${this.selectedEventIds.size})`;
		}
	}

	private async generateNotes() {
		if (!this.statusEl) return;

		const selectedEvents = this.events.filter(e => this.selectedEventIds.has(e.id));
		if (selectedEvents.length === 0) {
			new Notice('No events selected');
			return;
		}

		// Validate template exists
		if (!this.settings.templateNotePath) {
			new Notice('Please configure a template note path in settings');
			return;
		}

		const templateFile = this.app.vault.getAbstractFileByPath(this.settings.templateNotePath);
		if (!templateFile) {
			new Notice(`Template file not found: ${this.settings.templateNotePath}`);
			return;
		}

		this.statusEl.setText('Generating notes...');
		if (this.generateBtnEl) {
			this.generateBtnEl.disabled = true;
		}

		try {
			// Read template
			const template = await this.app.vault.read(templateFile as any);

			// Create note writer
			const noteWriter = new NoteWriter(this.vaultAdapter);

			// Write notes
			const result = await noteWriter.writeNotes(
				selectedEvents,
				template,
				this.targetFolder.path,
				this.settings.conflictPolicy
			);

			// Show summary
			const summary = `Created ${result.created.length} note(s)`;
			const skippedSummary = result.skipped.length > 0
				? `, skipped ${result.skipped.length}`
				: '';

			new Notice(`${summary}${skippedSummary}`);
			this.statusEl.setText(`Done! ${summary}${skippedSummary}.`);

			// Call completion callback
			this.onComplete();

			// Close modal after brief delay
			setTimeout(() => this.close(), 1500);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			this.statusEl.setText(`Error: ${message}`);
			new Notice(`Failed to generate notes: ${message}`);
			if (this.generateBtnEl) {
				this.generateBtnEl.disabled = false;
			}
		}
	}
}
