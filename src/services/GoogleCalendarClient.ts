import { requestUrl } from 'obsidian';
import { GoogleCalendar, GoogleCalendarEvent, TimeRange } from '../types';
import { OAuthService } from './OAuthService';

/**
 * Client for Google Calendar API.
 */
export class GoogleCalendarClient {
	private static readonly BASE_URL = 'https://www.googleapis.com/calendar/v3';

	private oauthService: OAuthService;

	constructor(oauthService: OAuthService) {
		this.oauthService = oauthService;
	}

	/**
	 * Get list of calendars accessible by the user.
	 */
	async getCalendars(): Promise<GoogleCalendar[]> {
		const accessToken = await this.oauthService.getAccessToken();

		const response = await requestUrl({
			url: `${GoogleCalendarClient.BASE_URL}/users/me/calendarList`,
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		const data = response.json as {
			items: Array<{
				id: string;
				summary: string;
				primary?: boolean;
			}>;
		};

		return data.items.map(item => ({
			id: item.id,
			summary: item.summary,
			primary: item.primary,
		}));
	}

	/**
	 * Get events from a specific calendar within a time range.
	 * 
	 * @param calendarId - The calendar ID (use 'primary' for the primary calendar)
	 * @param timeRange - Time range to fetch events for
	 */
	async getEvents(calendarId: string, timeRange: TimeRange): Promise<GoogleCalendarEvent[]> {
		const accessToken = await this.oauthService.getAccessToken();

		const params = new URLSearchParams({
			timeMin: timeRange.start.toISOString(),
			timeMax: timeRange.end.toISOString(),
			singleEvents: 'true', // Expand recurring events into instances
			orderBy: 'startTime',
			maxResults: '250', // Reasonable limit for a day/week
		});

		const response = await requestUrl({
			url: `${GoogleCalendarClient.BASE_URL}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		const data = response.json as {
			items: GoogleCalendarEvent[];
		};

		return data.items || [];
	}

	/**
	 * Get events from the primary calendar within a time range.
	 */
	async getPrimaryCalendarEvents(timeRange: TimeRange): Promise<GoogleCalendarEvent[]> {
		return this.getEvents('primary', timeRange);
	}
}
