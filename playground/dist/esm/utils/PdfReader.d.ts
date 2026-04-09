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
export declare class PdfReader {
    private buffer;
    constructor(buffer: Buffer);
    /**
     * Creates a PdfReader from a file path.
     */
    static fromFile(filePath: string): PdfReader;
    /**
     * Creates a PdfReader from a Buffer.
     */
    static fromBuffer(buffer: Buffer): PdfReader;
    /**
     * Creates a PdfReader from a binary string (for browser compatibility).
     */
    static fromBinaryString(binaryString: string): PdfReader;
    /**
     * Gets the raw binary content of the PDF.
     */
    getBinaryContent(): Buffer;
    /**
     * Gets the raw string content of the PDF.
     */
    getStringContent(): string;
    /**
     * Validates if the file starts with a valid PDF header.
     */
    validateHeader(): boolean;
    /**
     * Extracts the PDF version from the header.
     */
    getVersion(): string;
    /**
     * Finds and parses the cross-reference table.
     */
    parseXRefTable(): Map<number, XRefEntry>;
    /**
     * Finds and parses the trailer dictionary.
     */
    parseTrailer(): Trailer;
    /**
     * Finds the start of the xref or trailer section.
     */
    findStartXRef(): number;
    /**
     * Extracts the raw content of an indirect object.
     */
    extractObjectContent(objNum: number, xrefTable: Map<number, XRefEntry>): string;
    /**
     * Finds all streams in the PDF content.
     */
    findAllStreams(): Array<{
        start: number;
        end: number;
        content: string;
    }>;
}
//# sourceMappingURL=PdfReader.d.ts.map