import { describe, it, expect } from 'vitest';
import { AttendeeFormatter } from './AttendeeFormatter';
import { Attendee } from '../types';

describe('AttendeeFormatter', () => {
	const formatter = new AttendeeFormatter();

	describe('formatAttendees', () => {
		it('formats attendees as Obsidian wiki links with display names', () => {
			const attendees: Attendee[] = [
				{ displayName: 'Alice Smith', email: 'alice@example.com', isOrganizer: false },
				{ displayName: 'Bob Jones', email: 'bob@example.com', isOrganizer: false },
			];

			const result = formatter.formatAttendees(attendees);

			expect(result).toBe('[[Alice Smith]], [[Bob Jones]]');
		});

		it('uses email local-part when display name is missing', () => {
			const attendees: Attendee[] = [
				{ email: 'alice.smith@example.com', isOrganizer: false },
				{ displayName: 'Bob Jones', email: 'bob@example.com', isOrganizer: false },
			];

			const result = formatter.formatAttendees(attendees);

			expect(result).toBe('[[alice.smith]], [[Bob Jones]]');
		});

		it('excludes organizer from the list', () => {
			const attendees: Attendee[] = [
				{ displayName: 'Alice Smith', email: 'alice@example.com', isOrganizer: true },
				{ displayName: 'Bob Jones', email: 'bob@example.com', isOrganizer: false },
				{ displayName: 'Carol White', email: 'carol@example.com', isOrganizer: false },
			];

			const result = formatter.formatAttendees(attendees);

			expect(result).toBe('[[Bob Jones]], [[Carol White]]');
		});

		it('does not include organizer twice even if listed separately', () => {
			const attendees: Attendee[] = [
				{ displayName: 'Alice Smith', email: 'alice@example.com', isOrganizer: true },
				{ displayName: 'Alice Smith', email: 'alice@example.com', isOrganizer: false },
				{ displayName: 'Bob Jones', email: 'bob@example.com', isOrganizer: false },
			];

			const result = formatter.formatAttendees(attendees);

			// Should only include Bob, not Alice twice
			expect(result).toBe('[[Bob Jones]]');
		});

		it('returns empty string for empty attendee list', () => {
			const result = formatter.formatAttendees([]);

			expect(result).toBe('');
		});

		it('returns empty string when only organizer is present', () => {
			const attendees: Attendee[] = [
				{ displayName: 'Alice Smith', email: 'alice@example.com', isOrganizer: true },
			];

			const result = formatter.formatAttendees(attendees);

			expect(result).toBe('');
		});

		it('handles single attendee (non-organizer)', () => {
			const attendees: Attendee[] = [
				{ displayName: 'Bob Jones', email: 'bob@example.com', isOrganizer: false },
			];

			const result = formatter.formatAttendees(attendees);

			expect(result).toBe('[[Bob Jones]]');
		});

		it('handles attendees with empty display name', () => {
			const attendees: Attendee[] = [
				{ displayName: '', email: 'alice@example.com', isOrganizer: false },
			];

			const result = formatter.formatAttendees(attendees);

			expect(result).toBe('[[alice]]');
		});

		it('handles complex email local parts', () => {
			const attendees: Attendee[] = [
				{ email: 'alice.smith+work@example.com', isOrganizer: false },
				{ email: 'bob_jones@example.com', isOrganizer: false },
			];

			const result = formatter.formatAttendees(attendees);

			expect(result).toBe('[[alice.smith+work]], [[bob_jones]]');
		});

		it('deduplicates attendees by email', () => {
			const attendees: Attendee[] = [
				{ displayName: 'Alice', email: 'alice@example.com', isOrganizer: false },
				{ displayName: 'Alice Smith', email: 'alice@example.com', isOrganizer: false },
				{ displayName: 'Bob', email: 'bob@example.com', isOrganizer: false },
			];

			const result = formatter.formatAttendees(attendees);

			// Should use first occurrence's display name
			expect(result).toBe('[[Alice]], [[Bob]]');
		});
	});

	describe('getDisplayName', () => {
		it('returns display name when available', () => {
			const attendee: Attendee = {
				displayName: 'Alice Smith',
				email: 'alice@example.com',
				isOrganizer: false,
			};

			const result = formatter.getDisplayName(attendee);

			expect(result).toBe('Alice Smith');
		});

		it('extracts local part from email when no display name', () => {
			const attendee: Attendee = {
				email: 'alice.smith@example.com',
				isOrganizer: false,
			};

			const result = formatter.getDisplayName(attendee);

			expect(result).toBe('alice.smith');
		});

		it('handles email without @ symbol gracefully', () => {
			const attendee: Attendee = {
				email: 'invalid-email',
				isOrganizer: false,
			};

			const result = formatter.getDisplayName(attendee);

			expect(result).toBe('invalid-email');
		});
	});
});
