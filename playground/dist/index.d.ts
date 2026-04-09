/**
 * Main API for converting PDF to Markdown.
 * Provides static methods for simple usage.
 */
export declare class PdfToMarkdown {
    /**
     * Converts a PDF file to Markdown string.
     * @param filePath Path to the PDF file
     * @returns Promise resolving to Markdown string
     */
    static fromFile(filePath: string): Promise<string>;
    /**
     * Converts a PDF buffer to Markdown string.
     * @param buffer PDF file buffer
     * @returns Promise resolving to Markdown string
     */
    static fromBuffer(buffer: Buffer): Promise<string>;
    /**
     * Converts a PDF from binary string to Markdown string (for browser).
     * @param binaryString Binary string representation of PDF
     * @returns Promise resolving to Markdown string
     */
    static fromBinary(binaryString: string): Promise<string>;
    /**
     * Converts a PDF from a URL to Markdown string.
     * @param url URL to the PDF file
     * @returns Promise resolving to Markdown string
     */
    static fromUrl(url: string): Promise<string>;
    /**
     * Internal conversion method.
     */
    private static convert;
}
export { PdfReader } from './utils/PdfReader';
export { PdfParser } from './core/PdfParser';
export { MarkdownWriter } from './utils/MarkdownWriter';
export { TextElement } from './models/TextElement';
export { Page, createPage } from './models/Page';
export { PdfDocument, createPdfDocument } from './models/PdfDocument';
export { MarkdownNode, MarkdownNodeType, HeadingNode, ParagraphNode, ListNode, TableNode, createDocumentNode, createHeadingNode, createParagraphNode, createTextNode, createListNode, createTableNode, } from './models/MarkdownNode';
export { MarkdownTransformer } from './transformers/MarkdownTransformer';
export { HeadingTransformer } from './transformers/HeadingTransformer';
export { ListTransformer } from './transformers/ListTransformer';
export { ParagraphTransformer } from './transformers/ParagraphTransformer';
export { InlineFormatterTransformer } from './transformers/InlineFormatterTransformer';
export { TableTransformer, TableTransformerConfig } from './transformers/TableTransformer';
export { ITableDetector, DetectorRegistry, createStandardRegistry, DetectorCategory, DetectionConfig, } from './core/table-detection';
export { LatticeDetector, LatticeConfig, DEFAULT_LATTICE_CONFIG } from './core/LatticeDetector';
export { TableExtractor } from './core/TableExtractor';
export { FontRegistry, FontCharacteristics, FontWeight, FontStyle } from './utils/FontRegistry';
export default PdfToMarkdown;
//# sourceMappingURL=index.d.ts.map