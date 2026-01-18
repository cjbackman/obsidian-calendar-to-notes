import { TimeRange } from '../types';

/**
 * Service for calculating time ranges for calendar queries.
 * All operations respect the user's local timezone.
 */
export class TimeRangeService {
	/**
	 * Get the time range for the current day in local timezone.
	 * Start: midnight (00:00:00.000)
	 * End: end of day (23:59:59.999)
	 */
	getCurrentDayRange(): TimeRange {
		const now = new Date();

		const start = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
			0, 0, 0, 0
		);

		const end = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
			23, 59, 59, 999
		);

		return { start, end };
	}

	/**
	 * Create a custom time range from provided dates.
	 */
	getCustomRange(start: Date, end: Date): TimeRange {
		return { start, end };
	}

	/**
	 * Convert a Date to ISO 8601 string for API calls.
	 */
	toISOString(date: Date): string {
		return date.toISOString();
	}

	/**
	 * Format a Date as YYYY-MM-DD in local timezone.
	 */
	formatDateLocal(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	/**
	 * Format a Date as HH:mm in local timezone.
	 */
	formatTimeLocal(date: Date): string {
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		return `${hours}:${minutes}`;
	}
}
