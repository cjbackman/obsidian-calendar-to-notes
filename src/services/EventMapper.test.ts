import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventMapper } from './EventMapper';
import { GoogleCalendarEvent } from '../types';

describe('EventMapper', () => {
	let mapper: EventMapper;

	beforeEach(() => {
		vi.clearAllMocks();
		mapper = new EventMapper();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('mapEvent', () => {
		it('maps a timed event to internal model', () => {
			vi.useFakeTimers();
			// Set timezone to UTC for consistent testing
			vi.setSystemTime(new Date('2024-03-15T12:00:00Z'));

			const googleEvent: GoogleCalendarEvent = {
				id: 'event123',
				summary: 'Team Standup',
				status: 'confirmed',
				start: {
					dateTime: '2024-03-15T09:00:00Z',
				},
				end: {
					dateTime: '2024-03-15T09:30:00Z',
				},
				attendees: [
					{ email: 'alice@example.com', displayName: 'Alice', organizer: true },
					{ email: 'bob@example.com', displayName: 'Bob' },
				],
				organizer: {
					email: 'alice@example.com',
					displayName: 'Alice',
				},
			};

			const result = mapper.mapEvent(googleEvent);

			expect(result.id).toBe('event123');
			expect(result.title).toBe('Team Standup');
			expect(result.startISO).toBe('2024-03-15T09:00:00Z');
			expect(result.isAllDay).toBe(false);
			expect(result.attendees).toHaveLength(2);
			expect(result.organizerEmail).toBe('alice@example.com');
		});

		it('maps an all-day event', () => {
			const googleEvent: GoogleCalendarEvent = {
				id: 'allday123',
				summary: 'Company Holiday',
				status: 'confirmed',
				start: {
					date: '2024-03-15',
				},
				end: {
					date: '2024-03-16',
				},
			};

			const result = mapper.mapEvent(googleEvent);

			expect(result.id).toBe('allday123');
			expect(result.title).toBe('Company Holiday');
			expect(result.date).toBe('2024-03-15');
			expect(result.startTime).toBe('');
			expect(result.endTime).toBe('');
			expect(result.isAllDay).toBe(true);
			expect(result.startISO).toBe('2024-03-15');
		});

		it('handles missing summary with fallback title', () => {
			const googleEvent: GoogleCalendarEvent = {
				id: 'notitle123',
				status: 'confirmed',
				start: {
					dateTime: '2024-03-15T10:00:00Z',
				},
				end: {
					dateTime: '2024-03-15T11:00:00Z',
				},
			};

			const result = mapper.mapEvent(googleEvent);

			expect(result.title).toBe('Untitled event');
		});

		it('handles empty summary with fallback title', () => {
			const googleEvent: GoogleCalendarEvent = {
				id: 'empty123',
				summary: '',
				status: 'confirmed',
				start: {
					dateTime: '2024-03-15T10:00:00Z',
				},
				end: {
					dateTime: '2024-03-15T11:00:00Z',
				},
			};

			const result = mapper.mapEvent(googleEvent);

			expect(result.title).toBe('Untitled event');
		});

		it('maps attendees correctly', () => {
			const googleEvent: GoogleCalendarEvent = {
				id: 'meeting123',
				summary: 'Meeting',
				status: 'confirmed',
				start: { dateTime: '2024-03-15T14:00:00Z' },
				end: { dateTime: '2024-03-15T15:00:00Z' },
				attendees: [
					{ email: 'organizer@example.com', displayName: 'Organizer', organizer: true },
					{ email: 'attendee1@example.com', displayName: 'Attendee One' },
					{ email: 'attendee2@example.com' }, // No display name
				],
				organizer: { email: 'organizer@example.com' },
			};

			const result = mapper.mapEvent(googleEvent);

			expect(result.attendees).toHaveLength(3);
			expect(result.attendees[0]).toEqual({
				email: 'organizer@example.com',
				displayName: 'Organizer',
				isOrganizer: true,
			});
			expect(result.attendees[1]).toEqual({
				email: 'attendee1@example.com',
				displayName: 'Attendee One',
				isOrganizer: false,
			});
			expect(result.attendees[2]).toEqual({
				email: 'attendee2@example.com',
				displayName: undefined,
				isOrganizer: false,
			});
		});

		it('handles event with no attendees', () => {
			const googleEvent: GoogleCalendarEvent = {
				id: 'solo123',
				summary: 'Personal Task',
				status: 'confirmed',
				start: { dateTime: '2024-03-15T10:00:00Z' },
				end: { dateTime: '2024-03-15T11:00:00Z' },
			};

			const result = mapper.mapEvent(googleEvent);

			expect(result.attendees).toEqual([]);
		});

		it('handles event with missing start date and dateTime', () => {
			const googleEvent: GoogleCalendarEvent = {
				id: 'nodate123',
				summary: 'Missing Date Event',
				status: 'confirmed',
				start: {},
				end: {},
			};

			const result = mapper.mapEvent(googleEvent);

			// Should handle gracefully with empty strings
			expect(result.date).toBe('');
			expect(result.startTime).toBe('');
			expect(result.endTime).toBe('');
			expect(result.isAllDay).toBe(true);
		});

		it('handles attendee with missing email', () => {
			const googleEvent: GoogleCalendarEvent = {
				id: 'noemail123',
				summary: 'Meeting',
				status: 'confirmed',
				start: { dateTime: '2024-03-15T10:00:00Z' },
				end: { dateTime: '2024-03-15T11:00:00Z' },
				attendees: [
					{ displayName: 'No Email Person' }, // email is undefined
				],
			};

			const result = mapper.mapEvent(googleEvent);

			expect(result.attendees[0]?.email).toBe('');
		});

		it('extracts organizer email from event', () => {
			const googleEvent: GoogleCalendarEvent = {
				id: 'org123',
				summary: 'Meeting',
				status: 'confirmed',
				start: { dateTime: '2024-03-15T14:00:00Z' },
				end: { dateTime: '2024-03-15T15:00:00Z' },
				organizer: {
					email: 'boss@example.com',
					displayName: 'The Boss',
				},
			};

			const result = mapper.mapEvent(googleEvent);

			expect(result.organizerEmail).toBe('boss@example.com');
		});
	});

	describe('filterCancelled', () => {
		it('filters out cancelled events', () => {
			const events: GoogleCalendarEvent[] = [
				{
					id: '1',
					summary: 'Active Meeting',
					status: 'confirmed',
					start: { dateTime: '2024-03-15T09:00:00Z' },
					end: { dateTime: '2024-03-15T10:00:00Z' },
				},
				{
					id: '2',
					summary: 'Cancelled Meeting',
					status: 'cancelled',
					start: { dateTime: '2024-03-15T11:00:00Z' },
					end: { dateTime: '2024-03-15T12:00:00Z' },
				},
				{
					id: '3',
					summary: 'Tentative Meeting',
					status: 'tentative',
					start: { dateTime: '2024-03-15T13:00:00Z' },
					end: { dateTime: '2024-03-15T14:00:00Z' },
				},
			];

			const result = mapper.filterCancelled(events);

			expect(result).toHaveLength(2);
			expect(result.map(e => e.id)).toEqual(['1', '3']);
		});

		it('returns empty array for all cancelled events', () => {
			const events: GoogleCalendarEvent[] = [
				{
					id: '1',
					summary: 'Cancelled',
					status: 'cancelled',
					start: { dateTime: '2024-03-15T09:00:00Z' },
					end: { dateTime: '2024-03-15T10:00:00Z' },
				},
			];

			const result = mapper.filterCancelled(events);

			expect(result).toEqual([]);
		});
	});

	describe('mapEvents', () => {
		it('maps multiple events and filters cancelled', () => {
			const events: GoogleCalendarEvent[] = [
				{
					id: '1',
					summary: 'Meeting 1',
					status: 'confirmed',
					start: { dateTime: '2024-03-15T09:00:00Z' },
					end: { dateTime: '2024-03-15T10:00:00Z' },
				},
				{
					id: '2',
					summary: 'Cancelled',
					status: 'cancelled',
					start: { dateTime: '2024-03-15T11:00:00Z' },
					end: { dateTime: '2024-03-15T12:00:00Z' },
				},
				{
					id: '3',
					summary: 'Meeting 2',
					status: 'confirmed',
					start: { dateTime: '2024-03-15T13:00:00Z' },
					end: { dateTime: '2024-03-15T14:00:00Z' },
				},
			];

			const result = mapper.mapEvents(events);

			expect(result).toHaveLength(2);
			expect(result[0]?.title).toBe('Meeting 1');
			expect(result[1]?.title).toBe('Meeting 2');
		});
	});
});
