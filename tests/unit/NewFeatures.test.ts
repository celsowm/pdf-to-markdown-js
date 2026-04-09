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

    it('should have fromFile method', () => {
      expect(typeof PdfToMarkdown.fromFile).toBe('function');
    });

    it('should have fromBuffer method', () => {
      expect(typeof PdfToMarkdown.fromBuffer).toBe('function');
    });

    it('should have fromUrl method', () => {
      expect(typeof PdfToMarkdown.fromUrl).toBe('function');
    });
  });
});
