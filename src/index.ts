import { PdfReader } from './utils/PdfReader';
import { PdfParser } from './core/PdfParser';
import { MarkdownWriter } from './utils/MarkdownWriter';
import {
  HeadingTransformer,
  ListTransformer,
  ParagraphTransformer,
  TableTransformer,
  OcrTransformer,
  InlineFormatterTransformer,
} from './transformers';
import type { MarkdownTransformer } from './transformers';
import type { TableTransformerConfig } from './transformers';
import type { OcrProvider } from './utils/ImageExtractor';

/**
 * Configuration options for PdfToMarkdown.
 */
export interface PdfToMarkdownOptions {
  /**
   * Configuration for table detection and extraction.
   */
  readonly table?: TableTransformerConfig;

  /**
   * Optional OCR provider for specialized extraction (e.g. via Transformers.js).
   */
  readonly ocr?: {
    readonly provider: OcrProvider;
    readonly useForTables?: boolean;
    readonly useForPages?: boolean;
  };
}

/**
 * Main API for converting PDF to Markdown.
 * Provides static methods for simple usage.
 */
export class PdfToMarkdown {
  /**
   * Converts a PDF file to Markdown string.
   * Note: This method only works in a Node.js environment.
   * @param filePath Path to the PDF file
   * @param options Conversion options
   * @returns Promise resolving to Markdown string
   */
  static async fromFile(filePath: string, options?: PdfToMarkdownOptions): Promise<string> {
    try {
      // Use dynamic import to prevent bundlers from complaining about 'fs' when targeting browser
      const fsModule = await eval("import('fs')");
      const buffer = fsModule.readFileSync(filePath);
      return this.fromBuffer(buffer, options);
    } catch (e) {
      // Fallback for CommonJS environments
      const fsModule = eval("require('fs')");
      const buffer = fsModule.readFileSync(filePath);
      return this.fromBuffer(buffer, options);
    }
  }

  /**
   * Converts a PDF buffer to Markdown string.
   * @param buffer PDF file buffer
   * @param options Conversion options
   * @returns Promise resolving to Markdown string
   */
  static async fromBuffer(buffer: Buffer, options?: PdfToMarkdownOptions): Promise<string> {
    const pdfReader = PdfReader.fromBuffer(buffer);
    return this.convert(pdfReader, options);
  }

  /**
   * Converts a PDF from binary string to Markdown string (for browser).
   * @param binaryString Binary string representation of PDF
   * @param options Conversion options
   * @returns Promise resolving to Markdown string
   */
  static async fromBinary(binaryString: string, options?: PdfToMarkdownOptions): Promise<string> {
    const pdfReader = PdfReader.fromBinaryString(binaryString);
    return this.convert(pdfReader, options);
  }

  /**
   * Converts a PDF from a URL to Markdown string.
   * @param url URL to the PDF file
   * @param options Conversion options
   * @returns Promise resolving to Markdown string
   */
  static async fromUrl(url: string, options?: PdfToMarkdownOptions): Promise<string> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch PDF from URL: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return this.fromBuffer(buffer, options);
  }

  /**
   * Internal conversion method.
   */
  private static async convert(pdfReader: PdfReader, options: PdfToMarkdownOptions = {}): Promise<string> {
    // Create transformers (order matters - priority sorted)
    const transformers: MarkdownTransformer[] = [
      new HeadingTransformer(),
      new TableTransformer(options.table),
      new ListTransformer(),
      new InlineFormatterTransformer(),
      new ParagraphTransformer(),
    ];

    // Add OCR transformer if provider is present
    if (options.ocr?.provider) {
      transformers.push(new OcrTransformer(options.ocr.provider, options.ocr.useForPages));
    }

    // Parse PDF
    const pdfParser = new PdfParser(pdfReader, transformers);
    const markdownAst = await pdfParser.parse();

    // Convert to markdown string
    const markdownWriter = new MarkdownWriter();
    return markdownWriter.write(markdownAst);
  }
}

// Export individual components for advanced usage
export { PdfReader } from './utils/PdfReader';
export { PdfParser } from './core/PdfParser';
export { MarkdownWriter } from './utils/MarkdownWriter';
export type { Page } from './models/Page';
export { createPage } from './models/Page';
export type { PdfDocument } from './models/PdfDocument';
export { createPdfDocument } from './models/PdfDocument';
export {
  createDocumentNode,
  createHeadingNode,
  createParagraphNode,
  createTextNode,
  createListNode,
  createTableNode,
} from './models/MarkdownNode';

export type { TextElement } from './models/TextElement';
export type {
  MarkdownNode,
  MarkdownNodeType,
  HeadingNode,
  ParagraphNode,
  ListNode,
  TableNode,
} from './models/MarkdownNode';

export { HeadingTransformer } from './transformers/HeadingTransformer';
export { ListTransformer } from './transformers/ListTransformer';
export { ParagraphTransformer } from './transformers/ParagraphTransformer';
export { TableTransformer } from './transformers/TableTransformer';
export { OcrTransformer } from './transformers/OcrTransformer';
export type { TableTransformerConfig } from './transformers/TableTransformer';
export type { OcrProvider } from './utils/ImageExtractor';

export {
  DetectorRegistry,
  createStandardRegistry,
} from './core/table-detection';

export type {
  ITableDetector,
  DetectionConfig,
  DetectorCategory,
} from './core/table-detection';

export { LatticeDetector, DEFAULT_LATTICE_CONFIG } from './core/LatticeDetector';
export type { LatticeConfig } from './core/LatticeDetector';

export { TableExtractor } from './core/TableExtractor';
export { FontRegistry, FontWeight, FontStyle } from './utils/FontRegistry';
export type { FontCharacteristics } from './utils/FontRegistry';

// Default export
export default PdfToMarkdown;
