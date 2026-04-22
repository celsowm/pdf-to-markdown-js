import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { PdfToMarkdown } from '../../src/index';

describe('Parallel Table Detection', () => {
  const fixturesDir = path.join(__dirname, '..', 'fixtures');

  it('should detect two tables side-by-side on the same page', async () => {
    const pdfPath = path.join(fixturesDir, 'parallel-tables.pdf');
    const result = await PdfToMarkdown.fromFile(pdfPath);

    console.log('--- parallel-tables.pdf output ---');
    console.log(result);

    // Should contain both tables' content
    expect(result).toContain('| Left Col 1 | Left Col 2 |');
    expect(result).toContain('| Right Col 1 | Right Col 2 |');
    
    // Check for some data
    expect(result).toContain('Data L1');
    expect(result).toContain('Data R1');
    
    // Check if they are rendered as separate tables (should have at least two tables)
    const tableCount = (result.match(/\| --- \|/g) || []).length;
    expect(tableCount).toBeGreaterThanOrEqual(2);
  });
});
