import { GoogleCalendarEvent, CalendarEvent, Attendee } from '../types';
import { TimeRangeService } from './TimeRangeService';

/**
 * Service for mapping Google Calendar events to internal model.
 */
export class EventMapper {
	private static readonly FALLBACK_TITLE = 'Untitled event';
	private timeRangeService = new TimeRangeService();

	/**
	 * Map a single Google Calendar event to internal CalendarEvent model.
	 */
	mapEvent(event: GoogleCalendarEvent): CalendarEvent {
		const isAllDay = !event.start.dateTime;
		const startDateTime = event.start.dateTime || event.start.date || '';
		const endDateTime = event.end.dateTime || event.end.date || '';

		let date: string;
		let startTime: string;
		let endTime: string;
		let startISO: string;

		if (isAllDay) {
			// All-day events: use the date directly
			date = event.start.date || '';
			startTime = '';
			endTime = '';
			startISO = date;
		} else {
			// Timed events: parse the ISO datetime
			const startDate = new Date(startDateTime);
			const endDate = new Date(endDateTime);

			date = this.timeRangeService.formatDateLocal(startDate);
			startTime = this.timeRangeService.formatTimeLocal(startDate);
			endTime = this.timeRangeService.formatTimeLocal(endDate);
			startISO = startDateTime;
		}

		return {
			id: event.id,
			title: event.summary?.trim() || EventMapper.FALLBACK_TITLE,
			date,
			startTime,
			endTime,
			startISO,
			isAllDay,
			attendees: this.mapAttendees(event.attendees || []),
			organizerEmail: event.organizer?.email,
		};
	}

	/**
	 * Filter out cancelled events.
	 */
	filterCancelled(events: GoogleCalendarEvent[]): GoogleCalendarEvent[] {
		return events.filter(event => event.status !== 'cancelled');
	}

	/**
	 * Map multiple events, filtering out cancelled ones.
	 */
	mapEvents(events: GoogleCalendarEvent[]): CalendarEvent[] {
		return this.filterCancelled(events).map(event => this.mapEvent(event));
	}

	/**
	 * Map Google attendees to internal Attendee model.
	 */
	private mapAttendees(attendees: GoogleCalendarEvent['attendees']): Attendee[] {
		if (!attendees) return [];

		return attendees.map(attendee => ({
			email: attendee.email || '',
			displayName: attendee.displayName,
			isOrganizer: attendee.organizer || false,
		}));
	}
}
