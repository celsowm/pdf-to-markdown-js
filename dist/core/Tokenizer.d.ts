/**
 * Represents the type of a PDF token.
 */
export declare enum TokenType {
    NUMBER = "NUMBER",
    STRING = "STRING",
    HEX_STRING = "HEX_STRING",
    NAME = "NAME",
    KEYWORD = "KEYWORD",
    ARRAY_START = "ARRAY_START",
    ARRAY_END = "ARRAY_END",
    DICT_START = "DICT_START",
    DICT_END = "DICT_END",
    STREAM = "STREAM",
    ENDSTREAM = "ENDSTREAM",
    OBJ = "OBJ",
    ENDLOBJ = "ENDOBJ",
    OPERATOR = "OPERATOR",
    COMMENT = "COMMENT",
    EOF = "EOF"
}
/**
 * Represents a tokenized unit from PDF content.
 */
export interface Token {
    readonly type: TokenType;
    readonly value: string | number;
    readonly lineNumber: number;
}
/**
 * Tokenizes PDF file content into individual tokens.
 * Follows PDF Reference 3.2 (Lexical Conventions).
 */
export declare class Tokenizer {
    private readonly content;
    private position;
    private lineNumber;
    constructor(content: string);
    /**
     * Tokenizes the entire content and returns all tokens.
     */
    tokenize(): Token[];
    /**
     * Gets the next token from the current position.
     */
    private nextToken;
    /**
     * Skips whitespace characters (spaces, tabs, newlines).
     */
    private skipWhitespace;
    /**
     * Checks if a character is whitespace.
     */
    private isWhitespace;
    /**
     * Checks if a character is a delimiter.
     */
    private isDelimiter;
    /**
     * Reads a comment token (starts with %).
     */
    private readComment;
    /**
     * Reads a hexadecimal string (enclosed in < >).
     */
    private readHexString;
    /**
     * Reads a literal string (enclosed in parentheses).
     */
    private readString;
    /**
     * Reads a name (starts with /).
     */
    private readName;
    /**
     * Reads a number (integer or real).
     */
    private readNumber;
    /**
     * Reads a keyword or operator keyword.
     */
    private readKeyword;
}
//# sourceMappingURL=Tokenizer.d.ts.map