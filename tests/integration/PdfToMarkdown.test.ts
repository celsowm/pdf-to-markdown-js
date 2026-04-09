import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { PdfToMarkdown } from '../../src/index';

describe('Integration Tests - PDF to Markdown', () => {
  const fixturesDir = path.join(__dirname, '..', 'fixtures');

  describe('simple-text.pdf', () => {
    it('should convert simple text PDF to markdown', async () => {
      const pdfPath = path.join(fixturesDir, 'simple-text.pdf');
      
      if (!fs.existsSync(pdfPath)) {
        console.warn('Skipping test - fixture not found:', pdfPath);
        return;
      }

      const result = await PdfToMarkdown.fromFile(pdfPath);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('with-headings.pdf', () => {
    it('should convert PDF with headings to markdown', async () => {
      const pdfPath = path.join(fixturesDir, 'with-headings.pdf');

      if (!fs.existsSync(pdfPath)) {
        console.warn('Skipping test - fixture not found:', pdfPath);
        return;
      }

      const result = await PdfToMarkdown.fromFile(pdfPath);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      // Check if result contains heading markers (#)
      expect(result).toMatch(/#{1,6}\s/);
    });
  });

  describe('with-lists.pdf', () => {
    it('should convert PDF with lists to markdown', async () => {
      const pdfPath = path.join(fixturesDir, 'with-lists.pdf');

      if (!fs.existsSync(pdfPath)) {
        console.warn('Skipping test - fixture not found:', pdfPath);
        return;
      }

      const result = await PdfToMarkdown.fromFile(pdfPath);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('with-tables.pdf', () => {
    it('should convert PDF with tables to markdown', async () => {
      const pdfPath = path.join(fixturesDir, 'with-tables.pdf');

      if (!fs.existsSync(pdfPath)) {
        console.warn('Skipping test - fixture not found:', pdfPath);
        return;
      }

      const result = await PdfToMarkdown.fromFile(pdfPath);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('mixed-content.pdf', () => {
    it('should convert PDF with mixed content to markdown', async () => {
      const pdfPath = path.join(fixturesDir, 'mixed-content.pdf');

      if (!fs.existsSync(pdfPath)) {
        console.warn('Skipping test - fixture not found:', pdfPath);
        return;
      }

      const result = await PdfToMarkdown.fromFile(pdfPath);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('with-inline-formatting.pdf', () => {
    it('should convert PDF with inline formatting to markdown', async () => {
      const pdfPath = path.join(fixturesDir, 'with-inline-formatting.pdf');

      if (!fs.existsSync(pdfPath)) {
        console.warn('Skipping test - fixture not found:', pdfPath);
        return;
      }

      const result = await PdfToMarkdown.fromFile(pdfPath);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      // Check if result contains bold markers
      expect(result).toMatch(/\*\*.+\*\*/);
    });
  });

  describe('fromBuffer', () => {
    it('should convert PDF from buffer to markdown', async () => {
      const pdfPath = path.join(fixturesDir, 'simple-text.pdf');

      if (!fs.existsSync(pdfPath)) {
        console.warn('Skipping test - fixture not found:', pdfPath);
        return;
      }

      const buffer = fs.readFileSync(pdfPath);
      const result = await PdfToMarkdown.fromBuffer(buffer);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
