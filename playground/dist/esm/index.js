import { PdfReader } from './utils/PdfReader';
import { PdfParser } from './core/PdfParser';
import { MarkdownWriter } from './utils/MarkdownWriter';
import { HeadingTransformer, ListTransformer, ParagraphTransformer, InlineFormatterTransformer, TableTransformer, } from './transformers';
/**
 * Main API for converting PDF to Markdown.
 * Provides static methods for simple usage.
 */
export class PdfToMarkdown {
    /**
     * Converts a PDF file to Markdown string.
     * @param filePath Path to the PDF file
     * @returns Promise resolving to Markdown string
     */
    static async fromFile(filePath) {
        const pdfReader = PdfReader.fromFile(filePath);
        return this.convert(pdfReader);
    }
    /**
     * Converts a PDF buffer to Markdown string.
     * @param buffer PDF file buffer
     * @returns Promise resolving to Markdown string
     */
    static async fromBuffer(buffer) {
        const pdfReader = PdfReader.fromBuffer(buffer);
        return this.convert(pdfReader);
    }
    /**
     * Converts a PDF from binary string to Markdown string (for browser).
     * @param binaryString Binary string representation of PDF
     * @returns Promise resolving to Markdown string
     */
    static async fromBinary(binaryString) {
        const pdfReader = PdfReader.fromBinaryString(binaryString);
        return this.convert(pdfReader);
    }
    /**
     * Converts a PDF from a URL to Markdown string.
     * @param url URL to the PDF file
     * @returns Promise resolving to Markdown string
     */
    static async fromUrl(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch PDF from URL: ${response.status} ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return this.fromBuffer(buffer);
    }
    /**
     * Internal conversion method.
     */
    static convert(pdfReader) {
        // Create transformers (order matters - priority sorted)
        const transformers = [
            new HeadingTransformer(),
            new TableTransformer(),
            new InlineFormatterTransformer(),
            new ListTransformer(),
            new ParagraphTransformer(),
        ];
        // Parse PDF
        const pdfParser = new PdfParser(pdfReader, transformers);
        const markdownAst = pdfParser.parse();
        // Convert to markdown string
        const markdownWriter = new MarkdownWriter();
        return markdownWriter.write(markdownAst);
    }
}
// Export individual components for advanced usage
export { PdfReader } from './utils/PdfReader';
export { PdfParser } from './core/PdfParser';
export { MarkdownWriter } from './utils/MarkdownWriter';
export { createPage } from './models/Page';
export { createPdfDocument } from './models/PdfDocument';
export { createDocumentNode, createHeadingNode, createParagraphNode, createTextNode, createListNode, createTableNode, } from './models/MarkdownNode';
export { HeadingTransformer } from './transformers/HeadingTransformer';
export { ListTransformer } from './transformers/ListTransformer';
export { ParagraphTransformer } from './transformers/ParagraphTransformer';
export { InlineFormatterTransformer } from './transformers/InlineFormatterTransformer';
export { TableTransformer } from './transformers/TableTransformer';
export { DetectorRegistry, createStandardRegistry, } from './core/table-detection';
export { LatticeDetector, DEFAULT_LATTICE_CONFIG } from './core/LatticeDetector';
export { TableExtractor } from './core/TableExtractor';
export { FontRegistry, FontWeight, FontStyle } from './utils/FontRegistry';
// Default export
export default PdfToMarkdown;
