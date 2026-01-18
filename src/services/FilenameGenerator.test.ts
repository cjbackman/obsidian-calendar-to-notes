import { describe, it, expect } from 'vitest';
import { FilenameGenerator } from './FilenameGenerator';

describe('FilenameGenerator', () => {
	const generator = new FilenameGenerator();

	describe('generate', () => {
		it('creates filename with YYYY-MM-DD prefix and title', () => {
			const result = generator.generate('2024-03-15', 'Team Standup');

			expect(result).toBe('2024-03-15 - Team Standup.md');
		});

		it('sanitizes illegal filesystem characters', () => {
			const result = generator.generate('2024-03-15', 'Q1/Q2 Planning: Goals?');

			// Should remove / : ?
			expect(result).toBe('2024-03-15 - Q1Q2 Planning Goals.md');
		});

		it('removes backslash from title', () => {
			const result = generator.generate('2024-03-15', 'Review\\Feedback');

			expect(result).toBe('2024-03-15 - ReviewFeedback.md');
		});

		it('removes asterisk from title', () => {
			const result = generator.generate('2024-03-15', 'Important* Meeting');

			expect(result).toBe('2024-03-15 - Important Meeting.md');
		});

		it('removes quotes from title', () => {
			const result = generator.generate('2024-03-15', '"Project Review"');

			expect(result).toBe('2024-03-15 - Project Review.md');
		});

		it('removes angle brackets from title', () => {
			const result = generator.generate('2024-03-15', '<Team> Meeting');

			expect(result).toBe('2024-03-15 - Team Meeting.md');
		});

		it('removes pipe character from title', () => {
			const result = generator.generate('2024-03-15', 'Option A | Option B');

			// Pipe is removed and whitespace is normalized
			expect(result).toBe('2024-03-15 - Option A Option B.md');
		});

		it('normalizes multiple whitespaces to single space', () => {
			const result = generator.generate('2024-03-15', 'Team   Planning   Meeting');

			expect(result).toBe('2024-03-15 - Team Planning Meeting.md');
		});

		it('trims leading and trailing whitespace from title', () => {
			const result = generator.generate('2024-03-15', '  Sprint Review  ');

			expect(result).toBe('2024-03-15 - Sprint Review.md');
		});

		it('uses fallback for empty title', () => {
			const result = generator.generate('2024-03-15', '');

			expect(result).toBe('2024-03-15 - Untitled meeting.md');
		});

		it('uses fallback for whitespace-only title', () => {
			const result = generator.generate('2024-03-15', '   ');

			expect(result).toBe('2024-03-15 - Untitled meeting.md');
		});

		it('uses fallback when title becomes empty after sanitization', () => {
			const result = generator.generate('2024-03-15', '???');

			expect(result).toBe('2024-03-15 - Untitled meeting.md');
		});

		it('handles unicode characters', () => {
			const result = generator.generate('2024-03-15', 'Meeting with José');

			expect(result).toBe('2024-03-15 - Meeting with José.md');
		});

		it('handles emoji in title', () => {
			const result = generator.generate('2024-03-15', '🎉 Launch Party');

			expect(result).toBe('2024-03-15 - 🎉 Launch Party.md');
		});

		it('handles very long titles by truncating', () => {
			const longTitle = 'A'.repeat(300);
			const result = generator.generate('2024-03-15', longTitle);

			// Should truncate to reasonable length (255 is common filesystem limit)
			// Date prefix "2024-03-15 - " is 14 chars, ".md" is 3 chars
			// So title should be max 255 - 14 - 3 = 238 chars
			expect(result.length).toBeLessThanOrEqual(255);
			expect(result.startsWith('2024-03-15 - ')).toBe(true);
			expect(result.endsWith('.md')).toBe(true);
		});
	});

	describe('sanitize', () => {
		it('removes all illegal characters', () => {
			const result = generator.sanitize('a/b\\c:d*e?f"g<h>i|j');

			expect(result).toBe('abcdefghij');
		});

		it('preserves normal characters', () => {
			const result = generator.sanitize('Hello World 123');

			expect(result).toBe('Hello World 123');
		});

		it('normalizes whitespace', () => {
			const result = generator.sanitize('  hello   world  ');

			expect(result).toBe('hello world');
		});
	});

	describe('generateWithSuffix', () => {
		it('adds numeric suffix before extension', () => {
			const result = generator.generateWithSuffix('2024-03-15', 'Meeting', 1);

			expect(result).toBe('2024-03-15 - Meeting (1).md');
		});

		it('handles higher suffix numbers', () => {
			const result = generator.generateWithSuffix('2024-03-15', 'Meeting', 5);

			expect(result).toBe('2024-03-15 - Meeting (5).md');
		});
	});
});
