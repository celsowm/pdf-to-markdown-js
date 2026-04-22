import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { PdfToMarkdown } from '../../src/index';

describe('Zebra Table Detection', () => {
  const fixturesDir = path.join(__dirname, '..', 'fixtures');

  it('should detect borderless table with background stripes', async () => {
    const pdfPath = path.join(fixturesDir, 'zebra-table.pdf');
    const result = await PdfToMarkdown.fromFile(pdfPath);

    console.log('--- zebra-table.pdf output ---');
    console.log(result);

    expect(result).toContain('| Index | Item Name | Status | Price |');
    expect(result).toContain('| 1 | Alpha | Active | $10.00 |');
    expect(result).toContain('| 6 | Zeta | Pending | $60.00 |');
  });
});
