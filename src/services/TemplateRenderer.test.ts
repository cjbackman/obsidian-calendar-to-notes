import { describe, it, expect } from 'vitest';
import { TemplateRenderer } from './TemplateRenderer';

describe('TemplateRenderer', () => {
	const renderer = new TemplateRenderer();

	describe('render', () => {
		it('substitutes all template variables', () => {
			const template = `# {{title}}

Date: {{date}}
Start: {{startTime}}
End: {{endTime}}
Attendees: {{attendees}}`;

			const variables = {
				title: 'Team Standup',
				date: '2024-03-15',
				startTime: '09:00',
				endTime: '09:30',
				attendees: '[[Alice]], [[Bob]]',
			};

			const result = renderer.render(template, variables);

			expect(result).toBe(`# Team Standup

Date: 2024-03-15
Start: 09:00
End: 09:30
Attendees: [[Alice]], [[Bob]]`);
		});

		it('replaces missing variables with empty string', () => {
			const template = `# {{title}}

Attendees: {{attendees}}`;

			const variables = {
				title: 'Meeting',
				date: '2024-03-15',
				startTime: '09:00',
				endTime: '09:30',
				attendees: '', // Empty attendees
			};

			const result = renderer.render(template, variables);

			expect(result).toBe(`# Meeting

Attendees: `);
		});

		it('handles multiple occurrences of same variable', () => {
			const template = `# {{title}}

This is about {{title}}.`;

			const variables = {
				title: 'Project Review',
				date: '2024-03-15',
				startTime: '10:00',
				endTime: '11:00',
				attendees: '',
			};

			const result = renderer.render(template, variables);

			expect(result).toBe(`# Project Review

This is about Project Review.`);
		});

		it('handles template with no variables', () => {
			const template = `# Static Template

No variables here.`;

			const variables = {
				title: 'Unused',
				date: '2024-03-15',
				startTime: '09:00',
				endTime: '09:30',
				attendees: '',
			};

			const result = renderer.render(template, variables);

			expect(result).toBe(`# Static Template

No variables here.`);
		});

		it('handles undefined variable by replacing with empty string', () => {
			const template = `Title: {{title}}
Unknown: {{unknown}}`;

			const variables = {
				title: 'Meeting',
				date: '2024-03-15',
				startTime: '09:00',
				endTime: '09:30',
				attendees: '',
			};

			const result = renderer.render(template, variables);

			// Unknown variable should become empty string
			expect(result).toBe(`Title: Meeting
Unknown: `);
		});

		it('preserves whitespace and newlines', () => {
			const template = `# {{title}}

    Indented content

- List item 1
- List item 2`;

			const variables = {
				title: 'Formatted',
				date: '2024-03-15',
				startTime: '09:00',
				endTime: '09:30',
				attendees: '',
			};

			const result = renderer.render(template, variables);

			expect(result).toBe(`# Formatted

    Indented content

- List item 1
- List item 2`);
		});

		it('handles special characters in variable values', () => {
			const template = `# {{title}}`;

			const variables = {
				title: 'Meeting: Q&A (Important!)',
				date: '2024-03-15',
				startTime: '09:00',
				endTime: '09:30',
				attendees: '',
			};

			const result = renderer.render(template, variables);

			expect(result).toBe(`# Meeting: Q&A (Important!)`);
		});

		it('handles markdown special characters in title', () => {
			const template = `# {{title}}

Content here.`;

			const variables = {
				title: '## Not a heading',
				date: '2024-03-15',
				startTime: '09:00',
				endTime: '09:30',
				attendees: '',
			};

			const result = renderer.render(template, variables);

			expect(result).toBe(`# ## Not a heading

Content here.`);
		});

		it('handles empty template', () => {
			const template = '';

			const variables = {
				title: 'Meeting',
				date: '2024-03-15',
				startTime: '09:00',
				endTime: '09:30',
				attendees: '',
			};

			const result = renderer.render(template, variables);

			expect(result).toBe('');
		});

		it('handles all-day events with empty times', () => {
			const template = `# {{title}}

Date: {{date}}
Time: {{startTime}} - {{endTime}}`;

			const variables = {
				title: 'All Day Event',
				date: '2024-03-15',
				startTime: '', // All-day events have no time
				endTime: '',
				attendees: '',
			};

			const result = renderer.render(template, variables);

			expect(result).toBe(`# All Day Event

Date: 2024-03-15
Time:  - `);
		});
	});

	describe('getVariableNames', () => {
		it('extracts all variable names from template', () => {
			const template = `{{title}} on {{date}} from {{startTime}} to {{endTime}}`;

			const names = renderer.getVariableNames(template);

			expect(names).toEqual(['title', 'date', 'startTime', 'endTime']);
		});

		it('returns unique variable names', () => {
			const template = `{{title}} and {{title}} again`;

			const names = renderer.getVariableNames(template);

			expect(names).toEqual(['title']);
		});

		it('returns empty array for template with no variables', () => {
			const template = `No variables here`;

			const names = renderer.getVariableNames(template);

			expect(names).toEqual([]);
		});
	});
});
