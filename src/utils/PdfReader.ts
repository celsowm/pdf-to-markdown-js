import { logger } from './Logger';

/**
 * Represents a cross-reference entry in the PDF.
 */
export interface XRefEntry {
  readonly offset: number;
  readonly generation: number;
  readonly inUse: boolean;
}

/**
 * Represents the PDF trailer dictionary.
 */
export interface Trailer {
  readonly size: number;
  readonly prev?: number;
  readonly root?: number;
  readonly encrypt?: number;
  readonly info?: number;
  readonly id?: string[];
}

/**
 * Reads and parses the basic structure of a PDF file.
 */
export class PdfReader {
  private buffer: Buffer;

  constructor(buffer: Buffer) {
    this.buffer = buffer;
  }

  /**
   * Creates a PdfReader from a Buffer.
   */
  static fromBuffer(buffer: Buffer): PdfReader {
    return new PdfReader(buffer);
  }

  /**
   * Creates a PdfReader from a binary string (for browser compatibility).
   */
  static fromBinaryString(binaryString: string): PdfReader {
    return new PdfReader(Buffer.from(binaryString, 'binary'));
  }

  /**
   * Gets the raw binary content of the PDF.
   */
  getBinaryContent(): Buffer {
    return this.buffer;
  }

  /**
   * Gets the raw string content of the PDF.
   */
  getStringContent(): string {
    return this.buffer.toString('binary');
  }

  /**
   * Validates if the file starts with a valid PDF header.
   */
  validateHeader(): boolean {
    return this.buffer.toString('binary', 0, 5) === '%PDF-';
  }

  /**
   * Extracts the PDF version from the header.
   */
  getVersion(): string {
    if (!this.validateHeader()) {
      throw new Error('Invalid PDF header');
    }
    return this.buffer.toString('binary', 5, 8);
  }

  /**
   * Finds and parses the cross-reference table.
   */
  parseXRefTable(): Map<number, XRefEntry> {
    const xrefEntries = new Map<number, XRefEntry>();
    
    try {
      const startXRef = this.findStartXRef();
      const xrefBuffer = this.buffer.subarray(startXRef);
      const content = xrefBuffer.toString('binary');
      
      const xrefPattern = /xref\s*\r?\n([\s\S]*?)trailer/;
      const xrefMatch = xrefPattern.exec(content);

      if (!xrefMatch) {
        // Fallback to searching from the beginning if startXRef is wrong
        const fullContent = this.buffer.toString('binary');
        const fallbackMatch = xrefPattern.exec(fullContent);
        if (!fallbackMatch) throw new Error('Cross-reference table not found');
        return this.parseXRefContent(fallbackMatch[1]);
      }

      return this.parseXRefContent(xrefMatch[1]);
    } catch (e) {
      logger.warn('Error parsing XRef table:', e);
      throw e;
    }
  }

  private parseXRefContent(xrefContent: string): Map<number, XRefEntry> {
    const xrefEntries = new Map<number, XRefEntry>();
    const lines = xrefContent.split(/\r?\n/).filter((line) => line.trim().length > 0);
    let currentObjNum = 0;
    let remainingCount = 0;

    for (const line of lines) {
      const subsectionMatch = /^(\d+)\s+(\d+)$/.exec(line.trim());
      if (subsectionMatch) {
        currentObjNum = parseInt(subsectionMatch[1], 10);
        remainingCount = parseInt(subsectionMatch[2], 10);
        continue;
      }

      if (remainingCount > 0) {
        const entryMatch = /^(\d{10})\s+(\d{5})\s+([fn])/.exec(line.trim());
        if (entryMatch) {
          const offset = parseInt(entryMatch[1], 10);
          const generation = parseInt(entryMatch[2], 10);
          const inUse = entryMatch[3] === 'n';

          if (inUse) {
            xrefEntries.set(currentObjNum, { offset, generation, inUse });
          }
          currentObjNum++;
          remainingCount--;
        }
      }
    }
    return xrefEntries;
  }

  /**
   * Finds and parses the trailer dictionary.
   */
  parseTrailer(): Trailer {
    // Find trailer keyword from the end
    const lastPartSize = Math.min(this.buffer.length, 2048);
    const lastPart = this.buffer.subarray(this.buffer.length - lastPartSize).toString('binary');
    
    const trailerIndex = lastPart.lastIndexOf('trailer');
    if (trailerIndex === -1) {
      // Try a larger part if not found
      const fullContent = this.buffer.toString('binary');
      const fullTrailerIndex = fullContent.lastIndexOf('trailer');
      if (fullTrailerIndex === -1) throw new Error('Trailer not found');
      return this.parseTrailerFromContent(fullContent.substring(fullTrailerIndex));
    }

    return this.parseTrailerFromContent(lastPart.substring(trailerIndex));
  }

  private parseTrailerFromContent(content: string): Trailer {
    const trailerPattern = /trailer\s*<<([\s\S]*?)>>/;
    const trailerMatch = trailerPattern.exec(content);

    if (!trailerMatch) {
      throw new Error('Trailer dictionary not found');
    }

    const trailerContent = trailerMatch[1];
    const trailer: Record<string, any> = {};

    const sizeMatch = /\/Size\s+(\d+)/.exec(trailerContent);
    if (sizeMatch) {
      trailer.size = parseInt(sizeMatch[1], 10);
    }

    const prevMatch = /\/Prev\s+(\d+)/.exec(trailerContent);
    if (prevMatch) {
      trailer.prev = parseInt(prevMatch[1], 10);
    }

    const rootMatch = /\/Root\s+(\d+)\s+\d+\s+R/.exec(trailerContent);
    if (rootMatch) {
      trailer.root = parseInt(rootMatch[1], 10);
    }

    const infoMatch = /\/Info\s+(\d+)\s+\d+\s+R/.exec(trailerContent);
    if (infoMatch) {
      trailer.info = parseInt(infoMatch[1], 10);
    }

    return trailer as Trailer;
  }

  /**
   * Finds the start of the xref or trailer section.
   */
  findStartXRef(): number {
    const lastPartSize = Math.min(this.buffer.length, 1024);
    const lastPart = this.buffer.subarray(this.buffer.length - lastPartSize).toString('binary');
    const startxrefPattern = /startxref\s*\r?\n\s*(\d+)/;
    const startxrefMatch = startxrefPattern.exec(lastPart);

    if (!startxrefMatch) {
      // Fallback for weirdly formatted PDFs
      const fullContent = this.buffer.toString('binary');
      const fallbackMatch = startxrefPattern.exec(fullContent);
      if (!fallbackMatch) throw new Error('startxref not found');
      return parseInt(fallbackMatch[1], 10);
    }

    return parseInt(startxrefMatch[1], 10);
  }

  /**
   * Extracts the raw content of an indirect object as a Buffer.
   */
  extractObjectBuffer(objNum: number, xrefTable: Map<number, XRefEntry>): Buffer {
    const entry = xrefTable.get(objNum);
    
    if (!entry) {
      // Fallback: search for object in the entire buffer if xref lookup fails
      // Still using string search but limited to avoid massive overhead
      const content = this.buffer.toString('binary');
      const searchPattern = new RegExp(`\\b${objNum}\\s+\\d+\\s+obj`);
      const searchMatch = searchPattern.exec(content);
      if (searchMatch) {
        const start = searchMatch.index;
        const objKeywordIndex = content.indexOf('obj', start);
        const endobjIndex = content.indexOf('endobj', objKeywordIndex);
        if (endobjIndex !== -1) {
          return this.buffer.subarray(objKeywordIndex + 3, endobjIndex);
        }
      }
      throw new Error(`Object ${objNum} not found in xref table`);
    }

    const start = entry.offset;
    
    // Find "obj" keyword within a reasonable distance from offset
    const searchArea = this.buffer.subarray(start, Math.min(start + 100, this.buffer.length)).toString('binary');
    const objRelIndex = searchArea.indexOf('obj');
    
    if (objRelIndex === -1) {
      throw new Error(`Object ${objNum} start not found at offset ${start}`);
    }

    const contentStart = start + objRelIndex + 3;
    
    // Find "endobj" keyword
    // We search in chunks to avoid converting huge parts to string
    let searchPos = contentStart;
    let endobjRelIndex = -1;
    const endobjMarker = Buffer.from('endobj');
    
    // Efficient buffer search for endobj
    const endobjIndex = this.buffer.indexOf(endobjMarker, searchPos);
    
    if (endobjIndex === -1) {
      throw new Error(`Object ${objNum} end not found`);
    }

    return this.buffer.subarray(contentStart, endobjIndex);
  }

  /**
   * Extracts the raw content of an indirect object as a string.
   */
  extractObjectContent(objNum: number, xrefTable: Map<number, XRefEntry>): string {
    const buffer = this.extractObjectBuffer(objNum, xrefTable);
    return buffer.toString('binary');
  }

  /**
   * Finds all streams in the PDF content.
   */
  findAllStreams(): Array<{ start: number; end: number; content: string }> {
    const streams: Array<{ start: number; end: number; content: string }> = [];
    const streamPattern = /stream\r?\n([\s\S]*?)endstream/g;
    let match;

    while ((match = streamPattern.exec(this.buffer)) !== null) {
      streams.push({
        start: match.index,
        end: match.index + match[0].length,
        content: match[1],
      });
    }

    return streams;
  }
}
