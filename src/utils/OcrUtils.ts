/**
 * Utilities for OCR and machine learning based extraction.
 */

/**
 * Converts LaTeX tabular environments to Markdown tables.
 * This is particularly useful for models like Nougat that output LaTeX for tables.
 * 
 * @param text The text containing LaTeX tables
 * @returns Text with LaTeX tables converted to Markdown
 */
export function convertLatexTablesToMarkdown(text: string): string {
  // Regex to match \begin{tabular}{...} ... \end{tabular}
  // [ \s\S]*? handles multi-line content lazily
  const tabularRegex = /\\begin\{tabular\}\{.*?\}([\s\S]*?)\\end\{tabular\}/g;
  
  return text.replace(tabularRegex, (match, content) => {
    // Remove common LaTeX table commands that don't translate directly to Markdown
    const cleanContent = content
      .replace(/\\hline/g, '')
      .replace(/\\toprule/g, '')
      .replace(/\\midrule/g, '')
      .replace(/\\bottomrule/g, '');

    // Split by row delimiter \\
    const rows = cleanContent
      .split('\\\\')
      .map((row: string) => row.trim())
      .filter((row: string) => row.length > 0);

    if (rows.length === 0) return match;

    let mdTable = '\n';

    rows.forEach((row: string, index: number) => {
      // Split cells by &
      const cells = row.split('&').map((cell: string) => cell.trim());
      mdTable += '| ' + cells.join(' | ') + ' |\n';

      // After the first row (header), add the Markdown separator |---|---|
      if (index === 0) {
        const separator = cells.map(() => '---');
        mdTable += '| ' + separator.join(' | ') + ' |\n';
      }
    });

    return mdTable + '\n';
  });
}

/**
 * Cleans up common Nougat model artifacts.
 * 
 * @param text The raw output from Nougat
 * @returns Cleaned text
 */
export function cleanNougatOutput(text: string): string {
  return text
    .replace(/^\[/g, '')   // Remove leading [
    .replace(/\]$/g, '')   // Remove trailing ]
    .trim();
}
