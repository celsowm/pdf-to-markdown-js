import { PdfReader, XRefEntry } from '../utils/PdfReader';
import { ObjectParser, PdfObject, PdfDictionary, PdfStream } from '../core/ObjectParser';
import { ContentStreamParser } from '../core/ContentStreamParser';
import { TextExtractor } from '../core/TextExtractor';
import { PdfDocument, createPdfDocument } from '../models/PdfDocument';
import { Page, createPage } from '../models/Page';
import { TextElement } from '../models/TextElement';
import { MarkdownTransformer } from '../transformers/MarkdownTransformer';
import { MarkdownNode, createDocumentNode } from '../models/MarkdownNode';

/**
 * Helper function to check if a PdfObject is a reference.
 */
function isReference(obj: PdfObject): obj is { type: 'reference'; objNum: number; genNum: number } {
  return obj.type === 'reference';
}

/**
 * Helper function to check if a PdfObject is a dictionary.
 */
function isDictionary(obj: PdfObject): obj is PdfDictionary {
  return obj.type === 'dictionary';
}

/**
 * Helper function to check if a PdfObject is an array.
 */
function isArray(obj: PdfObject): obj is { type: 'array'; elements: PdfObject[] } {
  return obj.type === 'array';
}

/**
 * Helper function to check if a PdfObject is a stream.
 */
function isStream(obj: PdfObject): obj is PdfStream {
  return obj.type === 'stream';
}

/**
 * Helper function to check if a PdfObject is a number.
 */
function isNumber(obj: PdfObject): obj is { type: 'number'; value: number } {
  return obj.type === 'number';
}

/**
 * Helper function to check if a PdfObject is a string.
 */
function isString(obj: PdfObject): obj is { type: 'string'; value: string } {
  return obj.type === 'string';
}

/**
 * Main PDF parser that orchestrates the entire parsing process.
 * Follows the Facade pattern - provides a simplified interface to the complex subsystem.
 */
export class PdfParser {
  private readonly pdfReader: PdfReader;
  private readonly transformers: MarkdownTransformer[];

  constructor(pdfReader: PdfReader, transformers: MarkdownTransformer[]) {
    this.pdfReader = pdfReader;
    this.transformers = [...transformers].sort((a, b) => b.getPriority() - a.getPriority());
  }

  /**
   * Parses the PDF document and returns the Markdown AST.
   */
  parse(): MarkdownNode {
    // Parse PDF structure
    const xrefTable = this.parseXRefTable();
    const trailer = this.pdfReader.parseTrailer();

    // Get pages
    const pages = this.extractPages(xrefTable, trailer);

    // Build document
    const metadata = this.extractMetadata(xrefTable, trailer);
    const document = createPdfDocument(pages, metadata);

    // Convert to Markdown AST
    return this.convertToMarkdown(document);
  }

  /**
   * Parses the cross-reference table.
   */
  private parseXRefTable(): Map<number, XRefEntry> {
    try {
      return this.pdfReader.parseXRefTable();
    } catch {
      // If xref table parsing fails, try to find objects manually
      console.warn('Failed to parse xref table, attempting alternative extraction');
      return new Map();
    }
  }

  /**
   * Extracts page information from the PDF.
   */
  private extractPages(
    xrefTable: Map<number, XRefEntry>,
    trailer: { root?: number }
  ): Page[] {
    const pages: Page[] = [];

    try {
      // Find catalog and pages
      const catalogObj = trailer.root;
      if (!catalogObj) {
        return pages;
      }

      const catalogContent = this.pdfReader.extractObjectContent(catalogObj, xrefTable);
      const catalogDict = ObjectParser.parseContent(catalogContent);

      // Navigate to pages
      const pagesObj = this.getDictionaryEntry(catalogDict, '/Pages');
      if (!pagesObj || !isReference(pagesObj)) {
        return pages;
      }

      const pagesContent = this.pdfReader.extractObjectContent(
        pagesObj.objNum,
        xrefTable
      );
      const pagesDict = ObjectParser.parseContent(pagesContent);

      // Get kids (individual pages)
      const kidsObj = this.getDictionaryEntry(pagesDict, '/Kids');
      if (!kidsObj || !isArray(kidsObj)) {
        return pages;
      }

      const kidsArray = kidsObj.elements;
      let pageIndex = 0;

      for (const kid of kidsArray) {
        if (isReference(kid)) {
          const page = this.extractPage(
            kid.objNum,
            xrefTable,
            pageIndex++
          );
          if (page) {
            pages.push(page);
          }
        }
      }
    } catch (error) {
      console.warn('Error extracting pages:', error);
    }

    return pages;
  }

  /**
   * Extracts a single page from the PDF.
   */
  private extractPage(
    objNum: number,
    xrefTable: Map<number, XRefEntry>,
    pageIndex: number
  ): Page | null {
    try {
      const pageContent = this.pdfReader.extractObjectContent(objNum, xrefTable);
      const pageDict = ObjectParser.parseContent(pageContent);

      // Get page dimensions
      const mediaBox = this.getDictionaryEntry(pageDict, '/MediaBox');
      let width = 612; // Default letter size
      let height = 792;

      if (mediaBox && isArray(mediaBox)) {
        const elements = mediaBox.elements;
        if (elements.length >= 4) {
          width = this.getNumericValue(elements[2]);
          height = this.getNumericValue(elements[3]);
        }
      }

      // Extract content stream
      const contents = this.getDictionaryEntry(pageDict, '/Contents');
      const textElements = this.extractTextFromContents(contents, xrefTable, width, height, pageIndex);

      return createPage(pageIndex, width, height, textElements);
    } catch (error) {
      console.warn(`Error extracting page ${pageIndex + 1}:`, error);
      return null;
    }
  }

  /**
   * Extracts text elements from the page contents.
   */
  private extractTextFromContents(
    contents: PdfObject | null,
    xrefTable: Map<number, XRefEntry>,
    width: number,
    height: number,
    pageIndex: number
  ): TextElement[] {
    if (!contents) {
      return [];
    }

    let streamContent = '';

    if (isReference(contents)) {
      try {
        const objContent = this.pdfReader.extractObjectContent(
          contents.objNum,
          xrefTable
        );
        const objDict = ObjectParser.parseContent(objContent);

        if (isStream(objDict)) {
          streamContent = objDict.content;
        }
      } catch {
        return [];
      }
    } else if (isArray(contents)) {
      // Multiple content streams
      const elements = contents.elements;
      for (const elem of elements) {
        if (isReference(elem)) {
          try {
            const objContent = this.pdfReader.extractObjectContent(
              elem.objNum,
              xrefTable
            );
            const objDict = ObjectParser.parseContent(objContent);

            if (isStream(objDict)) {
              streamContent += objDict.content;
            }
          } catch {
            // Continue with next stream
          }
        }
      }
    }

    if (!streamContent) {
      return [];
    }

    // Parse content stream
    const contentStreamParser = new ContentStreamParser(streamContent);
    const operations = contentStreamParser.parse();

    // Extract text
    const textExtractor = new TextExtractor(width, height, pageIndex);
    return textExtractor.extractTextElements(operations);
  }

  /**
   * Extracts metadata from the PDF.
   */
  private extractMetadata(
    xrefTable: Map<number, XRefEntry>,
    trailer: { info?: number }
  ): Record<string, string> {
    const metadata: Record<string, string> = {};

    if (trailer.info) {
      try {
        const infoContent = this.pdfReader.extractObjectContent(
          trailer.info,
          xrefTable
        );
        const infoDict = ObjectParser.parseContent(infoContent);

        if (isDictionary(infoDict)) {
          const entries = infoDict.entries;
          for (const [key, value] of entries) {
            if (isString(value)) {
              metadata[key] = value.value;
            }
          }
        }
      } catch {
        // Ignore metadata errors
      }
    }

    return metadata;
  }

  /**
   * Gets a dictionary entry by key.
   */
  private getDictionaryEntry(dict: PdfObject, key: string): PdfObject | null {
    if (!isDictionary(dict)) {
      return null;
    }

    const entries = dict.entries;
    return entries.get(key) || null;
  }

  /**
   * Gets numeric value from a PDF object.
   */
  private getNumericValue(obj: PdfObject): number {
    if (isNumber(obj)) {
      return obj.value;
    }
    return 0;
  }

  /**
   * Converts a PdfDocument to Markdown AST.
   */
  private convertToMarkdown(document: PdfDocument): MarkdownNode {
    const allNodes: MarkdownNode[] = [];

    for (const page of document.pages) {
      const pageNodes = this.transformPage(page.textElements, page.textElements);
      allNodes.push(...pageNodes);
    }

    return createDocumentNode(allNodes);
  }

  /**
   * Transforms text elements to Markdown nodes using registered transformers.
   */
  private transformPage(
    elements: ReadonlyArray<TextElement>,
    allElements: ReadonlyArray<TextElement>
  ): MarkdownNode[] {
    if (elements.length === 0) {
      return [];
    }

    const nodes: MarkdownNode[] = [];
    const usedElements = new Set<TextElement>();

    // Try each transformer in priority order
    for (const transformer of this.transformers) {
      const unusedElements = elements.filter((el) => !usedElements.has(el));

      if (unusedElements.length === 0) {
        continue;
      }

      if (transformer.canTransform([...unusedElements])) {
        const transformed = transformer.transform([...unusedElements], [...allElements]);
        nodes.push(...transformed);
        unusedElements.forEach((el) => usedElements.add(el));
      }
    }

    return nodes;
  }
}
