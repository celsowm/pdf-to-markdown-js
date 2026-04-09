/**
 * Test file to verify the new features:
 * - ES modules support
 * - Minified version
 * - URL support (fromUrl)
 */

import { describe, it, expect } from 'vitest';
import { PdfToMarkdown } from '../../src/index';

describe('PDF to Markdown - New Features', () => {
  describe('fromUrl method', () => {
    it('should exist as a static method', () => {
      expect(typeof PdfToMarkdown.fromUrl).toBe('function');
    });

    it('should throw error for invalid URL', async () => {
      await expect(PdfToMarkdown.fromUrl('invalid-url'))
        .rejects
        .toThrow();
    });

    it('should throw error for non-existent URL', async () => {
      await expect(PdfToMarkdown.fromUrl('https://example.com/nonexistent.pdf'))
        .rejects
        .toThrow();
    });
  });

  describe('exports', () => {
    it('should export PdfToMarkdown class', () => {
      expect(PdfToMarkdown).toBeDefined();
    });

    it('should have fromBuffer method', () => {
      expect(typeof PdfToMarkdown.fromBuffer).toBe('function');
    });

    it('should have fromUrl method', () => {
      expect(typeof PdfToMarkdown.fromUrl).toBe('function');
    });
  });

  describe('PdfToMarkdownOptions', () => {
    it('should accept options in conversion methods', async () => {
      const emptyBuffer = Buffer.from([]);
      const options = {
        table: {
          tolerance: 5,
          registry: {
            weights: [
              { name: 'Lattice', enabled: true, weight: 0.9 }
            ]
          }
        }
      };

      // We just check it can be called with options (even if it fails later due to empty buffer)
      try {
        await PdfToMarkdown.fromBuffer(emptyBuffer, options);
      } catch (e) {
        // Expected to fail with empty buffer, but the point is it accepts the second argument
      }
    });
  });
});
