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

import { logger } from '../utils/Logger';
import { TransformationOrchestrator } from './TransformationOrchestrator';
import { ResourceManager } from './ResourceManager';

/**
 * Main PDF parser that orchestrates the entire parsing process.
 * Refactored to delegate specialized tasks to ResourceManager and TransformationOrchestrator.
 */
export class PdfParser {
  private readonly pdfReader: PdfReader;
  private readonly orchestrator: TransformationOrchestrator;
  private readonly resourceManager: ResourceManager;

  constructor(pdfReader: PdfReader, transformers: MarkdownTransformer[]) {
    this.pdfReader = pdfReader;
    this.orchestrator = new TransformationOrchestrator(transformers);
    this.resourceManager = new ResourceManager(pdfReader);
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
    const metadata = this.resourceManager.extractMetadata(xrefTable, trailer.info);
    const document = createPdfDocument(pages, metadata);

    // Convert to Markdown AST via orchestrator
    const result = this.orchestrator.orchestrate(document);
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
      const catalogObj = trailer.root;
      if (!catalogObj) {
        logger.error('PDF root (Catalog) not found');
        return pages;
      }

      const catalogContent = this.pdfReader.extractObjectBuffer(catalogObj, xrefTable);
      const catalogDict = ObjectParser.parseContent(catalogContent);

      const pagesRootRef = this.resourceManager.getDictionaryEntry(catalogDict, '/Pages');
      if (!pagesRootRef || !isReference(pagesRootRef)) {
        logger.error('PDF /Pages object not found or invalid');
        return pages;
      }

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
    } catch (e) {
      logger.error('Error during page extraction', e);
    }

    return pages;
  }

  /**
   * Recursively collects page object numbers from the /Pages tree.
   */
  private collectPageReferences(objNum: number, xrefTable: Map<number, XRefEntry>, pageRefs: number[]): void {
    try {
      const objContent = this.pdfReader.extractObjectBuffer(objNum, xrefTable);
      const dict = ObjectParser.parseContent(objContent);

      if (isDictionary(dict)) {
        const type = this.resourceManager.getDictionaryEntry(dict, '/Type');
        if (isString(type) && type.value === '/Page') {
          pageRefs.push(objNum);
          return;
        }

        const kids = this.resourceManager.getDictionaryEntry(dict, '/Kids');
        if (kids && isArray(kids)) {
          for (const kid of kids.elements) {
            if (isReference(kid)) {
              this.collectPageReferences(kid.objNum, xrefTable, pageRefs);
            }
          }
        }
      }
    } catch (e) {
      logger.warn(`Error collecting page reference for obj ${objNum}`, e);
    }
  }

  /**
   * Extracts a single page.
   */
  private extractPage(objNum: number, xrefTable: Map<number, XRefEntry>, pageIndex: number): Page | null {
    try {
      const pageContent = this.pdfReader.extractObjectBuffer(objNum, xrefTable);
      const pageDict = ObjectParser.parseContent(pageContent);

      if (isDictionary(pageDict)) {
        const mediaBox = this.resourceManager.getDictionaryEntry(pageDict, '/MediaBox');
        let width = 612;
        let height = 792;

        if (mediaBox && isArray(mediaBox) && mediaBox.elements.length >= 4) {
          const x1 = this.getNumericValue(mediaBox.elements[0]);
          const y1 = this.getNumericValue(mediaBox.elements[1]);
          const x2 = this.getNumericValue(mediaBox.elements[2]);
          const y2 = this.getNumericValue(mediaBox.elements[3]);
          width = Math.abs(x2 - x1);
          height = Math.abs(y2 - y1);
        }

        const resources = this.resourceManager.getDictionaryEntry(pageDict, '/Resources');
        const cmaps = resources && isDictionary(resources) 
          ? this.resourceManager.extractCMaps(resources, xrefTable)
          : new Map<string, Map<number, string>>();

        const contents = this.resourceManager.getDictionaryEntry(pageDict, '/Contents');
        const { textElements, lines, fillRegions } = this.extractElementsFromContents(
          contents,
          xrefTable,
          width,
          height,
          pageIndex,
          cmaps
        );

        return createPage(pageIndex, width, height, textElements, lines, fillRegions);
      }
    } catch (e) {
      logger.error(`Error extracting page ${pageIndex + 1}`, e);
    }
    return null;
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
      return { textElements: [], lines: [], fillRegions: [] };
    }

    let streamContent = '';

    if (isReference(contents)) {
      try {
        const objContent = this.pdfReader.extractObjectBuffer(contents.objNum, xrefTable);
        const objDict = ObjectParser.parseContent(objContent);
        if (isStream(objDict)) {
          streamContent = objDict.content.toString('binary');
        }
      } catch (e) {
        logger.warn(`Failed to extract content stream for obj ${contents.objNum}`, e);
        return { textElements: [], lines: [], fillRegions: [] };
      }
    } else if (isArray(contents)) {
      for (const elem of contents.elements) {
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
    }

    if (!streamContent) {
      return { textElements: [], lines: [], fillRegions: [] };
    }

    const contentStreamParser = new ContentStreamParser(streamContent);
    const operations = contentStreamParser.parse();

    const textExtractor = new TextExtractor(width, height, pageIndex, cmaps);
    return {
      textElements: textExtractor.extractTextElements(operations),
      lines: textExtractor.extractGraphics(operations),
      fillRegions: textExtractor.extractFillRegions(operations),
    };
  }

  private getNumericValue(obj: PdfObject): number {
    return isNumber(obj) ? obj.value : 0;
  }
}

// Type Guards mirrored from ObjectParser/ResourceManager
function isReference(obj: PdfObject): obj is { type: 'reference'; objNum: number; genNum: number } {
  return obj && obj.type === 'reference';
}
function isDictionary(obj: PdfObject): obj is PdfDictionary {
  return obj && obj.type === 'dictionary';
}
function isArray(obj: PdfObject): obj is { type: 'array'; elements: PdfObject[] } {
  return obj && obj.type === 'array';
}
function isStream(obj: PdfObject): obj is PdfStream {
  return obj && obj.type === 'stream';
}
function isNumber(obj: PdfObject): obj is { type: 'number'; value: number } {
  return obj && obj.type === 'number';
}
function isString(obj: PdfObject): obj is { type: 'string'; value: string } {
  return obj && obj.type === 'string';
}
