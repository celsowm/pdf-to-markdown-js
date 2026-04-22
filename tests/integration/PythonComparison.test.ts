import { PdfToMarkdown } from '../../src/index';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { it, describe, expect } from 'vitest';

/**
 * Integration test that compares our extraction with pdfplumber (Python).
 * This ensures we don't deviate significantly from established libraries.
 */
describe('Python Comparison Integration', () => {
    const fixturesDir = path.join(__dirname, '..', 'fixtures');
    const pythonScript = path.join(__dirname, '..', '..', 'scripts', 'compare_with_python_internal.py');

    // Create a temporary python script for comparison if it doesn't exist
    if (!fs.existsSync(pythonScript)) {
        fs.writeFileSync(pythonScript, `
import pdfplumber
import sys

def get_text(pdf_path):
    with pdfplumber.open(pdf_path) as pdf:
        return "\\n".join([page.extract_text() or "" for page in pdf.pages])

if __name__ == "__main__":
    print(get_text(sys.argv[1]))
`);
    }

    const testFiles = [
        'simple-text.pdf',
        'with-headings.pdf',
        'with-tables.pdf'
    ];

    for (const file of testFiles) {
        it(`should extract similar text as pdfplumber for ${file}`, async () => {
            const pdfPath = path.join(fixturesDir, file);
            
            // 1. Get JS output
            const jsMarkdown = await PdfToMarkdown.fromFile(pdfPath);
            // console.log('JS Markdown:', jsMarkdown);
            
            // 2. Get Python output (raw text for comparison)
            let pythonText = '';
            try {
                pythonText = execSync(`python "${pythonScript}" "${pdfPath}"`).toString();
                // console.log('Python Text:', pythonText);
            } catch (e) {
                console.warn('Skipping python comparison: python or pdfplumber not available');
                return;
            }

            // Simple heuristic: check if most words from python are in our markdown
            const pythonWords = pythonText.split(/\s+/).filter(w => w.trim().length > 3);
            let foundCount = 0;
            
            if (pythonWords.length === 0) {
                console.warn('No words found in python output for', file);
            }

            for (const word of pythonWords) {
                const cleanWord = word.replace(/[^\w]/g, '');
                if (cleanWord.length > 3 && jsMarkdown.toLowerCase().includes(cleanWord.toLowerCase())) {
                    foundCount++;
                } else if (cleanWord.length > 3) {
                    // console.log(`Word not found: "${cleanWord}"`);
                }
            }

            const ratio = pythonWords.length > 0 ? foundCount / pythonWords.length : 0;
            
            // We expect high word coverage for these simple fixtures
            expect(ratio).toBeGreaterThan(0.8);
        });
    }
});
