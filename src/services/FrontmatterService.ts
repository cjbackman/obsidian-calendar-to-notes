import { NoteFrontmatter } from '../types';

/**
 * Service for parsing and generating YAML frontmatter.
 * 
 * Frontmatter format:
 * ---
 * calendarEventId: <id>
 * calendarEventStart: <iso-datetime>
 * ---
 */
export class FrontmatterService {
	private static readonly FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---/;

	/**
	 * Generate YAML frontmatter string from data.
	 */
	generate(data: NoteFrontmatter): string {
		const eventId = this.formatValue(data.calendarEventId);
		const eventStart = this.formatValue(data.calendarEventStart);

		return `---
calendarEventId: ${eventId}
calendarEventStart: ${eventStart}
---`;
	}

	/**
	 * Parse frontmatter from note content.
	 * Returns null if frontmatter is missing or invalid.
	 */
	parse(content: string): NoteFrontmatter | null {
		if (!content) {
			return null;
		}

		const match = content.match(FrontmatterService.FRONTMATTER_REGEX);
		if (!match || !match[1]) {
			return null;
		}

		const yaml = match[1];
		const fields: Record<string, string> = {};

		// Simple YAML parser for key: value pairs
		for (const line of yaml.split('\n')) {
			const colonIndex = line.indexOf(':');
			if (colonIndex === -1) continue;

			const key = line.substring(0, colonIndex).trim();
			let value = line.substring(colonIndex + 1).trim();

			// Remove quotes if present
			if ((value.startsWith('"') && value.endsWith('"')) ||
				(value.startsWith("'") && value.endsWith("'"))) {
				value = value.slice(1, -1);
			}

			fields[key] = value;
		}

		// Validate required fields
		if (!fields['calendarEventId'] || !fields['calendarEventStart']) {
			return null;
		}

		return {
			calendarEventId: fields['calendarEventId'],
			calendarEventStart: fields['calendarEventStart'],
		};
	}

	/**
	 * Prepend frontmatter to content body.
	 */
	prependToContent(frontmatter: NoteFrontmatter, body: string): string {
		const yaml = this.generate(frontmatter);
		return `${yaml}\n\n${body}`;
	}

	/**
	 * Check if content's frontmatter matches the target.
	 */
	matches(content: string, target: NoteFrontmatter): boolean {
		const parsed = this.parse(content);
		if (!parsed) {
			return false;
		}

		return parsed.calendarEventId === target.calendarEventId &&
			parsed.calendarEventStart === target.calendarEventStart;
	}

	/**
	 * Format a value for YAML output.
	 * Quotes strings that contain special characters that could break YAML parsing.
	 */
	private formatValue(value: string): string {
		// ISO timestamps like 2024-03-15T09:00:00Z are safe in YAML without quotes
		// Only quote if contains YAML special chars that aren't part of timestamps
		const isISOTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
		
		if (!isISOTimestamp && (value.includes(':') || value.includes('#') || value.includes("'") || value.includes('"'))) {
			// Escape internal quotes and wrap in quotes
			return `"${value.replace(/"/g, '\\"')}"`;
		}
		return value;
	}
}
