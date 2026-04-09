import { Token } from './Tokenizer';
/**
 * Represents a PDF object reference (indirect reference).
 */
export interface IndirectReference {
    readonly objNum: number;
    readonly genNum: number;
}
/**
 * Represents a parsed PDF dictionary.
 */
export interface PdfDictionary {
    readonly type: 'dictionary';
    readonly entries: Map<string, PdfObject>;
}
/**
 * Represents a PDF array.
 */
export interface PdfArray {
    readonly type: 'array';
    readonly elements: PdfObject[];
}
/**
 * Represents a PDF stream object.
 */
export interface PdfStream {
    readonly type: 'stream';
    readonly dictionary: PdfDictionary;
    readonly content: string;
}
/**
 * Represents any PDF object.
 */
export type PdfObject = {
    readonly type: 'null';
} | {
    readonly type: 'boolean';
    readonly value: boolean;
} | {
    readonly type: 'number';
    readonly value: number;
} | {
    readonly type: 'string';
    readonly value: string;
} | {
    readonly type: 'name';
    readonly value: string;
} | {
    readonly type: 'reference';
    readonly objNum: number;
    readonly genNum: number;
} | PdfDictionary | PdfArray | PdfStream;
/**
 * Parses PDF objects from tokenized content.
 */
export declare class ObjectParser {
    private readonly tokens;
    private position;
    constructor(tokens: Token[]);
    /**
     * Parses PDF object content from raw string.
     */
    static parseContent(content: string): PdfObject;
    /**
     * Parses the next PDF object from tokens.
     */
    parseObject(): PdfObject;
    /**
     * Parses a keyword value.
     */
    private parseKeyword;
    /**
     * Parses a PDF array.
     */
    private parseArray;
    /**
     * Parses a PDF dictionary.
     */
    private parseDictionary;
    /**
     * Handles a dictionary that is followed by a stream.
     */
    private handleStreamDictionary;
    /**
     * Converts a hex string to a regular string.
     */
    private hexToString;
    /**
     * Gets the current token without advancing.
     */
    peek(): Token | undefined;
    /**
     * Checks if there are more tokens to process.
     */
    hasMore(): boolean;
}
//# sourceMappingURL=ObjectParser.d.ts.map