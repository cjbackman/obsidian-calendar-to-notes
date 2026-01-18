import { Attendee } from '../types';

/**
 * Service for formatting attendees as Obsidian wiki links.
 */
export class AttendeeFormatter {
	/**
	 * Format attendees as a comma-separated list of Obsidian wiki links.
	 * 
	 * Rules:
	 * - Uses display name when available
	 * - Falls back to email local-part if no display name
	 * - Excludes organizer from the list
	 * - Deduplicates by email address
	 * 
	 * @returns Formatted string like "[[Alice]], [[Bob]], [[Carol]]"
	 */
	formatAttendees(attendees: Attendee[]): string {
		// Find organizer email to exclude
		const organizerEmail = attendees.find(a => a.isOrganizer)?.email;

		// Deduplicate by email and filter out organizer
		const seen = new Set<string>();
		const filtered: Attendee[] = [];

		for (const attendee of attendees) {
			const email = attendee.email.toLowerCase();
			
			// Skip if already seen or is organizer
			if (seen.has(email)) continue;
			if (organizerEmail && email === organizerEmail.toLowerCase()) continue;

			seen.add(email);
			filtered.push(attendee);
		}

		if (filtered.length === 0) {
			return '';
		}

		return filtered
			.map(a => `[[${this.getDisplayName(a)}]]`)
			.join(', ');
	}

	/**
	 * Get the display name for an attendee.
	 * Uses display name if available, otherwise extracts local part from email.
	 */
	getDisplayName(attendee: Attendee): string {
		if (attendee.displayName && attendee.displayName.trim() !== '') {
			return attendee.displayName;
		}

		// Extract local part from email (before @)
		const atIndex = attendee.email.indexOf('@');
		if (atIndex === -1) {
			return attendee.email;
		}
		return attendee.email.substring(0, atIndex);
	}
}
