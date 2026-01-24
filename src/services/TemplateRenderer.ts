/**
 * Template variables for note generation.
 */
export interface TemplateVariables {
	title: string;
	date: string;
	startTime: string;
	endTime: string;
	attendees: string;
	calendarEventId: string;
	calendarEventStart: string;
}

/**
 * Service for rendering templates with variable substitution.
 * 
 * Supported variables:
 * - {{title}} - Event title
 * - {{date}} - Date in YYYY-MM-DD format
 * - {{startTime}} - Start time in HH:mm format
 * - {{endTime}} - End time in HH:mm format
 * - {{attendees}} - Formatted attendee list
 * - {{calendarEventId}} - Unique event ID for deduplication
 * - {{calendarEventStart}} - Event start time in ISO format
 */
export class TemplateRenderer {
	private static readonly VARIABLE_PATTERN = /\{\{(\w+)\}\}/g;

	/**
	 * Render a template by substituting variables with their values.
	 * Missing or unknown variables are replaced with empty string.
	 * 
	 * @param template - Template string with {{variable}} placeholders
	 * @param variables - Object containing variable values
	 * @returns Rendered string with all variables substituted
	 */
	render(template: string, variables: TemplateVariables): string {
		return template.replace(
			TemplateRenderer.VARIABLE_PATTERN,
			(match, varName: string) => {
				const value = variables[varName as keyof TemplateVariables];
				return value !== undefined ? value : '';
			}
		);
	}

	/**
	 * Extract unique variable names from a template.
	 * 
	 * @param template - Template string
	 * @returns Array of unique variable names found in the template
	 */
	getVariableNames(template: string): string[] {
		const names = new Set<string>();
		let match;

		// Create new RegExp instance to reset lastIndex
		const pattern = new RegExp(TemplateRenderer.VARIABLE_PATTERN.source, 'g');

		while ((match = pattern.exec(template)) !== null) {
			if (match[1]) {
				names.add(match[1]);
			}
		}

		return Array.from(names);
	}
}
