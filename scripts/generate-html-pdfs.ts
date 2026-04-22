import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const FIXTURES_DIR = path.join(process.cwd(), 'tests', 'fixtures');
if (!fs.existsSync(FIXTURES_DIR)) {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
}

async function generatePdfFromHtml(html: string, filename: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html);
  await page.pdf({
    path: path.join(FIXTURES_DIR, filename),
    format: 'A4',
    margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' },
    printBackground: true,
  });
  await browser.close();
  console.log(`Generated: ${filename}`);
}

async function main() {
  console.log('Generating PDFs from HTML...');

  // 1. Simple HTML
  await generatePdfFromHtml(`
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: sans-serif; }
        h1 { color: #333; }
        p { line-height: 1.6; }
      </style>
    </head>
    <body>
      <h1>Simple HTML to PDF</h1>
      <p>This is a paragraph of text converted from <strong>HTML</strong> to <em>PDF</em>.</p>
      <ul>
        <li>First item</li>
        <li>Second item with <strong>bold</strong> text</li>
        <li>Third item with <em>italic</em> text</li>
      </ul>
      <h2>A Subheading</h2>
      <p>More text after the subheading to test reading order and structure.</p>
    </body>
    </html>
  `, 'html-simple.pdf');

  // 2. Complex Table HTML
  await generatePdfFromHtml(`
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: sans-serif; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .total { font-weight: bold; background-color: #eee; }
        .right { text-align: right; }
      </style>
    </head>
    <body>
      <h1>Financial Report</h1>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Category</th>
            <th>Description</th>
            <th class="right">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>2024-01-01</td>
            <td>Hardware</td>
            <td>New Server Case</td>
            <td class="right">$250.00</td>
          </tr>
          <tr>
            <td>2024-01-05</td>
            <td>Software</td>
            <td>Cloud Subscription<br/>Monthly fee</td>
            <td class="right">$49.99</td>
          </tr>
          <tr>
            <td>2024-01-10</td>
            <td>Supplies</td>
            <td>Office Paper (10 reams)</td>
            <td class="right">$65.00</td>
          </tr>
          <tr class="total">
            <td colspan="3">Grand Total</td>
            <td class="right">$364.99</td>
          </tr>
        </tbody>
      </table>
    </body>
    </html>
  `, 'html-complex-table.pdf');

  // 3. Mixed Content with different alignments
  await generatePdfFromHtml(`
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: serif; }
        .centered { text-align: center; }
        .right-aligned { text-align: right; }
        .box { border: 2px solid black; padding: 10px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="centered">
        <h1>Centered Title</h1>
        <p>Subtitle or author line</p>
      </div>
      <div class="box">
        <h3>Boxed Content</h3>
        <p>This text is inside a border. It should still be detected as normal text nodes.</p>
      </div>
      <p class="right-aligned">Signature Line</p>
      <p class="right-aligned"><em>Date: April 2024</em></p>
    </body>
    </html>
  `, 'html-mixed.pdf');

  console.log('All HTML-based PDFs generated successfully!');
}

main().catch(console.error);
