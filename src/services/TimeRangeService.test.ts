import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TimeRangeService } from './TimeRangeService';

describe('TimeRangeService', () => {
	let service: TimeRangeService;

	beforeEach(() => {
		service = new TimeRangeService();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('getCurrentDayRange', () => {
		it('returns start at midnight and end at 23:59:59.999 in local timezone', () => {
			// Mock current time to a known value
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2024-03-15T14:30:00'));

			const range = service.getCurrentDayRange();

			// Start should be at midnight local time
			expect(range.start.getFullYear()).toBe(2024);
			expect(range.start.getMonth()).toBe(2); // March (0-indexed)
			expect(range.start.getDate()).toBe(15);
			expect(range.start.getHours()).toBe(0);
			expect(range.start.getMinutes()).toBe(0);
			expect(range.start.getSeconds()).toBe(0);
			expect(range.start.getMilliseconds()).toBe(0);

			// End should be at 23:59:59.999 local time
			expect(range.end.getFullYear()).toBe(2024);
			expect(range.end.getMonth()).toBe(2);
			expect(range.end.getDate()).toBe(15);
			expect(range.end.getHours()).toBe(23);
			expect(range.end.getMinutes()).toBe(59);
			expect(range.end.getSeconds()).toBe(59);
			expect(range.end.getMilliseconds()).toBe(999);
		});

		it('handles day boundaries correctly near midnight', () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2024-03-15T00:01:00'));

			const range = service.getCurrentDayRange();

			expect(range.start.getDate()).toBe(15);
			expect(range.end.getDate()).toBe(15);
		});

		it('handles month boundaries correctly', () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2024-02-29T12:00:00')); // Leap year

			const range = service.getCurrentDayRange();

			expect(range.start.getMonth()).toBe(1); // February
			expect(range.start.getDate()).toBe(29);
			expect(range.end.getMonth()).toBe(1);
			expect(range.end.getDate()).toBe(29);
		});

		it('handles year boundaries correctly', () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2024-12-31T18:00:00'));

			const range = service.getCurrentDayRange();

			expect(range.start.getFullYear()).toBe(2024);
			expect(range.start.getMonth()).toBe(11); // December
			expect(range.start.getDate()).toBe(31);
		});
	});

	describe('getCustomRange', () => {
		it('returns the provided start and end dates', () => {
			const start = new Date('2024-03-15T09:00:00');
			const end = new Date('2024-03-15T17:00:00');

			const range = service.getCustomRange(start, end);

			expect(range.start).toEqual(start);
			expect(range.end).toEqual(end);
		});

		it('handles multi-day ranges', () => {
			const start = new Date('2024-03-15T00:00:00');
			const end = new Date('2024-03-20T23:59:59');

			const range = service.getCustomRange(start, end);

			expect(range.start.getDate()).toBe(15);
			expect(range.end.getDate()).toBe(20);
		});
	});

	describe('toISOString', () => {
		it('converts Date to ISO 8601 string for API calls', () => {
			const date = new Date('2024-03-15T14:30:00.000Z');

			const iso = service.toISOString(date);

			expect(iso).toBe('2024-03-15T14:30:00.000Z');
		});
	});

	describe('formatDateLocal', () => {
		it('formats date as YYYY-MM-DD in local timezone', () => {
			// Use a date that won't shift days due to timezone
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2024-03-15T12:00:00'));

			const date = new Date();
			const formatted = service.formatDateLocal(date);

			expect(formatted).toBe('2024-03-15');
		});

		it('pads single-digit month and day with zeros', () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2024-01-05T12:00:00'));

			const date = new Date();
			const formatted = service.formatDateLocal(date);

			expect(formatted).toBe('2024-01-05');
		});
	});

	describe('formatTimeLocal', () => {
		it('formats time as HH:mm in local timezone', () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2024-03-15T14:30:00'));

			const date = new Date();
			const formatted = service.formatTimeLocal(date);

			expect(formatted).toBe('14:30');
		});

		it('pads single-digit hours and minutes with zeros', () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2024-03-15T09:05:00'));

			const date = new Date();
			const formatted = service.formatTimeLocal(date);

			expect(formatted).toBe('09:05');
		});

		it('handles midnight correctly', () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2024-03-15T00:00:00'));

			const date = new Date();
			const formatted = service.formatTimeLocal(date);

			expect(formatted).toBe('00:00');
		});
	});
});
