import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleCalendarClient } from './GoogleCalendarClient';
import { OAuthService } from './OAuthService';
import { requestUrl } from 'obsidian';

describe('GoogleCalendarClient', () => {
	let client: GoogleCalendarClient;
	let mockOAuthService: OAuthService;

	beforeEach(() => {
		vi.clearAllMocks();

		mockOAuthService = {
			getAccessToken: vi.fn().mockResolvedValue('test-access-token'),
		} as unknown as OAuthService;

		client = new GoogleCalendarClient(mockOAuthService);
	});

	describe('getCalendars', () => {
		it('fetches calendars with correct authorization header', async () => {
			vi.mocked(requestUrl).mockResolvedValue({
				json: {
					items: [
						{ id: 'cal1', summary: 'Work', primary: true },
						{ id: 'cal2', summary: 'Personal' },
					],
				},
			} as never);

			const calendars = await client.getCalendars();

			expect(requestUrl).toHaveBeenCalledWith({
				url: 'https://www.googleapis.com/calendar/v3/users/me/calendarList',
				headers: {
					Authorization: 'Bearer test-access-token',
				},
			});

			expect(calendars).toHaveLength(2);
			expect(calendars[0]).toEqual({ id: 'cal1', summary: 'Work', primary: true });
			expect(calendars[1]).toEqual({ id: 'cal2', summary: 'Personal', primary: undefined });
		});
	});

	describe('getEvents', () => {
		it('fetches events with correct parameters', async () => {
			const timeRange = {
				start: new Date('2024-03-15T00:00:00Z'),
				end: new Date('2024-03-16T00:00:00Z'),
			};

			vi.mocked(requestUrl).mockResolvedValue({
				json: {
					items: [
						{
							id: 'event1',
							summary: 'Team Meeting',
							status: 'confirmed',
							start: { dateTime: '2024-03-15T09:00:00Z' },
							end: { dateTime: '2024-03-15T10:00:00Z' },
						},
					],
				},
			} as never);

			const events = await client.getEvents('primary', timeRange);

			expect(requestUrl).toHaveBeenCalledOnce();
			const callArgs = vi.mocked(requestUrl).mock.calls[0]?.[0];

			expect(callArgs?.url).toContain('https://www.googleapis.com/calendar/v3/calendars/primary/events');
			expect(callArgs?.url).toContain('timeMin=2024-03-15T00%3A00%3A00.000Z');
			expect(callArgs?.url).toContain('timeMax=2024-03-16T00%3A00%3A00.000Z');
			expect(callArgs?.url).toContain('singleEvents=true');
			expect(callArgs?.url).toContain('orderBy=startTime');
			expect(callArgs?.headers?.Authorization).toBe('Bearer test-access-token');

			expect(events).toHaveLength(1);
			expect(events[0]?.summary).toBe('Team Meeting');
		});

		it('encodes calendar ID in URL', async () => {
			const timeRange = {
				start: new Date('2024-03-15T00:00:00Z'),
				end: new Date('2024-03-16T00:00:00Z'),
			};

			vi.mocked(requestUrl).mockResolvedValue({
				json: { items: [] },
			} as never);

			await client.getEvents('user@example.com', timeRange);

			const callArgs = vi.mocked(requestUrl).mock.calls[0]?.[0];
			expect(callArgs?.url).toContain('calendars/user%40example.com/events');
		});

		it('returns empty array when no items in response', async () => {
			const timeRange = {
				start: new Date('2024-03-15T00:00:00Z'),
				end: new Date('2024-03-16T00:00:00Z'),
			};

			vi.mocked(requestUrl).mockResolvedValue({
				json: {},
			} as never);

			const events = await client.getEvents('primary', timeRange);
			expect(events).toEqual([]);
		});
	});

	describe('getPrimaryCalendarEvents', () => {
		it('calls getEvents with primary calendar', async () => {
			const timeRange = {
				start: new Date('2024-03-15T00:00:00Z'),
				end: new Date('2024-03-16T00:00:00Z'),
			};

			vi.mocked(requestUrl).mockResolvedValue({
				json: { items: [] },
			} as never);

			await client.getPrimaryCalendarEvents(timeRange);

			const callArgs = vi.mocked(requestUrl).mock.calls[0]?.[0];
			expect(callArgs?.url).toContain('calendars/primary/events');
		});
	});
});
