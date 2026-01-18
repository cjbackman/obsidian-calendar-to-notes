/**
 * Plugin settings stored via Obsidian's saveData/loadData
 */
export interface PluginSettings {
	// OAuth configuration
	googleClientId: string;
	googleClientSecret: string;

	// OAuth tokens (stored encrypted ideally, but using saveData for simplicity)
	oauthTokens: OAuthTokens | null;

	// User preferences
	defaultCalendarId: string;
	templateNotePath: string;
	conflictPolicy: ConflictPolicy;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	googleClientId: '',
	googleClientSecret: '',
	oauthTokens: null,
	defaultCalendarId: '',
	templateNotePath: '',
	conflictPolicy: 'skip',
};

/**
 * OAuth tokens from Google
 */
export interface OAuthTokens {
	accessToken: string;
	refreshToken: string;
	expiresAt: number; // Unix timestamp in milliseconds
}

/**
 * Conflict resolution policy when a note already exists
 */
export type ConflictPolicy = 'skip' | 'overwrite' | 'suffix';

/**
 * Time range options for fetching calendar events
 */
export type TimeRangePreset = 'current-day' | 'custom';

export interface TimeRange {
	start: Date;
	end: Date;
}

/**
 * Google Calendar from the API
 */
export interface GoogleCalendar {
	id: string;
	summary: string;
	primary?: boolean;
}

/**
 * Google Calendar Event from the API (simplified)
 */
export interface GoogleCalendarEvent {
	id: string;
	summary?: string;
	description?: string;
	status: 'confirmed' | 'tentative' | 'cancelled';
	start: {
		dateTime?: string; // RFC3339 for timed events
		date?: string; // YYYY-MM-DD for all-day events
		timeZone?: string;
	};
	end: {
		dateTime?: string;
		date?: string;
		timeZone?: string;
	};
	attendees?: GoogleAttendee[];
	organizer?: {
		email?: string;
		displayName?: string;
		self?: boolean;
	};
	recurringEventId?: string;
}

export interface GoogleAttendee {
	email?: string;
	displayName?: string;
	organizer?: boolean;
	self?: boolean;
	responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
}

/**
 * Internal calendar event model (mapped from Google API)
 */
export interface CalendarEvent {
	id: string;
	title: string;
	date: string; // YYYY-MM-DD in local timezone
	startTime: string; // HH:mm in local timezone (empty for all-day)
	endTime: string; // HH:mm in local timezone (empty for all-day)
	startISO: string; // Full ISO datetime for frontmatter
	isAllDay: boolean;
	attendees: Attendee[];
	organizerEmail?: string;
}

export interface Attendee {
	displayName?: string;
	email: string;
	isOrganizer: boolean;
}

/**
 * Result of note generation
 */
export interface NoteGenerationResult {
	created: string[];
	skipped: Array<{ filename: string; reason: string }>;
}

/**
 * Frontmatter data for deduplication
 */
export interface NoteFrontmatter {
	calendarEventId: string;
	calendarEventStart: string;
}
