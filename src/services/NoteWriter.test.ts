import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NoteWriter, VaultAdapter } from './NoteWriter';
import { CalendarEvent } from '../types';

describe('NoteWriter', () => {
	let writer: NoteWriter;
	let mockVault: VaultAdapter;
	let existingFiles: Map<string, string>;

	beforeEach(() => {
		existingFiles = new Map();

		mockVault = {
			exists: vi.fn((path: string) => existingFiles.has(path)),
			read: vi.fn((path: string) => existingFiles.get(path) || ''),
			create: vi.fn(async (path: string, content: string) => {
				existingFiles.set(path, content);
			}),
			modify: vi.fn(async (path: string, content: string) => {
				existingFiles.set(path, content);
			}),
			listFiles: vi.fn((folder: string) => {
				return Array.from(existingFiles.keys())
					.filter(path => path.startsWith(folder))
					.map(path => ({ path }));
			}),
		};

		writer = new NoteWriter(mockVault);
	});

	const sampleEvent: CalendarEvent = {
		id: 'event123',
		title: 'Team Standup',
		date: '2024-03-15',
		startTime: '09:00',
		endTime: '09:30',
		startISO: '2024-03-15T09:00:00Z',
		isAllDay: false,
		attendees: [
			{ email: 'alice@example.com', displayName: 'Alice', isOrganizer: true },
			{ email: 'bob@example.com', displayName: 'Bob', isOrganizer: false },
		],
		organizerEmail: 'alice@example.com',
	};

	const sampleTemplate = `# {{title}}

Date: {{date}}
Time: {{startTime}} - {{endTime}}
Attendees: {{attendees}}
`;

	describe('writeNote', () => {
		it('creates a new note with correct filename and content', async () => {
			const result = await writer.writeNote(
				sampleEvent,
				sampleTemplate,
				'Meetings',
				'skip'
			);

			expect(result.created).toBe(true);
			expect(result.filename).toBe('2024-03-15 - Team Standup.md');
			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(mockVault.create).toHaveBeenCalledOnce();

			const createdContent = existingFiles.get('Meetings/2024-03-15 - Team Standup.md');
			expect(createdContent).toContain('# Team Standup');
			expect(createdContent).toContain('calendarEventId: event123');
			expect(createdContent).toContain('calendarEventStart: 2024-03-15T09:00:00Z');
		});

		it('renders attendees as wiki links', async () => {
			await writer.writeNote(sampleEvent, sampleTemplate, 'Meetings', 'skip');

			const createdContent = existingFiles.get('Meetings/2024-03-15 - Team Standup.md');
			expect(createdContent).toContain('[[Bob]]');
			// Alice is organizer and should be excluded
			expect(createdContent).not.toContain('[[Alice]]');
		});

		describe('deduplication', () => {
			it('skips note when matching frontmatter exists (skip policy)', async () => {
				// Set up existing note with same event
				const existingContent = `---
calendarEventId: event123
calendarEventStart: 2024-03-15T09:00:00Z
---

# Team Standup`;
				existingFiles.set('Meetings/2024-03-15 - Team Standup.md', existingContent);

				const result = await writer.writeNote(
					sampleEvent,
					sampleTemplate,
					'Meetings',
					'skip'
				);

				expect(result.created).toBe(false);
				expect(result.skipped).toBe(true);
				expect(result.reason).toContain('already exists');
				// eslint-disable-next-line @typescript-eslint/unbound-method
				expect(mockVault.create).not.toHaveBeenCalled();
			});

			it('overwrites when matching frontmatter exists (overwrite policy)', async () => {
				const existingContent = `---
calendarEventId: event123
calendarEventStart: 2024-03-15T09:00:00Z
---

# Old Content`;
				existingFiles.set('Meetings/2024-03-15 - Team Standup.md', existingContent);

				const result = await writer.writeNote(
					sampleEvent,
					sampleTemplate,
					'Meetings',
					'overwrite'
				);

				expect(result.created).toBe(true);
				// eslint-disable-next-line @typescript-eslint/unbound-method
				expect(mockVault.modify).toHaveBeenCalledOnce();
			});

			it('creates with suffix when file exists (suffix policy)', async () => {
				existingFiles.set('Meetings/2024-03-15 - Team Standup.md', 'existing content');

				const result = await writer.writeNote(
					sampleEvent,
					sampleTemplate,
					'Meetings',
					'suffix'
				);

				expect(result.created).toBe(true);
				expect(result.filename).toBe('2024-03-15 - Team Standup (1).md');
			});

			it('increments suffix until finding available filename', async () => {
				existingFiles.set('Meetings/2024-03-15 - Team Standup.md', 'content');
				existingFiles.set('Meetings/2024-03-15 - Team Standup (1).md', 'content');
				existingFiles.set('Meetings/2024-03-15 - Team Standup (2).md', 'content');

				const result = await writer.writeNote(
					sampleEvent,
					sampleTemplate,
					'Meetings',
					'suffix'
				);

				expect(result.created).toBe(true);
				expect(result.filename).toBe('2024-03-15 - Team Standup (3).md');
			});

			it('detects duplicate by scanning folder for matching frontmatter', async () => {
				// Different filename but same event ID
				const existingContent = `---
calendarEventId: event123
calendarEventStart: 2024-03-15T09:00:00Z
---

# Different Title`;
				existingFiles.set('Meetings/some-other-file.md', existingContent);

				const result = await writer.writeNote(
					sampleEvent,
					sampleTemplate,
					'Meetings',
					'skip'
				);

				expect(result.created).toBe(false);
				expect(result.skipped).toBe(true);
			});
		});

		describe('all-day events', () => {
			it('handles all-day events with empty times', async () => {
				const allDayEvent: CalendarEvent = {
					id: 'allday123',
					title: 'Company Holiday',
					date: '2024-03-15',
					startTime: '',
					endTime: '',
					startISO: '2024-03-15',
					isAllDay: true,
					attendees: [],
				};

				await writer.writeNote(allDayEvent, sampleTemplate, 'Events', 'skip');

				const createdContent = existingFiles.get('Events/2024-03-15 - Company Holiday.md');
				expect(createdContent).toContain('Time:  - ');
			});
		});
	});

	describe('template with frontmatter variables', () => {
		it('returns correct content when template contains calendarEventId and calendarEventStart', async () => {
			// Template that includes the frontmatter variables directly
			const templateWithFrontmatter = `---
calendarEventId: {{calendarEventId}}
calendarEventStart: {{calendarEventStart}}
---

# {{title}}

Date: {{date}}
Time: {{startTime}} - {{endTime}}
Attendees: {{attendees}}
`;

			await writer.writeNote(
				sampleEvent,
				templateWithFrontmatter,
				'Meetings',
				'skip'
			);

			const createdContent = existingFiles.get('Meetings/2024-03-15 - Team Standup.md');

			// Verify frontmatter variables were substituted correctly
			expect(createdContent).toContain('calendarEventId: event123');
			expect(createdContent).toContain('calendarEventStart: 2024-03-15T09:00:00Z');

			// Verify regular variables were also substituted
			expect(createdContent).toContain('# Team Standup');
			expect(createdContent).toContain('Date: 2024-03-15');
			expect(createdContent).toContain('Time: 09:00 - 09:30');

			// Verify no duplicate frontmatter was prepended
			// (template manages its own frontmatter when it contains calendar variables)
			const frontmatterMatches = createdContent?.match(/---/g);
			expect(frontmatterMatches?.length).toBe(2); // Only the template's frontmatter delimiters
		});
	});

	describe('writeNotes', () => {
		it('writes multiple notes and returns summary', async () => {
			const events: CalendarEvent[] = [
				{ ...sampleEvent, id: '1', title: 'Meeting 1' },
				{ ...sampleEvent, id: '2', title: 'Meeting 2' },
				{ ...sampleEvent, id: '3', title: 'Meeting 3' },
			];

			const result = await writer.writeNotes(
				events,
				sampleTemplate,
				'Meetings',
				'skip'
			);

			expect(result.created).toHaveLength(3);
			expect(result.skipped).toHaveLength(0);
		});

		it('reports skipped notes with reasons', async () => {
			// Set up existing note
			existingFiles.set('Meetings/2024-03-15 - Existing.md', `---
calendarEventId: existing
calendarEventStart: 2024-03-15T09:00:00Z
---

# Existing`);

			const events: CalendarEvent[] = [
				{ ...sampleEvent, id: 'existing', title: 'Existing', startISO: '2024-03-15T09:00:00Z' },
				{ ...sampleEvent, id: 'new', title: 'New Meeting' },
			];

			const result = await writer.writeNotes(
				events,
				sampleTemplate,
				'Meetings',
				'skip'
			);

			expect(result.created).toHaveLength(1);
			expect(result.skipped).toHaveLength(1);
			expect(result.skipped[0]?.reason).toBeDefined();
		});
	});
});
