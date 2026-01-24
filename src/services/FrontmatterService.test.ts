import { describe, it, expect } from 'vitest';
import { FrontmatterService } from './FrontmatterService';
import { NoteFrontmatter } from '../types';

describe('FrontmatterService', () => {
	const service = new FrontmatterService();

	describe('generate', () => {
		it('generates YAML frontmatter with event identifiers', () => {
			const frontmatter: NoteFrontmatter = {
				calendarEventId: 'abc123',
				calendarEventStart: '2024-03-15T09:00:00Z',
			};

			const result = service.generate(frontmatter);

			expect(result).toBe(`---
calendarEventId: abc123
calendarEventStart: 2024-03-15T09:00:00Z
---`);
		});

		it('handles event ID with special characters', () => {
			const frontmatter: NoteFrontmatter = {
				calendarEventId: 'abc_123-def',
				calendarEventStart: '2024-03-15T09:00:00Z',
			};

			const result = service.generate(frontmatter);

			expect(result).toContain('calendarEventId: abc_123-def');
		});

		it('quotes values with colons', () => {
			const frontmatter: NoteFrontmatter = {
				calendarEventId: 'id:with:colons',
				calendarEventStart: '2024-03-15T09:00:00Z',
			};

			const result = service.generate(frontmatter);

			// Value with colons should be quoted
			expect(result).toContain('calendarEventId: "id:with:colons"');
		});
	});

	describe('parse', () => {
		it('parses valid frontmatter', () => {
			const content = `---
calendarEventId: abc123
calendarEventStart: 2024-03-15T09:00:00Z
---

# Meeting Notes`;

			const result = service.parse(content);

			expect(result).toEqual({
				calendarEventId: 'abc123',
				calendarEventStart: '2024-03-15T09:00:00Z',
			});
		});

		it('parses frontmatter with quoted values', () => {
			const content = `---
calendarEventId: "id:with:colons"
calendarEventStart: "2024-03-15T09:00:00Z"
---`;

			const result = service.parse(content);

			expect(result).toEqual({
				calendarEventId: 'id:with:colons',
				calendarEventStart: '2024-03-15T09:00:00Z',
			});
		});

		it('returns null for content without frontmatter', () => {
			const content = `# Meeting Notes

No frontmatter here.`;

			const result = service.parse(content);

			expect(result).toBeNull();
		});

		it('returns null for content with incomplete frontmatter', () => {
			const content = `---
calendarEventId: abc123
# Missing closing ---`;

			const result = service.parse(content);

			expect(result).toBeNull();
		});

		it('returns null when required fields are missing', () => {
			const content = `---
calendarEventId: abc123
otherField: value
---`;

			const result = service.parse(content);

			expect(result).toBeNull();
		});

		it('returns null for empty content', () => {
			const result = service.parse('');

			expect(result).toBeNull();
		});

		it('handles extra fields in frontmatter', () => {
			const content = `---
calendarEventId: abc123
calendarEventStart: 2024-03-15T09:00:00Z
customField: value
---`;

			const result = service.parse(content);

			expect(result).toEqual({
				calendarEventId: 'abc123',
				calendarEventStart: '2024-03-15T09:00:00Z',
			});
		});

		it('parses single-quoted values', () => {
			const content = `---
calendarEventId: 'abc123'
calendarEventStart: '2024-03-15T09:00:00Z'
---`;

			const result = service.parse(content);

			expect(result).toEqual({
				calendarEventId: 'abc123',
				calendarEventStart: '2024-03-15T09:00:00Z',
			});
		});

		it('skips lines without colons', () => {
			const content = `---
calendarEventId: abc123
this line has no colon
calendarEventStart: 2024-03-15T09:00:00Z
---`;

			const result = service.parse(content);

			expect(result).toEqual({
				calendarEventId: 'abc123',
				calendarEventStart: '2024-03-15T09:00:00Z',
			});
		});
	});

	describe('prependToContent', () => {
		it('prepends frontmatter to content', () => {
			const frontmatter: NoteFrontmatter = {
				calendarEventId: 'abc123',
				calendarEventStart: '2024-03-15T09:00:00Z',
			};
			const body = '# Meeting Notes\n\nContent here.';

			const result = service.prependToContent(frontmatter, body);

			expect(result).toBe(`---
calendarEventId: abc123
calendarEventStart: 2024-03-15T09:00:00Z
---

# Meeting Notes

Content here.`);
		});

		it('handles empty body', () => {
			const frontmatter: NoteFrontmatter = {
				calendarEventId: 'abc123',
				calendarEventStart: '2024-03-15T09:00:00Z',
			};

			const result = service.prependToContent(frontmatter, '');

			expect(result).toBe(`---
calendarEventId: abc123
calendarEventStart: 2024-03-15T09:00:00Z
---

`);
		});
	});

	describe('matches', () => {
		it('returns true when both fields match', () => {
			const content = `---
calendarEventId: abc123
calendarEventStart: 2024-03-15T09:00:00Z
---`;

			const target: NoteFrontmatter = {
				calendarEventId: 'abc123',
				calendarEventStart: '2024-03-15T09:00:00Z',
			};

			const result = service.matches(content, target);

			expect(result).toBe(true);
		});

		it('returns false when eventId differs', () => {
			const content = `---
calendarEventId: different
calendarEventStart: 2024-03-15T09:00:00Z
---`;

			const target: NoteFrontmatter = {
				calendarEventId: 'abc123',
				calendarEventStart: '2024-03-15T09:00:00Z',
			};

			const result = service.matches(content, target);

			expect(result).toBe(false);
		});

		it('returns false when start time differs', () => {
			const content = `---
calendarEventId: abc123
calendarEventStart: 2024-03-16T09:00:00Z
---`;

			const target: NoteFrontmatter = {
				calendarEventId: 'abc123',
				calendarEventStart: '2024-03-15T09:00:00Z',
			};

			const result = service.matches(content, target);

			expect(result).toBe(false);
		});

		it('returns false when content has no frontmatter', () => {
			const content = '# No frontmatter';

			const target: NoteFrontmatter = {
				calendarEventId: 'abc123',
				calendarEventStart: '2024-03-15T09:00:00Z',
			};

			const result = service.matches(content, target);

			expect(result).toBe(false);
		});
	});
});
