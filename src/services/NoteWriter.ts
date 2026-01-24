import { CalendarEvent, ConflictPolicy, NoteGenerationResult, NoteFrontmatter } from '../types';
import { TemplateRenderer, TemplateVariables } from './TemplateRenderer';
import { AttendeeFormatter } from './AttendeeFormatter';
import { FilenameGenerator } from './FilenameGenerator';
import { FrontmatterService } from './FrontmatterService';

/**
 * Result of writing a single note.
 */
export interface WriteNoteResult {
	created: boolean;
	skipped: boolean;
	filename: string;
	reason?: string;
}

/**
 * Adapter interface for Obsidian Vault operations.
 * Allows for mocking in tests.
 */
export interface VaultAdapter {
	exists(path: string): boolean;
	read(path: string): string;
	create(path: string, content: string): Promise<void>;
	modify(path: string, content: string): Promise<void>;
	listFiles(folder: string): Array<{ path: string }>;
}

/**
 * Service for writing meeting notes to the vault.
 * Handles deduplication, conflict resolution, and content generation.
 */
export class NoteWriter {
	private vault: VaultAdapter;
	private templateRenderer = new TemplateRenderer();
	private attendeeFormatter = new AttendeeFormatter();
	private filenameGenerator = new FilenameGenerator();
	private frontmatterService = new FrontmatterService();

	constructor(vault: VaultAdapter) {
		this.vault = vault;
	}

	/**
	 * Write a single note for a calendar event.
	 */
	async writeNote(
		event: CalendarEvent,
		template: string,
		folderPath: string,
		conflictPolicy: ConflictPolicy
	): Promise<WriteNoteResult> {
		const frontmatter: NoteFrontmatter = {
			calendarEventId: event.id,
			calendarEventStart: event.startISO,
		};

		// Check for existing note with same event (deduplication)
		const existingNotePath = this.findExistingNote(folderPath, frontmatter);

		if (existingNotePath) {
			if (conflictPolicy === 'skip') {
				return {
					created: false,
					skipped: true,
					filename: existingNotePath.split('/').pop() || '',
					reason: 'Note for this event already exists',
				};
			} else if (conflictPolicy === 'overwrite') {
				const content = this.generateContent(event, template, frontmatter);
				await this.vault.modify(existingNotePath, content);
				return {
					created: true,
					skipped: false,
					filename: existingNotePath.split('/').pop() || '',
				};
			}
			// For 'suffix' policy, fall through to create new file
		}

		// Generate filename
		let filename = this.filenameGenerator.generate(event.date, event.title);
		let filePath = `${folderPath}/${filename}`;

		// Handle filename conflicts
		if (this.vault.exists(filePath)) {
			if (conflictPolicy === 'skip') {
				return {
					created: false,
					skipped: true,
					filename,
					reason: 'File with this name already exists',
				};
			} else if (conflictPolicy === 'overwrite') {
				const content = this.generateContent(event, template, frontmatter);
				await this.vault.modify(filePath, content);
				return {
					created: true,
					skipped: false,
					filename,
				};
			} else {
				// suffix policy - find available filename
				let suffix = 1;
				while (this.vault.exists(filePath)) {
					filename = this.filenameGenerator.generateWithSuffix(event.date, event.title, suffix);
					filePath = `${folderPath}/${filename}`;
					suffix++;
				}
			}
		}

		// Create the note
		const content = this.generateContent(event, template, frontmatter);
		await this.vault.create(filePath, content);

		return {
			created: true,
			skipped: false,
			filename,
		};
	}

	/**
	 * Write notes for multiple events.
	 */
	async writeNotes(
		events: CalendarEvent[],
		template: string,
		folderPath: string,
		conflictPolicy: ConflictPolicy
	): Promise<NoteGenerationResult> {
		const created: string[] = [];
		const skipped: Array<{ filename: string; reason: string }> = [];

		for (const event of events) {
			const result = await this.writeNote(event, template, folderPath, conflictPolicy);

			if (result.created) {
				created.push(result.filename);
			} else if (result.skipped) {
				skipped.push({
					filename: result.filename,
					reason: result.reason || 'Unknown reason',
				});
			}
		}

		return { created, skipped };
	}

	/**
	 * Generate note content from template and event data.
	 */
	private generateContent(
		event: CalendarEvent,
		template: string,
		frontmatter: NoteFrontmatter
	): string {
		const variables: TemplateVariables = {
			title: event.title,
			date: event.date,
			startTime: event.startTime,
			endTime: event.endTime,
			attendees: this.attendeeFormatter.formatAttendees(event.attendees),
			calendarEventId: frontmatter.calendarEventId,
			calendarEventStart: frontmatter.calendarEventStart,
		};

		// Check if template has frontmatter with calendar variables
		const hasFrontmatterVars = template.includes('{{calendarEventId}}') || 
			                        template.includes('{{calendarEventStart}}');

		if (hasFrontmatterVars) {
			// Template manages its own frontmatter - just substitute variables
			return this.templateRenderer.render(template, variables);
		} else {
			// Template doesn't have calendar frontmatter - prepend it
			const body = this.templateRenderer.render(template, variables);
			return this.frontmatterService.prependToContent(frontmatter, body);
		}
	}

	/**
	 * Find an existing note in the folder that matches the event's frontmatter.
	 * Returns the full path if found, null otherwise.
	 */
	private findExistingNote(folderPath: string, target: NoteFrontmatter): string | null {
		const files = this.vault.listFiles(folderPath);

		for (const file of files) {
			if (!file.path.endsWith('.md')) continue;

			const content = this.vault.read(file.path);
			if (this.frontmatterService.matches(content, target)) {
				return file.path;
			}
		}

		return null;
	}
}
