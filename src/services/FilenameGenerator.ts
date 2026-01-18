/**
 * Service for generating sanitized filenames for meeting notes.
 * 
 * Filename format: YYYY-MM-DD - <sanitized title>.md
 */
export class FilenameGenerator {
	private static readonly FALLBACK_TITLE = 'Untitled meeting';
	private static readonly MAX_FILENAME_LENGTH = 255;
	private static readonly EXTENSION = '.md';

	// Characters illegal in filenames on Windows/Mac/Linux
	private static readonly ILLEGAL_CHARS = /[/\\:*?"<>|]/g;

	/**
	 * Generate a filename from date and title.
	 * 
	 * @param date - Date string in YYYY-MM-DD format
	 * @param title - Event title (will be sanitized)
	 * @returns Filename like "2024-03-15 - Team Standup.md"
	 */
	generate(date: string, title: string): string {
		const sanitizedTitle = this.sanitize(title);
		const finalTitle = sanitizedTitle || FilenameGenerator.FALLBACK_TITLE;

		const prefix = `${date} - `;
		const maxTitleLength = FilenameGenerator.MAX_FILENAME_LENGTH 
			- prefix.length 
			- FilenameGenerator.EXTENSION.length;

		const truncatedTitle = finalTitle.length > maxTitleLength
			? finalTitle.substring(0, maxTitleLength)
			: finalTitle;

		return `${prefix}${truncatedTitle}${FilenameGenerator.EXTENSION}`;
	}

	/**
	 * Generate a filename with a numeric suffix for conflict resolution.
	 * 
	 * @param date - Date string in YYYY-MM-DD format
	 * @param title - Event title (will be sanitized)
	 * @param suffix - Numeric suffix (1, 2, 3, etc.)
	 * @returns Filename like "2024-03-15 - Team Standup (1).md"
	 */
	generateWithSuffix(date: string, title: string, suffix: number): string {
		const sanitizedTitle = this.sanitize(title);
		const finalTitle = sanitizedTitle || FilenameGenerator.FALLBACK_TITLE;

		return `${date} - ${finalTitle} (${suffix})${FilenameGenerator.EXTENSION}`;
	}

	/**
	 * Sanitize a string for use in a filename.
	 * 
	 * - Removes illegal filesystem characters
	 * - Normalizes multiple whitespaces to single space
	 * - Trims leading/trailing whitespace
	 */
	sanitize(input: string): string {
		return input
			.replace(FilenameGenerator.ILLEGAL_CHARS, '')
			.replace(/\s+/g, ' ')
			.trim();
	}
}
