/**
 * Represents a text positioning matrix.
 */
export interface TextMatrix {
    readonly a: number;
    readonly b: number;
    readonly c: number;
    readonly d: number;
    readonly e: number;
    readonly f: number;
}
/**
 * Represents a parsed text operation from the content stream.
 */
export interface TextOperation {
    readonly type: 'text' | 'moveToNextLine' | 'setTextMatrix' | 'setFont' | 'lineWidth' | 'unknown';
    readonly text?: string;
    readonly matrix?: TextMatrix;
    readonly fontName?: string;
    readonly fontSize?: number;
    readonly x?: number;
    readonly y?: number;
}
/**
 * Default identity matrix.
 */
export declare const IDENTITY_MATRIX: TextMatrix;
/**
 * Parses PDF content streams to extract text operations.
 * Handles PDF text positioning operators as per PDF Reference Section 9.
 */
export declare class ContentStreamParser {
    private readonly streamContent;
    private position;
    constructor(streamContent: string);
    /**
     * Parses the content stream and returns text operations.
     */
    parse(): TextOperation[];
    /**
     * Skips whitespace characters.
     */
    private skipWhitespace;
    /**
     * Tries to parse text showing operators: Tj, TJ, ', "
     */
    private tryParseTextOperator;
    /**
     * Parses a TJ operator (array of strings with positioning).
     */
    private parseTJOperator;
    /**
     * Parses a parenthesized string.
     */
    private parseParenthesizedString;
    /**
     * Tries to parse text matrix operator (Tm).
     */
    private tryParseTextMatrix;
    /**
     * Tries to parse font operator (Tf).
     */
    private tryParseFontOperator;
    /**
     * Tries to parse text line move operators (T*, TD, TD, TL).
     */
    private tryParseTextLineMove;
    /**
     * Skips content until a potential text operator is found.
     */
    private skipUntilPotentialTextOperator;
    /**
     * Skips content until the next operator.
     */
    private skipUntilOperator;
}
//# sourceMappingURL=ContentStreamParser.d.ts.map