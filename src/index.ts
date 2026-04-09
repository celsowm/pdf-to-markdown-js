import { PdfReader } from './utils/PdfReader';
import { PdfParser } from './core/PdfParser';
import { MarkdownWriter } from './utils/MarkdownWriter';
import {
  HeadingTransformer,
  ListTransformer,
  ParagraphTransformer,
  InlineFormatterTransformer,
  TableTransformer,
} from './transformers';

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
  static async fromFile(filePath: string): Promise<string> {
    const pdfReader = PdfReader.fromFile(filePath);
    return this.convert(pdfReader);
  }

  /**
   * Converts a PDF buffer to Markdown string.
   * @param buffer PDF file buffer
   * @returns Promise resolving to Markdown string
   */
  static async fromBuffer(buffer: Buffer): Promise<string> {
    const pdfReader = PdfReader.fromBuffer(buffer);
    return this.convert(pdfReader);
  }

  /**
   * Converts a PDF from a URL to Markdown string.
   * @param url URL to the PDF file
   * @returns Promise resolving to Markdown string
   */
  static async fromUrl(url: string): Promise<string> {
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
  private static convert(pdfReader: PdfReader): string {
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
export { TextElement } from './models/TextElement';
export { Page, createPage } from './models/Page';
export { PdfDocument, createPdfDocument } from './models/PdfDocument';
export {
  MarkdownNode,
  MarkdownNodeType,
  HeadingNode,
  ParagraphNode,
  ListNode,
  TableNode,
  createDocumentNode,
  createHeadingNode,
  createParagraphNode,
  createTextNode,
  createListNode,
  createTableNode,
} from './models/MarkdownNode';
export { MarkdownTransformer } from './transformers/MarkdownTransformer';
export { HeadingTransformer } from './transformers/HeadingTransformer';
export { ListTransformer } from './transformers/ListTransformer';
export { ParagraphTransformer } from './transformers/ParagraphTransformer';
export { InlineFormatterTransformer } from './transformers/InlineFormatterTransformer';
export { TableTransformer, TableTransformerConfig } from './transformers/TableTransformer';
export {
  ITableDetector,
  DetectorRegistry,
  createStandardRegistry,
  DetectorCategory,
  DetectionConfig,
} from './core/table-detection';
export { LatticeDetector, LatticeConfig, DEFAULT_LATTICE_CONFIG } from './core/LatticeDetector';
export { TableExtractor } from './core/TableExtractor';
export { FontRegistry, FontCharacteristics, FontWeight, FontStyle } from './utils/FontRegistry';

// Default export
export default PdfToMarkdown;
