import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { PdfToMarkdown } from '../../src/index';

describe('Integration Tests - HTML to PDF to Markdown', () => {
  const fixturesDir = path.join(__dirname, '..', 'fixtures');

  it('should convert simple HTML-generated PDF to markdown', async () => {
    const pdfPath = path.join(fixturesDir, 'html-simple.pdf');
    const result = await PdfToMarkdown.fromFile(pdfPath);

    console.log('--- html-simple.pdf ---');
    console.log(result);

    expect(result).toContain('# Simple HTML to PDF');
    expect(result).toContain('First item');
    expect(result).toContain('# A Subheading');
  });

  it('should convert complex table HTML-generated PDF to markdown', async () => {
    const pdfPath = path.join(fixturesDir, 'html-complex-table.pdf');
    const result = await PdfToMarkdown.fromFile(pdfPath);

    console.log('--- html-complex-table.pdf ---');
    console.log(result);

    expect(result).toContain('# Financial Report');
    expect(result).toContain('Date');
    expect(result).toContain('Category');
    expect(result).toContain('New Server Case');
    expect(result).toContain('Grand Total');
    expect(result).toContain('$364.99');
  });

  it('should convert mixed alignment HTML-generated PDF to markdown', async () => {
    const pdfPath = path.join(fixturesDir, 'html-mixed.pdf');
    const result = await PdfToMarkdown.fromFile(pdfPath);

    console.log('--- html-mixed.pdf ---');
    console.log(result);

    expect(result).toContain('# Centered Title');
    expect(result).toContain('Boxed Content');
    expect(result).toContain('Signature Line');
  });
});
