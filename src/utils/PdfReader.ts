import * as fs from 'fs';

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
  private buffer: string;

  constructor(buffer: Buffer) {
    this.buffer = buffer.toString('binary');
  }

  /**
   * Creates a PdfReader from a file path.
   */
  static fromFile(filePath: string): PdfReader {
    const buffer = fs.readFileSync(filePath);
    return new PdfReader(buffer);
  }

  /**
   * Creates a PdfReader from a Buffer.
   */
  static fromBuffer(buffer: Buffer): PdfReader {
    return new PdfReader(buffer);
  }

  /**
   * Gets the raw binary content of the PDF.
   */
  getBinaryContent(): Buffer {
    return Buffer.from(this.buffer, 'binary');
  }

  /**
   * Gets the raw string content of the PDF.
   */
  getStringContent(): string {
    return this.buffer;
  }

  /**
   * Validates if the file starts with a valid PDF header.
   */
  validateHeader(): boolean {
    return this.buffer.startsWith('%PDF-');
  }

  /**
   * Extracts the PDF version from the header.
   */
  getVersion(): string {
    if (!this.validateHeader()) {
      throw new Error('Invalid PDF header');
    }
    return this.buffer.substring(5, 8);
  }

  /**
   * Finds and parses the cross-reference table.
   */
  parseXRefTable(): Map<number, XRefEntry> {
    const xrefEntries = new Map<number, XRefEntry>();
    const xrefPattern = /xref\s*\n([\s\S]*?)trailer/;
    const xrefMatch = xrefPattern.exec(this.buffer);

    if (!xrefMatch) {
      throw new Error('Cross-reference table not found');
    }

    const xrefContent = xrefMatch[1];
    const subsectionPattern = /(\d+)\s+(\d+)\s*\n([\s\S]*?)(?=\d+\s+\d+|$)/g;
    let subsectionMatch;

    while ((subsectionMatch = subsectionPattern.exec(xrefContent)) !== null) {
      const startObjNum = parseInt(subsectionMatch[1], 10);
      const count = parseInt(subsectionMatch[2], 10);
      const entriesText = subsectionMatch[3];

      const entryPattern = /(\d{10})\s+(\d{5})\s+([fn])\s*/g;
      let entryMatch;
      let objNum = startObjNum;

      while ((entryMatch = entryPattern.exec(entriesText)) !== null && objNum < startObjNum + count) {
        const offset = parseInt(entryMatch[1], 10);
        const generation = parseInt(entryMatch[2], 10);
        const inUse = entryMatch[3] === 'n';

        if (inUse) {
          xrefEntries.set(objNum, { offset, generation, inUse });
        }

        objNum++;
      }
    }

    return xrefEntries;
  }

  /**
   * Finds and parses the trailer dictionary.
   */
  parseTrailer(): Trailer {
    const trailerPattern = /trailer\s*<<([\s\S]*?)>>/;
    const trailerMatch = trailerPattern.exec(this.buffer);

    if (!trailerMatch) {
      throw new Error('Trailer not found');
    }

    const trailerContent = trailerMatch[1];
    const trailer: Record<string, number | number[] | undefined> = {};

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

    return trailer as unknown as Trailer;
  }

  /**
   * Finds the start of the xref or trailer section.
   */
  findStartXRef(): number {
    const startxrefPattern = /startxref\s*\n\s*(\d+)/;
    const startxrefMatch = startxrefPattern.exec(this.buffer);

    if (!startxrefMatch) {
      throw new Error('startxref not found');
    }

    return parseInt(startxrefMatch[1], 10);
  }

  /**
   * Extracts the raw content of an indirect object.
   */
  extractObjectContent(objNum: number, xrefTable: Map<number, XRefEntry>): string {
    const entry = xrefTable.get(objNum);

    if (!entry) {
      throw new Error(`Object ${objNum} not found in xref table`);
    }

    // Find the object definition starting from the offset
    const objPattern = new RegExp(`${objNum}\\s+\\d+\\s+obj([\\s\\S]*?)endobj`);
    const remainingContent = this.buffer.substring(entry.offset);
    const objMatch = objPattern.exec(remainingContent);

    if (!objMatch) {
      throw new Error(`Object ${objNum} content not found`);
    }

    return objMatch[1];
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
