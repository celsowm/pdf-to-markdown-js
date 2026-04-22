import type { PdfReader, XRefEntry } from '../utils/PdfReader';
import type { PdfObject, PdfDictionary, PdfStream } from '../core/ObjectParser';
import { ObjectParser } from '../core/ObjectParser';
import { ContentStreamParser } from '../core/ContentStreamParser';
import { TextExtractor, LineSegment, FillRegion } from '../core/TextExtractor';
import type { PdfDocument } from '../models/PdfDocument';
import { createPdfDocument } from '../models/PdfDocument';
import type { Page } from '../models/Page';
import { createPage } from '../models/Page';
import type { TextElement } from '../models/TextElement';
import type { MarkdownTransformer } from '../transformers/MarkdownTransformer';
import type { MarkdownNode } from '../models/MarkdownNode';
import { createDocumentNode } from '../models/MarkdownNode';

import { logger } from '../utils/Logger';
import { CMapParser } from '../utils/CMapParser';

/**
 * Helper function to check if a PdfObject is a reference.
 */
function isReference(obj: PdfObject): obj is { type: 'reference'; objNum: number; genNum: number } {
  return obj && obj.type === 'reference';
}

/**
 * Helper function to check if a PdfObject is a dictionary.
 */
function isDictionary(obj: PdfObject): obj is PdfDictionary {
  return obj && obj.type === 'dictionary';
}

/**
 * Helper function to check if a PdfObject is an array.
 */
function isArray(obj: PdfObject): obj is { type: 'array'; elements: PdfObject[] } {
  return obj && obj.type === 'array';
}

/**
 * Helper function to check if a PdfObject is a stream.
 */
function isStream(obj: PdfObject): obj is PdfStream {
  return obj && obj.type === 'stream';
}

/**
 * Helper function to check if a PdfObject is a number.
 */
function isNumber(obj: PdfObject): obj is { type: 'number'; value: number } {
  return obj && obj.type === 'number';
}

/**
 * Helper function to check if a PdfObject is a string.
 */
function isString(obj: PdfObject): obj is { type: 'string'; value: string } {
  return obj && obj.type === 'string';
}

/**
 * Main PDF parser that orchestrates the entire parsing process.
 * Follows the Facade pattern - provides a simplified interface to the complex subsystem.
 */
export class PdfParser {
  private readonly pdfReader: PdfReader;
  private readonly transformers: MarkdownTransformer[];
  private readonly cmapCache: Map<number, Map<number, string>> = new Map();

  constructor(pdfReader: PdfReader, transformers: MarkdownTransformer[]) {
    this.pdfReader = pdfReader;
    this.transformers = [...transformers].sort((a, b) => b.getPriority() - a.getPriority());
  }

  /**
   * Parses the PDF document and returns the Markdown AST.
   */
  parse(): MarkdownNode {
    logger.info('Starting PDF parsing...');
    
    // Parse PDF structure
    const xrefTable = this.parseXRefTable();
    const trailer = this.pdfReader.parseTrailer();
    logger.debug(`PDF trailer parsed, size: ${trailer.size}, root: ${trailer.root}`);

    // Get pages
    const pages = this.extractPages(xrefTable, trailer);
    logger.info(`Extracted ${pages.length} pages`);

    // Build document
    const metadata = this.extractMetadata(xrefTable, trailer);
    const document = createPdfDocument(pages, metadata);

    // Convert to Markdown AST
    const result = this.convertToMarkdown(document);
    logger.info('PDF parsing completed');
    return result;
  }

  /**
   * Parses the cross-reference table.
   */
  private parseXRefTable(): Map<number, XRefEntry> {
    try {
      const table = this.pdfReader.parseXRefTable();
      logger.debug(`XRef table parsed, ${table.size} entries found`);
      return table;
    } catch (e) {
      // If xref table parsing fails, try to find objects manually
      logger.warn('Failed to parse xref table, attempting alternative extraction', e);
      return new Map();
    }
  }

  /**
   * Extracts page information from the PDF.
   */
  private extractPages(xrefTable: Map<number, XRefEntry>, trailer: { root?: number }): Page[] {
    const pages: Page[] = [];

    try {
      // Find catalog and pages
      const catalogObj = trailer.root;
      if (!catalogObj) {
        logger.error('PDF root (Catalog) not found');
        return pages;
      }

      const catalogContent = this.pdfReader.extractObjectBuffer(catalogObj, xrefTable);
      const catalogDict = ObjectParser.parseContent(catalogContent);

      // Navigate to pages tree
      const pagesRootRef = this.getDictionaryEntry(catalogDict, '/Pages');
      if (!pagesRootRef || !isReference(pagesRootRef)) {
        logger.error('PDF /Pages object not found or invalid');
        return pages;
      }

      // Collect all page references recursively
      const pageRefs: number[] = [];
      this.collectPageReferences(pagesRootRef.objNum, xrefTable, pageRefs);
      
      logger.debug(`Collected ${pageRefs.length} leaf page references`);

      let pageIndex = 0;
      for (const pageObjNum of pageRefs) {
        const page = this.extractPage(pageObjNum, xrefTable, pageIndex++);
        if (page) {
          pages.push(page);
        }
      }
    } catch (error) {
      logger.error('Error extracting pages:', error);
    }

    return pages;
  }

  /**
   * Recursively collects all leaf page object numbers from the pages tree.
   */
  private collectPageReferences(objNum: number, xrefTable: Map<number, XRefEntry>, result: number[]): void {
    try {
      const content = this.pdfReader.extractObjectBuffer(objNum, xrefTable);
      const dict = ObjectParser.parseContent(content);

      if (!isDictionary(dict)) return;

      const type = this.getDictionaryEntry(dict, '/Type');
      const typeStr = (type && type.type === 'name') ? type.value : '';

      if (typeStr === 'Page' || typeStr === '/Page') {
        result.push(objNum);
      } else if (typeStr === 'Pages' || typeStr === '/Pages') {
        const kids = this.getDictionaryEntry(dict, '/Kids');
        if (kids && isArray(kids)) {
          for (const kid of kids.elements) {
            if (isReference(kid)) {
              this.collectPageReferences(kid.objNum, xrefTable, result);
            }
          }
        }
      } else {
        // Fallback: if no type, check for /Kids or /Contents to guess
        const kids = this.getDictionaryEntry(dict, '/Kids');
        if (kids && isArray(kids)) {
          for (const kid of kids.elements) {
            if (isReference(kid)) {
              this.collectPageReferences(kid.objNum, xrefTable, result);
            }
          }
        } else if (this.getDictionaryEntry(dict, '/Contents')) {
          result.push(objNum);
        }
      }
    } catch (e) {
      logger.warn(`Error collecting page references for obj ${objNum}:`, e);
    }
  }

  /**
   * Extracts a single page from the PDF.
   */
  private extractPage(
    objNum: number,
    xrefTable: Map<number, XRefEntry>,
    pageIndex: number,
  ): Page | null {
    try {
      logger.debug(`Extracting page ${pageIndex + 1} (obj ${objNum})...`);
      const pageContent = this.pdfReader.extractObjectBuffer(objNum, xrefTable);
      const pageDict = ObjectParser.parseContent(pageContent);

      if (!isDictionary(pageDict)) {
        logger.warn(`Page obj ${objNum} is not a dictionary`);
        return null;
      }

      // Log keys for debugging
      const keys = Array.from(pageDict.entries.keys());
      logger.verbose(`Page ${pageIndex + 1} keys: ${keys.join(', ')}`);

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

      // Extract fonts and CMaps
      const resources = this.getDictionaryEntry(pageDict, '/Resources');
      const cmaps = this.extractFontCMaps(resources, xrefTable);

      // Extract content stream
      const contents = this.getDictionaryEntry(pageDict, '/Contents');
      if (contents) {
         logger.debug(`Page ${pageIndex + 1} /Contents type: ${contents.type}`);
      } else {
         logger.debug(`Page ${pageIndex + 1} /Contents not found in dictionary`);
      }
      
      const { textElements, lines, fillRegions } = this.extractElementsFromContents(
        contents,
        xrefTable,
        width,
        height,
        pageIndex,
        cmaps
      );

      logger.debug(`Page ${pageIndex + 1} extracted, ${textElements.length} text elements, ${lines.length} lines, and ${fillRegions.length} fill regions found`);
      return createPage(pageIndex, width, height, textElements, lines, fillRegions);
    } catch (error) {
      logger.warn(`Error extracting page ${pageIndex + 1}:`, error);
      return null;
    }
  }

  /**
   * Extracts ToUnicode CMaps for all fonts in the resources.
   */
  private extractFontCMaps(resources: PdfObject | null, xrefTable: Map<number, XRefEntry>): Map<string, Map<number, string>> {
    const cmaps = new Map<string, Map<number, string>>();
    if (!resources || !isDictionary(resources)) return cmaps;

    const fontsObj = this.getDictionaryEntry(resources, '/Font');
    if (!fontsObj || !isDictionary(fontsObj)) return cmaps;

    for (const [fontName, fontRef] of fontsObj.entries) {
      if (isReference(fontRef)) {
        // Check cache first by font reference
        if (this.cmapCache.has(fontRef.objNum)) {
          cmaps.set(fontName.startsWith('/') ? fontName.substring(1) : fontName, this.cmapCache.get(fontRef.objNum)!);
          continue;
        }

        try {
          const fontContent = this.pdfReader.extractObjectBuffer(fontRef.objNum, xrefTable);
          const fontDict = ObjectParser.parseContent(fontContent);
          
          if (isDictionary(fontDict)) {
            const toUnicodeRef = this.getDictionaryEntry(fontDict, '/ToUnicode');
            if (toUnicodeRef && isReference(toUnicodeRef)) {
              // Check cache by ToUnicode reference
              if (this.cmapCache.has(toUnicodeRef.objNum)) {
                const cmap = this.cmapCache.get(toUnicodeRef.objNum)!;
                cmaps.set(fontName.startsWith('/') ? fontName.substring(1) : fontName, cmap);
                this.cmapCache.set(fontRef.objNum, cmap);
                continue;
              }

              const cmapContent = this.pdfReader.extractObjectBuffer(toUnicodeRef.objNum, xrefTable);
              const cmapObj = ObjectParser.parseContent(cmapContent);
              
              if (isStream(cmapObj)) {
                const cmap = CMapParser.parse(cmapObj.content);
                cmaps.set(fontName.startsWith('/') ? fontName.substring(1) : fontName, cmap);
                // Cache by both references
                this.cmapCache.set(toUnicodeRef.objNum, cmap);
                this.cmapCache.set(fontRef.objNum, cmap);
              }
            }
          }
        } catch (e) {
          logger.debug(`Failed to extract CMap for font ${fontName}`, e);
        }
      }
    }

    return cmaps;
  }

  /**
   * Extracts text and graphics from page contents.
   */
  private extractElementsFromContents(
    contents: PdfObject | null,
    xrefTable: Map<number, XRefEntry>,
    width: number,
    height: number,
    pageIndex: number,
    cmaps: Map<string, Map<number, string>>
  ): { textElements: TextElement[]; lines: LineSegment[]; fillRegions: FillRegion[] } {
    if (!contents) {
      logger.debug(`No /Contents found for page ${pageIndex + 1}`);
      return { textElements: [], lines: [], fillRegions: [] };
    }

    let streamContent = '';

    if (isReference(contents)) {
      try {
        const objContent = this.pdfReader.extractObjectBuffer(contents.objNum, xrefTable);
        const objDict = ObjectParser.parseContent(objContent);

        if (isStream(objDict)) {
          streamContent = objDict.content.toString('binary');
          logger.debug(`Extracted stream content from obj ${contents.objNum}, length: ${streamContent.length}`);
        } else {
          logger.debug(`Obj ${contents.objNum} is not a stream, it's a ${objDict.type}`);
        }
      } catch (e) {
        logger.warn(`Failed to extract content stream for obj ${contents.objNum}`, e);
        return { textElements: [], lines: [], fillRegions: [] };
      }
    } else if (isArray(contents)) {
      // Multiple content streams
      const elements = contents.elements;
      logger.debug(`Page ${pageIndex + 1} has ${elements.length} content streams in array`);
      for (const elem of elements) {
        if (isReference(elem)) {
          try {
            const objContent = this.pdfReader.extractObjectBuffer(elem.objNum, xrefTable);
            const objDict = ObjectParser.parseContent(objContent);

            if (isStream(objDict)) {
              streamContent += objDict.content.toString('binary');
            }
          } catch (e) {
             logger.warn(`Failed to extract one of the content streams for page ${pageIndex + 1}`, e);
          }
        }
      }
      logger.debug(`Total combined stream content length: ${streamContent.length}`);
    }

    if (!streamContent) {
      logger.debug(`No stream content extracted for page ${pageIndex + 1}`);
      return { textElements: [], lines: [], fillRegions: [] };
    }

    // Parse content stream
    const contentStreamParser = new ContentStreamParser(streamContent);
    const operations = contentStreamParser.parse();
    logger.debug(`Parsed ${operations.length} operations from content stream`);

    // Extract elements
    const textExtractor = new TextExtractor(width, height, pageIndex, cmaps);
    return {
      textElements: textExtractor.extractTextElements(operations),
      lines: textExtractor.extractGraphics(operations),
      fillRegions: textExtractor.extractFillRegions(operations),
    };
  }

  /**
   * Extracts metadata from the PDF.
   */
  private extractMetadata(
    xrefTable: Map<number, XRefEntry>,
    trailer: { info?: number },
  ): Record<string, string> {
    const metadata: Record<string, string> = {};

    if (trailer.info) {
      try {
        const infoContent = this.pdfReader.extractObjectBuffer(trailer.info, xrefTable);
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
    let val = entries.get(key);
    if (!val && key.startsWith('/')) {
      val = entries.get(key.substring(1));
    } else if (!val) {
      val = entries.get('/' + key);
    }
    return val || null;
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
      const pageNodes = this.transformPage(page);
      allNodes.push(...pageNodes);
    }

    return createDocumentNode(allNodes);
  }

  /**
   * Transforms text elements to Markdown nodes using registered transformers.
   */
  private transformPage(page: Page): MarkdownNode[] {
    const elements = page.textElements;
    if (elements.length === 0) {
      return [];
    }

    interface NodeWithPosition {
      node: MarkdownNode;
      y: number;
    }

    const nodesWithPosition: NodeWithPosition[] = [];
    const usedElements = new Set<TextElement>();

    // Try each transformer in priority order
    for (const transformer of this.transformers) {
      const unusedElements = elements.filter((el) => !usedElements.has(el));

      if (unusedElements.length === 0) {
        continue;
      }

      if (transformer.canTransform([...unusedElements])) {
        const { nodes: newNodes, consumedElements, positions } = transformer.transform(
          [...unusedElements],
          page,
        );
        
        if (newNodes.length > 0) {
           for (let i = 0; i < newNodes.length; i++) {
             const node = newNodes[i];
             const y = (positions && positions[i] !== undefined) 
               ? positions[i] 
               : (consumedElements.length > 0 ? consumedElements.reduce((sum, el) => sum + el.y, 0) / consumedElements.length : 0);
             
             nodesWithPosition.push({ node, y });
           }
        }
        
        consumedElements.forEach((el) => usedElements.add(el));
      }
    }

    // Sort nodes by Y position (descending, as PDF Y is typically bottom-up)
    nodesWithPosition.sort((a, b) => b.y - a.y);

    return nodesWithPosition.map(n => n.node);
  }
}
