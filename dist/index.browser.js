// PDF to Markdown - Browser IIFE Bundle
// This bundle exposes PdfToMarkdown globally

(function(window) {
  "use strict";

  // models/TextElement
// export {};


  // models/Page
/**
 * Helper function to create a Page object.
 */
function createPage(index, width, height, textElements) {
    return {
        index,
        width,
        height,
        textElements,
    };
}


  // models/PdfDocument
/**
 * Helper function to create a PdfDocument object.
 */
function createPdfDocument(pages, metadata = {}) {
    return {
        pages,
        metadata,
    };
}


  // models/MarkdownNode
/**
 * Default inline formatting.
 */
const DEFAULT_FORMATTING = {
    bold: false,
    italic: false,
    strike: false,
    code: false,
};
/**
 * Helper function to create a document node.
 */
function createDocumentNode(children) {
    return {
        type: 'document',
        children,
    };
}
/**
 * Helper function to create a heading node.
 */
function createHeadingNode(level, content) {
    return {
        type: 'heading',
        level,
        content,
        children: [],
    };
}
/**
 * Helper function to create a paragraph node.
 */
function createParagraphNode(children) {
    return {
        type: 'paragraph',
        children,
    };
}
/**
 * Helper function to create a text node.
 */
function createTextNode(content, formatting = DEFAULT_FORMATTING) {
    return {
        type: 'text',
        content,
        children: [],
        metadata: { formatting },
    };
}
/**
 * Helper function to create a list node.
 */
function createListNode(ordered) {
    return {
        type: 'list',
        ordered,
        children: [],
    };
}
/**
 * Helper function to create a table node.
 */
function createTableNode(headers, rows) {
    return {
        type: 'table',
        headers,
        rows,
        children: [],
    };
}


  // utils/PdfReader
// import removed
/**
 * Reads and parses the basic structure of a PDF file.
 */
class PdfReader {
    constructor(buffer) {
        this.buffer = buffer.toString('binary');
    }
    /**
     * Creates a PdfReader from a file path.
     */
    static fromFile(filePath) {
        const buffer = fs.readFileSync(filePath);
        return new PdfReader(buffer);
    }
    /**
     * Creates a PdfReader from a Buffer.
     */
    static fromBuffer(buffer) {
        return new PdfReader(buffer);
    }
    /**
     * Creates a PdfReader from a binary string (for browser compatibility).
     */
    static fromBinaryString(binaryString) {
        const reader = Object.create(PdfReader.prototype);
        reader.buffer = binaryString;
        return reader;
    }
    /**
     * Gets the raw binary content of the PDF.
     */
    getBinaryContent() {
        return Buffer.from(this.buffer, 'binary');
    }
    /**
     * Gets the raw string content of the PDF.
     */
    getStringContent() {
        return this.buffer;
    }
    /**
     * Validates if the file starts with a valid PDF header.
     */
    validateHeader() {
        return this.buffer.startsWith('%PDF-');
    }
    /**
     * Extracts the PDF version from the header.
     */
    getVersion() {
        if (!this.validateHeader()) {
            throw new Error('Invalid PDF header');
        }
        return this.buffer.substring(5, 8);
    }
    /**
     * Finds and parses the cross-reference table.
     */
    parseXRefTable() {
        const xrefEntries = new Map();
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
    parseTrailer() {
        const trailerPattern = /trailer\s*<<([\s\S]*?)>>/;
        const trailerMatch = trailerPattern.exec(this.buffer);
        if (!trailerMatch) {
            throw new Error('Trailer not found');
        }
        const trailerContent = trailerMatch[1];
        const trailer = {};
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
        return trailer;
    }
    /**
     * Finds the start of the xref or trailer section.
     */
    findStartXRef() {
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
    extractObjectContent(objNum, xrefTable) {
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
    findAllStreams() {
        const streams = [];
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


  // utils/MarkdownWriter
/**
 * Converts a Markdown AST to a markdown string.
 */
class MarkdownWriter {
    /**
     * Converts a MarkdownNode tree to a markdown string.
     */
    write(node) {
        return this.renderNode(node, 0);
    }
    /**
     * Renders a single node to markdown string.
     */
    renderNode(node, depth) {
        switch (node.type) {
            case 'document':
                return this.renderDocument(node, depth);
            case 'heading':
                return this.renderHeading(node, depth);
            case 'paragraph':
                return this.renderParagraph(node, depth);
            case 'text':
                return this.renderText(node, depth);
            case 'list':
                return this.renderList(node, depth);
            case 'table':
                return this.renderTable(node, depth);
            case 'codeBlock':
                return this.renderCodeBlock(node, depth);
            case 'blockquote':
                return this.renderBlockquote(node, depth);
            case 'horizontalRule':
                return '---\n\n';
            case 'lineBreak':
                return '  \n';
            default:
                return '';
        }
    }
    /**
     * Renders a document node.
     */
    renderDocument(node, _depth) {
        return node.children.map((child) => this.renderNode(child, 0)).join('\n');
    }
    /**
     * Renders a heading node.
     */
    renderHeading(node, _depth) {
        const prefix = '#'.repeat(node.level);
        return `${prefix} ${node.content}\n\n`;
    }
    /**
     * Renders a paragraph node.
     */
    renderParagraph(node, depth) {
        const content = node.children
            .map((child) => this.renderNode(child, depth))
            .join(' ')
            .trim();
        return content ? `${content}\n\n` : '';
    }
    /**
     * Renders a text node.
     */
    renderText(node, _depth) {
        const content = node.content || '';
        const formatting = node.metadata?.formatting;
        if (!formatting) {
            return content;
        }
        return this.applyInlineFormatting(content, formatting);
    }
    /**
     * Applies inline formatting to text.
     */
    applyInlineFormatting(text, formatting) {
        let result = text;
        // Apply code formatting first (backticks)
        if (formatting.code) {
            result = `\`${result}\``;
        }
        // Apply bold
        if (formatting.bold) {
            result = `**${result}**`;
        }
        // Apply italic
        if (formatting.italic) {
            result = `*${result}*`;
        }
        // Apply strike-through
        if (formatting.strike) {
            result = `~~${result}~~`;
        }
        return result;
    }
    /**
     * Renders a list node.
     */
    renderList(node, _depth) {
        let result = '';
        let index = 1;
        for (const item of node.children) {
            const prefix = node.ordered ? `${index}.` : '-';
            const itemContent = item.children
                .map((child) => this.renderNode(child, 0))
                .join(' ')
                .trim();
            result += `${prefix} ${itemContent}\n`;
            index++;
        }
        return result + '\n';
    }
    /**
     * Renders a table node.
     */
    renderTable(node, _depth) {
        let result = '';
        // Header row
        result += '| ' + node.headers.join(' | ') + ' |\n';
        result += '| ' + node.headers.map(() => '---').join(' | ') + ' |\n';
        // Data rows
        for (const row of node.rows) {
            result += '| ' + row.join(' | ') + ' |\n';
        }
        return result + '\n';
    }
    /**
     * Renders a code block node.
     */
    renderCodeBlock(node, _depth) {
        const language = node.metadata?.language || '';
        return `\`\`\`${language}\n${node.content}\n\`\`\`\n\n`;
    }
    /**
     * Renders a blockquote node.
     */
    renderBlockquote(node, depth) {
        const content = node.children
            .map((child) => this.renderNode(child, depth))
            .join('\n')
            .trim();
        const lines = content.split('\n');
        const quoted = lines.map((line) => `> ${line}`).join('\n');
        return `${quoted}\n\n`;
    }
}


  // core/Tokenizer
/**
 * Represents the type of a PDF token.
 */
var TokenType;
(function (TokenType) {
    TokenType["NUMBER"] = "NUMBER";
    TokenType["STRING"] = "STRING";
    TokenType["HEX_STRING"] = "HEX_STRING";
    TokenType["NAME"] = "NAME";
    TokenType["KEYWORD"] = "KEYWORD";
    TokenType["ARRAY_START"] = "ARRAY_START";
    TokenType["ARRAY_END"] = "ARRAY_END";
    TokenType["DICT_START"] = "DICT_START";
    TokenType["DICT_END"] = "DICT_END";
    TokenType["STREAM"] = "STREAM";
    TokenType["ENDSTREAM"] = "ENDSTREAM";
    TokenType["OBJ"] = "OBJ";
    TokenType["ENDLOBJ"] = "ENDOBJ";
    TokenType["OPERATOR"] = "OPERATOR";
    TokenType["COMMENT"] = "COMMENT";
    TokenType["EOF"] = "EOF";
})(TokenType || (TokenType = {}));
/**
 * Tokenizes PDF file content into individual tokens.
 * Follows PDF Reference 3.2 (Lexical Conventions).
 */
class Tokenizer {
    constructor(content) {
        this.position = 0;
        this.lineNumber = 1;
        this.content = content;
    }
    /**
     * Tokenizes the entire content and returns all tokens.
     */
    tokenize() {
        const tokens = [];
        while (this.position < this.content.length) {
            const token = this.nextToken();
            if (token) {
                tokens.push(token);
            }
        }
        return tokens;
    }
    /**
     * Gets the next token from the current position.
     */
    nextToken() {
        this.skipWhitespace();
        if (this.position >= this.content.length) {
            return null;
        }
        const char = this.content[this.position];
        // Comments
        if (char === '%') {
            return this.readComment();
        }
        // Delimiters
        switch (char) {
            case '<':
                if (this.content[this.position + 1] === '<') {
                    this.position += 2;
                    return { type: TokenType.DICT_START, value: '<<', lineNumber: this.lineNumber };
                }
                return this.readHexString();
            case '>':
                if (this.content[this.position + 1] === '>') {
                    this.position += 2;
                    return { type: TokenType.DICT_END, value: '>>', lineNumber: this.lineNumber };
                }
                // Single > is unusual but skip it
                this.position++;
                return { type: TokenType.OPERATOR, value: '>', lineNumber: this.lineNumber };
            case '[':
                this.position++;
                return { type: TokenType.ARRAY_START, value: '[', lineNumber: this.lineNumber };
            case ']':
                this.position++;
                return { type: TokenType.ARRAY_END, value: ']', lineNumber: this.lineNumber };
            case '/':
                return this.readName();
            case '(':
                return this.readString();
            case ')':
                this.position++;
                return { type: TokenType.STRING, value: ')', lineNumber: this.lineNumber };
        }
        // Numbers (integers or real)
        if (char === '+' || char === '-' || (char >= '0' && char <= '9')) {
            return this.readNumber();
        }
        // Keywords and operators
        if (this.isDelimiter(char) === false) {
            return this.readKeyword();
        }
        // Skip unknown single characters
        this.position++;
        return { type: TokenType.OPERATOR, value: char, lineNumber: this.lineNumber };
    }
    /**
     * Skips whitespace characters (spaces, tabs, newlines).
     */
    skipWhitespace() {
        while (this.position < this.content.length) {
            const char = this.content[this.position];
            if (this.isWhitespace(char)) {
                if (char === '\r' || char === '\n') {
                    this.lineNumber++;
                }
                this.position++;
            }
            else {
                break;
            }
        }
    }
    /**
     * Checks if a character is whitespace.
     */
    isWhitespace(char) {
        return char === ' ' || char === '\t' || char === '\n' || char === '\r' || char === '\f';
    }
    /**
     * Checks if a character is a delimiter.
     */
    isDelimiter(char) {
        return '[]<>()/{}/%'.includes(char) || this.isWhitespace(char);
    }
    /**
     * Reads a comment token (starts with %).
     */
    readComment() {
        let value = '';
        this.position++; // Skip %
        while (this.position < this.content.length) {
            const char = this.content[this.position];
            if (char === '\r' || char === '\n') {
                break;
            }
            value += char;
            this.position++;
        }
        return { type: TokenType.COMMENT, value, lineNumber: this.lineNumber };
    }
    /**
     * Reads a hexadecimal string (enclosed in < >).
     */
    readHexString() {
        let value = '';
        this.position++; // Skip <
        while (this.position < this.content.length) {
            const char = this.content[this.position];
            if (char === '>') {
                this.position++;
                break;
            }
            if (char !== ' ' && char !== '\t' && char !== '\n' && char !== '\r') {
                value += char;
            }
            this.position++;
        }
        return { type: TokenType.HEX_STRING, value, lineNumber: this.lineNumber };
    }
    /**
     * Reads a literal string (enclosed in parentheses).
     */
    readString() {
        let value = '';
        this.position++; // Skip (
        let depth = 1;
        while (this.position < this.content.length && depth > 0) {
            const char = this.content[this.position];
            if (char === '\\') {
                // Escape sequence
                this.position++;
                const nextChar = this.content[this.position];
                switch (nextChar) {
                    case 'n':
                        value += '\n';
                        break;
                    case 'r':
                        value += '\r';
                        break;
                    case 't':
                        value += '\t';
                        break;
                    case 'b':
                        value += '\b';
                        break;
                    case 'f':
                        value += '\f';
                        break;
                    case '(':
                        value += '(';
                        break;
                    case ')':
                        value += ')';
                        break;
                    case '\\':
                        value += '\\';
                        break;
                    default:
                        // Octal escape
                        if (nextChar >= '0' && nextChar <= '7') {
                            let octal = nextChar;
                            this.position++;
                            if (this.position < this.content.length) {
                                const next = this.content[this.position];
                                if (next >= '0' && next <= '7') {
                                    octal += next;
                                    this.position++;
                                    if (this.position < this.content.length) {
                                        const next2 = this.content[this.position];
                                        if (next2 >= '0' && next2 <= '7') {
                                            octal += next2;
                                        }
                                        else {
                                            this.position--;
                                        }
                                    }
                                }
                                else {
                                    this.position--;
                                }
                            }
                            value += String.fromCharCode(parseInt(octal, 8));
                        }
                        else {
                            value += nextChar;
                        }
                }
            }
            else if (char === '(') {
                depth++;
                value += char;
            }
            else if (char === ')') {
                depth--;
                if (depth > 0) {
                    value += char;
                }
            }
            else {
                value += char;
            }
            this.position++;
        }
        return { type: TokenType.STRING, value, lineNumber: this.lineNumber };
    }
    /**
     * Reads a name (starts with /).
     */
    readName() {
        let value = '';
        this.position++; // Skip /
        while (this.position < this.content.length) {
            const char = this.content[this.position];
            if (this.isDelimiter(char) || char === '/') {
                break;
            }
            value += char;
            this.position++;
        }
        return { type: TokenType.NAME, value, lineNumber: this.lineNumber };
    }
    /**
     * Reads a number (integer or real).
     */
    readNumber() {
        let value = '';
        let isReal = false;
        while (this.position < this.content.length) {
            const char = this.content[this.position];
            if (char === '.') {
                isReal = true;
                value += char;
            }
            else if (char >= '0' && char <= '9') {
                value += char;
            }
            else if ((char === '+' || char === '-') && value === '') {
                value += char;
            }
            else {
                break;
            }
            this.position++;
        }
        const numericValue = isReal ? parseFloat(value) : parseInt(value, 10);
        return { type: TokenType.NUMBER, value: numericValue, lineNumber: this.lineNumber };
    }
    /**
     * Reads a keyword or operator keyword.
     */
    readKeyword() {
        let value = '';
        while (this.position < this.content.length) {
            const char = this.content[this.position];
            if (this.isDelimiter(char)) {
                break;
            }
            value += char;
            this.position++;
        }
        // Check for specific keywords
        switch (value) {
            case 'stream':
                return { type: TokenType.STREAM, value, lineNumber: this.lineNumber };
            case 'endstream':
                return { type: TokenType.ENDSTREAM, value, lineNumber: this.lineNumber };
            case 'obj':
                return { type: TokenType.OBJ, value, lineNumber: this.lineNumber };
            case 'endobj':
                return { type: TokenType.ENDLOBJ, value, lineNumber: this.lineNumber };
            case 'null':
            case 'true':
            case 'false':
                return { type: TokenType.KEYWORD, value, lineNumber: this.lineNumber };
            default:
                // It's an operator or identifier
                return { type: TokenType.OPERATOR, value, lineNumber: this.lineNumber };
        }
    }
}


  // core/ObjectParser
// import removed
/**
 * Parses PDF objects from tokenized content.
 */
class ObjectParser {
    constructor(tokens) {
        this.position = 0;
        this.tokens = tokens;
    }
    /**
     * Parses PDF object content from raw string.
     */
    static parseContent(content) {
        const tokenizer = new Tokenizer(content);
        const tokens = tokenizer.tokenize();
        const parser = new ObjectParser(tokens);
        return parser.parseObject();
    }
    /**
     * Parses the next PDF object from tokens.
     */
    parseObject() {
        if (this.position >= this.tokens.length) {
            throw new Error('Unexpected end of tokens');
        }
        const token = this.tokens[this.position];
        switch (token.type) {
            case TokenType.KEYWORD:
                this.position++;
                return this.parseKeyword(token.value);
            case TokenType.NUMBER:
                this.position++;
                // Check if this is an indirect reference (num gen R)
                if (this.position + 1 < this.tokens.length &&
                    this.tokens[this.position].type === TokenType.NUMBER &&
                    this.tokens[this.position + 1].type === TokenType.OPERATOR &&
                    this.tokens[this.position + 1].value === 'R') {
                    const objNum = token.value;
                    const genNum = this.tokens[this.position].value;
                    this.position += 2;
                    return { type: 'reference', objNum, genNum };
                }
                return { type: 'number', value: token.value };
            case TokenType.STRING:
                this.position++;
                return { type: 'string', value: token.value };
            case TokenType.HEX_STRING:
                this.position++;
                return { type: 'string', value: this.hexToString(token.value) };
            case TokenType.NAME:
                this.position++;
                return { type: 'name', value: token.value };
            case TokenType.ARRAY_START:
                return this.parseArray();
            case TokenType.DICT_START:
                return this.parseDictionary();
            default:
                this.position++;
                return { type: 'string', value: String(token.value) };
        }
    }
    /**
     * Parses a keyword value.
     */
    parseKeyword(value) {
        switch (value) {
            case 'null':
                return { type: 'null' };
            case 'true':
                return { type: 'boolean', value: true };
            case 'false':
                return { type: 'boolean', value: false };
            default:
                return { type: 'string', value };
        }
    }
    /**
     * Parses a PDF array.
     */
    parseArray() {
        this.position++; // Skip [
        const elements = [];
        while (this.position < this.tokens.length) {
            const token = this.tokens[this.position];
            if (token.type === TokenType.ARRAY_END) {
                this.position++;
                return { type: 'array', elements };
            }
            elements.push(this.parseObject());
        }
        throw new Error('Unterminated array');
    }
    /**
     * Parses a PDF dictionary.
     */
    parseDictionary() {
        this.position++; // Skip <<
        const entries = new Map();
        const dict = { type: 'dictionary', entries };
        while (this.position < this.tokens.length) {
            const token = this.tokens[this.position];
            if (token.type === TokenType.DICT_END) {
                this.position++;
                // Check if followed by stream
                if (this.position < this.tokens.length &&
                    this.tokens[this.position].type === TokenType.STREAM) {
                    return this.handleStreamDictionary(dict);
                }
                return dict;
            }
            if (token.type === TokenType.NAME) {
                const key = token.value;
                this.position++;
                const value = this.parseObject();
                entries.set(key, value);
            }
            else {
                this.position++;
            }
        }
        throw new Error('Unterminated dictionary');
    }
    /**
     * Handles a dictionary that is followed by a stream.
     */
    handleStreamDictionary(dict) {
        this.position++; // Skip stream keyword
        // Collect stream content until endstream
        let streamContent = '';
        while (this.position < this.tokens.length) {
            const token = this.tokens[this.position];
            if (token.type === TokenType.ENDSTREAM) {
                this.position++;
                return {
                    type: 'stream',
                    dictionary: dict,
                    content: streamContent,
                };
            }
            streamContent += String(token.value);
            this.position++;
        }
        throw new Error('Unterminated stream');
    }
    /**
     * Converts a hex string to a regular string.
     */
    hexToString(hex) {
        let result = '';
        for (let i = 0; i < hex.length; i += 2) {
            const hexCode = hex.substring(i, i + 2);
            const charCode = parseInt(hexCode, 16);
            if (!isNaN(charCode)) {
                result += String.fromCharCode(charCode);
            }
        }
        return result;
    }
    /**
     * Gets the current token without advancing.
     */
    peek() {
        return this.tokens[this.position];
    }
    /**
     * Checks if there are more tokens to process.
     */
    hasMore() {
        return this.position < this.tokens.length;
    }
}


  // core/ContentStreamParser
/**
 * Default identity matrix.
 */
const IDENTITY_MATRIX = {
    a: 1,
    b: 0,
    c: 0,
    d: 1,
    e: 0,
    f: 0,
};
/**
 * Parses PDF content streams to extract text operations.
 * Handles PDF text positioning operators as per PDF Reference Section 9.
 */
class ContentStreamParser {
    constructor(streamContent) {
        this.position = 0;
        this.streamContent = streamContent;
    }
    /**
     * Parses the content stream and returns text operations.
     */
    parse() {
        const operations = [];
        let currentFontName;
        let currentFontSize;
        while (this.position < this.streamContent.length) {
            this.skipWhitespace();
            if (this.position >= this.streamContent.length) {
                break;
            }
            // Try to parse text showing operators (Tj, TJ, ', ")
            const textOperation = this.tryParseTextOperator(currentFontName, currentFontSize);
            if (textOperation) {
                operations.push(textOperation);
                continue;
            }
            // Try to parse text matrix operator (Tm)
            const matrixOperation = this.tryParseTextMatrix();
            if (matrixOperation) {
                operations.push(matrixOperation);
                continue;
            }
            // Try to parse font operator (Tf)
            const fontOperation = this.tryParseFontOperator();
            if (fontOperation) {
                currentFontName = fontOperation.fontName;
                currentFontSize = fontOperation.fontSize;
                operations.push(fontOperation);
                continue;
            }
            // Try to parse text line move operators (T*, TD, TD, TL)
            const lineOperation = this.tryParseTextLineMove();
            if (lineOperation) {
                operations.push(lineOperation);
                continue;
            }
            // Skip unknown content until next operator
            this.skipUntilOperator();
        }
        return operations;
    }
    /**
     * Skips whitespace characters.
     */
    skipWhitespace() {
        while (this.position < this.streamContent.length) {
            const char = this.streamContent[this.position];
            if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
                this.position++;
            }
            else {
                break;
            }
        }
    }
    /**
     * Tries to parse text showing operators: Tj, TJ, ', "
     */
    tryParseTextOperator(fontName, fontSize) {
        const startPosition = this.position;
        // Skip to find potential text operator
        this.skipUntilPotentialTextOperator();
        if (this.position >= this.streamContent.length) {
            this.position = startPosition;
            return null;
        }
        // Check for TJ (array of strings)
        if (this.streamContent[this.position] === '[') {
            const text = this.parseTJOperator();
            if (text !== null) {
                return {
                    type: 'text',
                    text,
                    fontName,
                    fontSize,
                };
            }
            this.position = startPosition;
            return null;
        }
        // Check for Tj (string)
        if (this.streamContent[this.position] === '(') {
            const text = this.parseParenthesizedString();
            if (text !== null && this.streamContent[this.position] === 'T') {
                this.position++; // Skip T
                this.position++; // Skip j
                return {
                    type: 'text',
                    text,
                    fontName,
                    fontSize,
                };
            }
            this.position = startPosition;
            return null;
        }
        this.position = startPosition;
        return null;
    }
    /**
     * Parses a TJ operator (array of strings with positioning).
     */
    parseTJOperator() {
        if (this.streamContent[this.position] !== '[') {
            return null;
        }
        this.position++; // Skip [
        let result = '';
        let bracketCount = 1;
        while (this.position < this.streamContent.length && bracketCount > 0) {
            const char = this.streamContent[this.position];
            if (char === '(') {
                const text = this.parseParenthesizedString();
                if (text !== null) {
                    result += text;
                }
            }
            else if (char === '[') {
                bracketCount++;
                this.position++;
            }
            else if (char === ']') {
                bracketCount--;
                this.position++;
            }
            else {
                this.position++;
            }
        }
        // Skip TJ
        if (this.position < this.streamContent.length &&
            this.streamContent[this.position] === 'T' &&
            this.streamContent[this.position + 1] === 'J') {
            this.position += 2;
            return result;
        }
        return result || null;
    }
    /**
     * Parses a parenthesized string.
     */
    parseParenthesizedString() {
        if (this.streamContent[this.position] !== '(') {
            return null;
        }
        this.position++; // Skip (
        let result = '';
        let depth = 1;
        while (this.position < this.streamContent.length && depth > 0) {
            const char = this.streamContent[this.position];
            if (char === '\\') {
                this.position++;
                const nextChar = this.streamContent[this.position];
                switch (nextChar) {
                    case 'n':
                        result += '\n';
                        break;
                    case 'r':
                        result += '\r';
                        break;
                    case 't':
                        result += '\t';
                        break;
                    case '(':
                        result += '(';
                        break;
                    case ')':
                        result += ')';
                        break;
                    case '\\':
                        result += '\\';
                        break;
                    default:
                        result += nextChar;
                }
            }
            else if (char === '(') {
                depth++;
                result += char;
            }
            else if (char === ')') {
                depth--;
                if (depth > 0) {
                    result += char;
                }
            }
            else {
                result += char;
            }
            this.position++;
        }
        return result;
    }
    /**
     * Tries to parse text matrix operator (Tm).
     */
    tryParseTextMatrix() {
        // Look for pattern: number number number number number number Tm
        const tmPattern = /([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)\s+Tm/;
        const substring = this.streamContent.substring(this.position);
        const match = tmPattern.exec(substring);
        if (match) {
            this.position += match[0].length;
            return {
                type: 'setTextMatrix',
                matrix: {
                    a: parseFloat(match[1]),
                    b: parseFloat(match[2]),
                    c: parseFloat(match[3]),
                    d: parseFloat(match[4]),
                    e: parseFloat(match[5]),
                    f: parseFloat(match[6]),
                },
            };
        }
        return null;
    }
    /**
     * Tries to parse font operator (Tf).
     */
    tryParseFontOperator() {
        const startPosition = this.position;
        // Look for pattern: /FontName Size Tf
        const tfPattern = /\/(\S+)\s+([+-]?\d*\.?\d+)\s+Tf/;
        const substring = this.streamContent.substring(this.position);
        const match = tfPattern.exec(substring);
        if (match) {
            this.position += match[0].length;
            return {
                type: 'setFont',
                fontName: match[1],
                fontSize: parseFloat(match[2]),
            };
        }
        this.position = startPosition;
        return null;
    }
    /**
     * Tries to parse text line move operators (T*, TD, TD, TL).
     */
    tryParseTextLineMove() {
        const startPosition = this.position;
        // T* - move to next line
        if (this.streamContent.substring(this.position, this.position + 2) === 'T*') {
            this.position += 2;
            return { type: 'moveToNextLine' };
        }
        // TL - set text leading
        const tlPattern = /([+-]?\d*\.?\d+)\s+TL/;
        const tlMatch = tlPattern.exec(this.streamContent.substring(this.position));
        if (tlMatch) {
            this.position += tlMatch[0].length;
            return { type: 'moveToNextLine' };
        }
        // TD or Td - move to next line and offset
        const tdPattern = /([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)\s+T[Dd]/;
        const tdMatch = tdPattern.exec(this.streamContent.substring(this.position));
        if (tdMatch) {
            this.position += tdMatch[0].length;
            return {
                type: 'moveToNextLine',
                x: parseFloat(tdMatch[1]),
                y: parseFloat(tdMatch[2]),
            };
        }
        this.position = startPosition;
        return null;
    }
    /**
     * Skips content until a potential text operator is found.
     */
    skipUntilPotentialTextOperator() {
        while (this.position < this.streamContent.length) {
            const char = this.streamContent[this.position];
            // Look for ( or [ which indicates text content
            if (char === '(' || char === '[') {
                return;
            }
            this.position++;
        }
    }
    /**
     * Skips content until the next operator.
     */
    skipUntilOperator() {
        while (this.position < this.streamContent.length) {
            const char = this.streamContent[this.position];
            // Operators are typically uppercase letters at word boundaries
            if (char >= 'A' && char <= 'Z') {
                return;
            }
            this.position++;
        }
    }
}


  // core/TextExtractor
// import removed
// import removed
/**
 * Default font sizes for common font names.
 */
const DEFAULT_FONT_SIZES = {
    normal: 12,
    bold: 12,
    italic: 12,
};
/**
 * Threshold for considering text on the same line (in user space units).
 */
const LINE_TOLERANCE = 2;
/**
 * Threshold for considering text part of the same word (in user space units).
 */
const WORD_TOLERANCE = 3;
/**
 * Extracts and organizes text from PDF text operations.
 * Applies heuristics to detect paragraphs, headings, and other structural elements.
 */
class TextExtractor {
    constructor(_pageWidth, _pageHeight, pageIndex) {
        this.pageIndex = pageIndex;
    }
    /**
     * Extracts text elements from a list of text operations.
     */
    extractTextElements(operations) {
        const positionedTexts = [];
        let currentMatrix = { ...IDENTITY_MATRIX };
        let currentFontName = 'F1';
        let currentFontSize = DEFAULT_FONT_SIZES.normal;
        for (const operation of operations) {
            switch (operation.type) {
                case 'setTextMatrix':
                    if (operation.matrix) {
                        currentMatrix = operation.matrix;
                    }
                    break;
                case 'setFont':
                    if (operation.fontName) {
                        currentFontName = operation.fontName;
                    }
                    if (operation.fontSize) {
                        currentFontSize = operation.fontSize;
                    }
                    break;
                case 'text':
                    if (operation.text) {
                        positionedTexts.push({
                            text: operation.text,
                            x: currentMatrix.e,
                            y: currentMatrix.f,
                            fontSize: currentFontSize,
                            fontName: currentFontName,
                        });
                    }
                    break;
                case 'moveToNextLine':
                    // Adjust matrix for next line
                    if (operation.x !== undefined && operation.y !== undefined) {
                        currentMatrix = {
                            ...currentMatrix,
                            e: operation.x,
                            f: operation.y,
                        };
                    }
                    else {
                        currentMatrix = {
                            ...currentMatrix,
                            e: 0,
                            f: currentMatrix.f - currentFontSize,
                        };
                    }
                    break;
            }
        }
        return this.organizeTextElements(positionedTexts);
    }
    /**
     * Organizes positioned text into coherent text elements.
     */
    organizeTextElements(positionedTexts) {
        if (positionedTexts.length === 0) {
            return [];
        }
        // Sort by Y position (top to bottom), then X position (left to right)
        const sorted = [...positionedTexts].sort((a, b) => {
            const yDiff = Math.abs(a.y - b.y);
            if (yDiff > LINE_TOLERANCE) {
                return b.y - a.y; // Higher Y first (top of page)
            }
            return a.x - b.x; // Lower X first (left of page)
        });
        const textElements = [];
        let currentLine = [sorted[0]];
        for (let i = 1; i < sorted.length; i++) {
            const item = sorted[i];
            const prevItem = currentLine[currentLine.length - 1];
            const yDiff = Math.abs(item.y - prevItem.y);
            if (yDiff <= LINE_TOLERANCE) {
                // Same line
                currentLine.push(item);
            }
            else {
                // New line - process the current line
                textElements.push(...this.processLine(currentLine));
                currentLine = [item];
            }
        }
        // Process the last line
        if (currentLine.length > 0) {
            textElements.push(...this.processLine(currentLine));
        }
        return textElements;
    }
    /**
     * Processes a single line of text, merging nearby text into words.
     */
    processLine(lineItems) {
        if (lineItems.length === 0) {
            return [];
        }
        // Sort by X position
        const sorted = [...lineItems].sort((a, b) => a.x - b.x);
        const elements = [];
        let currentText = sorted[0].text;
        let currentX = sorted[0].x;
        let currentY = sorted[0].y;
        let currentFontSize = sorted[0].fontSize;
        let currentFontName = sorted[0].fontName;
        let maxX = currentX + this.estimateTextWidth(currentText, currentFontSize);
        for (let i = 1; i < sorted.length; i++) {
            const item = sorted[i];
            const itemWidth = this.estimateTextWidth(item.text, item.fontSize);
            const gap = item.x - maxX;
            if (gap <= WORD_TOLERANCE && Math.abs(item.fontSize - currentFontSize) < 1) {
                // Merge into current element
                if (gap > WORD_TOLERANCE / 2) {
                    currentText += ' ';
                }
                currentText += item.text;
                maxX = Math.max(maxX, item.x + itemWidth);
                currentFontSize = Math.max(currentFontSize, item.fontSize);
            }
            else {
                // Create new element
                elements.push(this.createTextElement(currentText, currentX, currentY, maxX - currentX, currentFontSize, currentFontName));
                currentText = item.text;
                currentX = item.x;
                currentY = item.y;
                currentFontSize = item.fontSize;
                currentFontName = item.fontName;
                maxX = item.x + itemWidth;
            }
        }
        // Add the last element
        elements.push(this.createTextElement(currentText, currentX, currentY, maxX - currentX, currentFontSize, currentFontName));
        return elements;
    }
    /**
     * Creates a TextElement with proper formatting.
     */
    createTextElement(text, x, y, width, fontSize, fontName) {
        // Use FontRegistry for robust font analysis
        const characteristics = FontRegistry.analyze(fontName);
        // Also check for strike-through (not in standard registry)
        const isStrike = this.isStrikeFont(fontName);
        const isUnderline = false; // Underline is typically a separate operation in PDF
        return {
            text,
            x,
            y,
            width,
            height: fontSize,
            fontSize,
            fontName,
            isBold: characteristics.isBold,
            isItalic: characteristics.isItalic,
            isStrike,
            isUnderline,
            pageIndex: this.pageIndex,
        };
    }
    /**
     * Estimates the width of text based on font size.
     */
    estimateTextWidth(text, fontSize) {
        // Rough estimation: average character width is ~0.5 * fontSize
        return text.length * fontSize * 0.5;
    }
    /**
     * Checks if a font name indicates strike-through text.
     */
    isStrikeFont(fontName) {
        const lower = fontName.toLowerCase();
        return (lower.includes('strikethrough') ||
            lower.includes('line-through') ||
            lower.includes('strike') ||
            lower.includes('linethrough'));
    }
}


  // core/PdfParser
// import removed
// import removed
// import removed
// import removed
// import removed
// import removed
/**
 * Helper function to check if a PdfObject is a reference.
 */
function isReference(obj) {
    return obj.type === 'reference';
}
/**
 * Helper function to check if a PdfObject is a dictionary.
 */
function isDictionary(obj) {
    return obj.type === 'dictionary';
}
/**
 * Helper function to check if a PdfObject is an array.
 */
function isArray(obj) {
    return obj.type === 'array';
}
/**
 * Helper function to check if a PdfObject is a stream.
 */
function isStream(obj) {
    return obj.type === 'stream';
}
/**
 * Helper function to check if a PdfObject is a number.
 */
function isNumber(obj) {
    return obj.type === 'number';
}
/**
 * Helper function to check if a PdfObject is a string.
 */
function isString(obj) {
    return obj.type === 'string';
}
/**
 * Main PDF parser that orchestrates the entire parsing process.
 * Follows the Facade pattern - provides a simplified interface to the complex subsystem.
 */
class PdfParser {
    constructor(pdfReader, transformers) {
        this.pdfReader = pdfReader;
        this.transformers = [...transformers].sort((a, b) => b.getPriority() - a.getPriority());
    }
    /**
     * Parses the PDF document and returns the Markdown AST.
     */
    parse() {
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
    parseXRefTable() {
        try {
            return this.pdfReader.parseXRefTable();
        }
        catch {
            // If xref table parsing fails, try to find objects manually
            console.warn('Failed to parse xref table, attempting alternative extraction');
            return new Map();
        }
    }
    /**
     * Extracts page information from the PDF.
     */
    extractPages(xrefTable, trailer) {
        const pages = [];
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
            const pagesContent = this.pdfReader.extractObjectContent(pagesObj.objNum, xrefTable);
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
                    const page = this.extractPage(kid.objNum, xrefTable, pageIndex++);
                    if (page) {
                        pages.push(page);
                    }
                }
            }
        }
        catch (error) {
            console.warn('Error extracting pages:', error);
        }
        return pages;
    }
    /**
     * Extracts a single page from the PDF.
     */
    extractPage(objNum, xrefTable, pageIndex) {
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
        }
        catch (error) {
            console.warn(`Error extracting page ${pageIndex + 1}:`, error);
            return null;
        }
    }
    /**
     * Extracts text elements from the page contents.
     */
    extractTextFromContents(contents, xrefTable, width, height, pageIndex) {
        if (!contents) {
            return [];
        }
        let streamContent = '';
        if (isReference(contents)) {
            try {
                const objContent = this.pdfReader.extractObjectContent(contents.objNum, xrefTable);
                const objDict = ObjectParser.parseContent(objContent);
                if (isStream(objDict)) {
                    streamContent = objDict.content;
                }
            }
            catch {
                return [];
            }
        }
        else if (isArray(contents)) {
            // Multiple content streams
            const elements = contents.elements;
            for (const elem of elements) {
                if (isReference(elem)) {
                    try {
                        const objContent = this.pdfReader.extractObjectContent(elem.objNum, xrefTable);
                        const objDict = ObjectParser.parseContent(objContent);
                        if (isStream(objDict)) {
                            streamContent += objDict.content;
                        }
                    }
                    catch {
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
    extractMetadata(xrefTable, trailer) {
        const metadata = {};
        if (trailer.info) {
            try {
                const infoContent = this.pdfReader.extractObjectContent(trailer.info, xrefTable);
                const infoDict = ObjectParser.parseContent(infoContent);
                if (isDictionary(infoDict)) {
                    const entries = infoDict.entries;
                    for (const [key, value] of entries) {
                        if (isString(value)) {
                            metadata[key] = value.value;
                        }
                    }
                }
            }
            catch {
                // Ignore metadata errors
            }
        }
        return metadata;
    }
    /**
     * Gets a dictionary entry by key.
     */
    getDictionaryEntry(dict, key) {
        if (!isDictionary(dict)) {
            return null;
        }
        const entries = dict.entries;
        return entries.get(key) || null;
    }
    /**
     * Gets numeric value from a PDF object.
     */
    getNumericValue(obj) {
        if (isNumber(obj)) {
            return obj.value;
        }
        return 0;
    }
    /**
     * Converts a PdfDocument to Markdown AST.
     */
    convertToMarkdown(document) {
        const allNodes = [];
        for (const page of document.pages) {
            const pageNodes = this.transformPage(page.textElements, page.textElements);
            allNodes.push(...pageNodes);
        }
        return createDocumentNode(allNodes);
    }
    /**
     * Transforms text elements to Markdown nodes using registered transformers.
     */
    transformPage(elements, allElements) {
        if (elements.length === 0) {
            return [];
        }
        const nodes = [];
        const usedElements = new Set();
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


  // core/LatticeDetector
/**
 * Default Lattice configuration.
 */
const DEFAULT_LATTICE_CONFIG = {
    lineTolerance: 2,
    minTableWidth: 50,
    minTableHeight: 30,
    minCells: { rows: 2, cols: 2 },
    detectionWeight: 0.5,
};
/**
 * Lattice algorithm for table detection in PDFs.
 *
 * Detects tables by finding horizontal and vertical lines that form grid structures.
 * This is the same approach used by Camelot-py and other PDF table extraction tools.
 *
 * PDFs draw tables using line operators:
 * - `m` (moveto) + `l` (lineto) for lines
 * - `re` (rectangle) for boxes
 * - `S` or `s` (stroke) to render them
 *
 * The algorithm:
 * 1. Parse content stream for line-drawing operations
 * 2. Group lines into horizontal and vertical sets
 * 3. Find intersections between line sets
 * 4. Cluster intersections into table grids
 * 5. Extract cell boundaries from the grid
 */
class LatticeDetector {
    constructor(config = {}) {
        this.config = { ...DEFAULT_LATTICE_CONFIG, ...config };
    }
    /**
     * Detects tables in PDF content stream text.
     * @param content The raw PDF content stream
     * @returns Array of detected tables
     */
    detectTables(content) {
        // Step 1: Extract line segments from PDF operators
        const lines = this.extractLines(content);
        // Step 2: Separate horizontal and vertical lines
        const horizontalLines = lines.filter((l) => l.isHorizontal);
        const verticalLines = lines.filter((l) => l.isVertical);
        // Step 3: Find intersections
        const intersections = this.findIntersections(horizontalLines, verticalLines);
        if (intersections.length < 4) {
            return []; // Need at least 4 intersections for a minimal table
        }
        // Step 4: Cluster intersections into tables
        const tables = this.clusterIntersections(intersections);
        // Step 5: Build table grids
        return tables.map((table) => this.buildTableGrid(table));
    }
    /**
     * Extracts line segments from PDF content stream.
     * Parses PDF graphics operators: m, l, re, h, S, s
     */
    extractLines(content) {
        const lines = [];
        // PDF line drawing patterns
        // Rectangle: x y w h re
        const rectPattern = /([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)\s+re/g;
        let match;
        while ((match = rectPattern.exec(content)) !== null) {
            const x = parseFloat(match[1]);
            const y = parseFloat(match[2]);
            const w = parseFloat(match[3]);
            const h = parseFloat(match[4]);
            // Rectangle creates 4 lines
            if (w !== 0) {
                // Horizontal lines
                lines.push({
                    x1: x,
                    y1: y,
                    x2: x + w,
                    y2: y,
                    isHorizontal: true,
                    isVertical: false,
                });
                lines.push({
                    x1: x,
                    y1: y + h,
                    x2: x + w,
                    y2: y + h,
                    isHorizontal: true,
                    isVertical: false,
                });
            }
            if (h !== 0) {
                // Vertical lines
                lines.push({
                    x1: x,
                    y1: y,
                    x2: x,
                    y2: y + h,
                    isHorizontal: false,
                    isVertical: true,
                });
                lines.push({
                    x1: x + w,
                    y1: y,
                    x2: x + w,
                    y2: y + h,
                    isHorizontal: false,
                    isVertical: true,
                });
            }
        }
        // Line: x1 y1 m x2 y2 l S
        const linePattern = /([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)\s+m\s+([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)\s+l/g;
        while ((match = linePattern.exec(content)) !== null) {
            const x1 = parseFloat(match[1]);
            const y1 = parseFloat(match[2]);
            const x2 = parseFloat(match[3]);
            const y2 = parseFloat(match[4]);
            const isHorizontal = Math.abs(y2 - y1) < this.config.lineTolerance;
            const isVertical = Math.abs(x2 - x1) < this.config.lineTolerance;
            if (isHorizontal || isVertical) {
                lines.push({ x1, y1, x2, y2, isHorizontal, isVertical });
            }
        }
        return lines;
    }
    /**
     * Finds intersection points between horizontal and vertical lines.
     */
    findIntersections(horizontal, vertical) {
        const intersections = [];
        for (const hLine of horizontal) {
            for (const vLine of vertical) {
                const hY = hLine.y1;
                const hX1 = Math.min(hLine.x1, hLine.x2);
                const hX2 = Math.max(hLine.x1, hLine.x2);
                const vX1 = vLine.x1;
                const vY1 = Math.min(vLine.y1, vLine.y2);
                const vY2 = Math.max(vLine.y1, vLine.y2);
                // Check if vertical line crosses horizontal line
                const xMatch = vX1 >= hX1 - this.config.lineTolerance &&
                    vX1 <= hX2 + this.config.lineTolerance;
                const yMatch = hY >= vY1 - this.config.lineTolerance &&
                    hY <= vY2 + this.config.lineTolerance;
                if (xMatch && yMatch) {
                    intersections.push({
                        x: vX1,
                        y: hY,
                    });
                }
            }
        }
        return intersections;
    }
    /**
     * Clusters intersection points into potential tables.
     * Uses proximity-based clustering to group intersections.
     */
    clusterIntersections(intersections) {
        if (intersections.length < 4) {
            return [];
        }
        // Simple approach: if all intersections are within a reasonable area,
        // treat them as one table
        const xs = intersections.map(p => p.x);
        const ys = intersections.map(p => p.y);
        const xRange = Math.max(...xs) - Math.min(...xs);
        const yRange = Math.max(...ys) - Math.min(...ys);
        // Use average spacing to determine if this is a single table
        const avgSpacing = Math.max(xRange, yRange) / Math.sqrt(intersections.length);
        const threshold = avgSpacing * 2;
        const clusters = [];
        const visited = new Set();
        for (let i = 0; i < intersections.length; i++) {
            if (visited.has(i))
                continue;
            const cluster = [intersections[i]];
            visited.add(i);
            // Find all nearby intersections using flood fill
            const queue = [i];
            while (queue.length > 0) {
                const current = queue.shift();
                for (let j = 0; j < intersections.length; j++) {
                    if (visited.has(j))
                        continue;
                    const dist = this.distance(intersections[current], intersections[j]);
                    if (dist < threshold) {
                        cluster.push(intersections[j]);
                        visited.add(j);
                        queue.push(j);
                    }
                }
            }
            if (cluster.length >= 4) {
                clusters.push(cluster);
            }
        }
        return clusters;
    }
    /**
     * Builds a table grid from intersection points.
     * Identifies rows and columns from the intersection pattern.
     */
    buildTableGrid(intersections) {
        // Sort intersections
        const sorted = [...intersections].sort((a, b) => {
            const yDiff = Math.abs(a.y - b.y);
            if (yDiff > this.config.lineTolerance) {
                return b.y - a.y; // Top to bottom
            }
            return a.x - b.x; // Left to right
        });
        // Group by Y coordinate (rows)
        const rowGroups = this.groupByCoordinate(sorted, 'y', this.config.lineTolerance);
        const rows = rowGroups.length;
        // Group by X coordinate (columns)
        const colGroups = this.groupByCoordinate(sorted, 'x', this.config.lineTolerance);
        const cols = colGroups.length;
        // Calculate table boundaries
        const x1 = Math.min(...sorted.map((p) => p.x));
        const y1 = Math.min(...sorted.map((p) => p.y));
        const x2 = Math.max(...sorted.map((p) => p.x));
        const y2 = Math.max(...sorted.map((p) => p.y));
        // Build cells
        const cells = [];
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (row < rowGroups.length - 1 && col < colGroups.length - 1) {
                    cells.push({
                        rowIndex: row,
                        colIndex: col,
                        x1: colGroups[col],
                        y1: rowGroups[row],
                        x2: colGroups[col + 1],
                        y2: rowGroups[row + 1],
                    });
                }
            }
        }
        return {
            x1,
            y1,
            x2,
            y2,
            rows,
            cols,
            cells,
            hasHeader: rows >= 2, // Assume first row is header
        };
    }
    /**
     * Groups intersection points by a coordinate axis.
     */
    groupByCoordinate(points, axis, tolerance) {
        const values = points.map((p) => p[axis]);
        const sorted = [...new Set(values)].sort((a, b) => a - b);
        const groups = [];
        let currentGroup = [sorted[0]];
        for (let i = 1; i < sorted.length; i++) {
            const diff = Math.abs(sorted[i] - currentGroup[0]);
            if (diff <= tolerance) {
                currentGroup.push(sorted[i]);
            }
            else {
                // Average the group
                groups.push(currentGroup.reduce((a, b) => a + b, 0) / currentGroup.length);
                currentGroup = [sorted[i]];
            }
        }
        if (currentGroup.length > 0) {
            groups.push(currentGroup.reduce((a, b) => a + b, 0) / currentGroup.length);
        }
        return groups;
    }
    /**
     * Calculates Euclidean distance between two points.
     */
    distance(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    /**
     * Returns the current configuration.
     */
    getConfig() {
        return this.config;
    }
}


  // core/TableExtractor
/**
 * Extracts text content from detected table cells.
 */
class TableExtractor {
    /**
     * Extracts text from table cells based on text element positions.
     */
    extractTableContent(table, allTextElements) {
        // Initialize empty table
        const tableContent = Array.from({ length: table.rows }, () => Array(table.cols).fill(''));
        // Assign text elements to cells
        for (const textEl of allTextElements) {
            const cell = this.findCellForTextElement(textEl, table.cells);
            if (cell && cell.rowIndex < table.rows && cell.colIndex < table.cols) {
                const currentContent = tableContent[cell.rowIndex][cell.colIndex];
                const separator = currentContent ? ' ' : '';
                tableContent[cell.rowIndex][cell.colIndex] = currentContent + separator + textEl.text;
            }
        }
        // Trim whitespace from all cells
        return tableContent.map((row) => row.map((cell) => cell.trim()));
    }
    /**
     * Finds which cell a text element belongs to based on position.
     */
    findCellForTextElement(textEl, cells) {
        // Calculate center point of text element
        const textCenterX = textEl.x + textEl.width / 2;
        const textCenterY = textEl.y - textEl.height / 2; // PDF Y is inverted
        for (const cell of cells) {
            const inX = textCenterX >= cell.x1 && textCenterX <= cell.x2;
            const inY = textCenterY >= cell.y1 && textCenterY <= cell.y2;
            if (inX && inY) {
                return cell;
            }
        }
        // Fallback: find closest cell
        let closestCell = null;
        let closestDistance = Infinity;
        for (const cell of cells) {
            const cellCenterX = (cell.x1 + cell.x2) / 2;
            const cellCenterY = (cell.y1 + cell.y2) / 2;
            const dx = textCenterX - cellCenterX;
            const dy = textCenterY - cellCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestCell = cell;
            }
        }
        return closestCell;
    }
    /**
     * Filters text elements that fall within the table boundaries.
     */
    filterTextElementsForTable(table, allTextElements) {
        const padding = 5; // Small padding around table
        return allTextElements.filter((el) => el.x >= table.x1 - padding &&
            el.x <= table.x2 + padding &&
            el.y >= table.y1 - padding &&
            el.y <= table.y2 + padding);
    }
}


  // transformers/MarkdownTransformer
// export {};


  // transformers/HeadingTransformer
// import removed
/**
 * Font size thresholds for heading levels.
 */
const HEADING_THRESHOLDS = {
    h1: 24,
    h2: 20,
    h3: 16,
    h4: 14,
    h5: 12,
    h6: 11,
};
/**
 * Transformer that detects headings based on font size and weight.
 */
class HeadingTransformer {
    getPriority() {
        return 100; // Highest priority - headings should be detected first
    }
    canTransform(elements) {
        if (elements.length === 0) {
            return false;
        }
        // Check if any element has a font size that qualifies as a heading
        return elements.some((el) => el.fontSize >= HEADING_THRESHOLDS.h6 || el.isBold);
    }
    transform(elements, allElements) {
        const nodes = [];
        const medianFontSize = this.getMedianFontSize(allElements);
        for (const element of elements) {
            const headingLevel = this.detectHeadingLevel(element, medianFontSize);
            if (headingLevel) {
                nodes.push(createHeadingNode(headingLevel, element.text.trim()));
            }
        }
        return nodes;
    }
    /**
     * Detects the heading level based on font size and weight.
     */
    detectHeadingLevel(element, medianFontSize) {
        const { fontSize, isBold } = element;
        // If font size is significantly larger than median, it's likely a heading
        const ratio = fontSize / medianFontSize;
        if (fontSize >= HEADING_THRESHOLDS.h1 || (isBold && ratio > 2)) {
            return 1;
        }
        else if (fontSize >= HEADING_THRESHOLDS.h2 || (isBold && ratio > 1.7)) {
            return 2;
        }
        else if (fontSize >= HEADING_THRESHOLDS.h3 || (isBold && ratio > 1.4)) {
            return 3;
        }
        else if (fontSize >= HEADING_THRESHOLDS.h4 || (isBold && ratio > 1.2)) {
            return 4;
        }
        else if (fontSize >= HEADING_THRESHOLDS.h5 || (isBold && ratio > 1.1)) {
            return 5;
        }
        else if (fontSize >= HEADING_THRESHOLDS.h6 || (isBold && ratio > 1.05)) {
            return 6;
        }
        return null;
    }
    /**
     * Calculates the median font size from all elements.
     */
    getMedianFontSize(elements) {
        if (elements.length === 0) {
            return 12; // Default
        }
        const sorted = [...elements].sort((a, b) => a.fontSize - b.fontSize);
        const middle = Math.floor(sorted.length / 2);
        if (sorted.length % 2 === 0) {
            return (sorted[middle - 1].fontSize + sorted[middle].fontSize) / 2;
        }
        return sorted[middle].fontSize;
    }
}


  // transformers/ListTransformer
// import removed
/**
 * Common list markers.
 */
const BULLET_MARKERS = ['•', '●', '○', '▪', '▫', '◦', '∙', '-'];
const NUMBERED_PATTERN = /^\d+[\.\)]\s/;
/**
 * Transformer that detects ordered and unordered lists.
 */
class ListTransformer {
    getPriority() {
        return 90; // High priority, but after headings
    }
    canTransform(elements) {
        if (elements.length < 2) {
            return false;
        }
        // Check if elements form a list pattern
        return this.isListPattern(elements);
    }
    transform(elements, _allElements) {
        const nodes = [];
        const isOrdered = this.isOrderedList(elements);
        const listNode = createListNode(isOrdered);
        for (const element of elements) {
            const text = this.stripListMarker(element.text);
            const textNode = createTextNode(text.trim());
            listNode.children.push(textNode);
        }
        nodes.push(listNode);
        return nodes;
    }
    /**
     * Checks if elements form a list pattern.
     */
    isListPattern(elements) {
        let listCount = 0;
        for (const element of elements) {
            const trimmed = element.text.trim();
            if (this.hasListMarker(trimmed)) {
                listCount++;
            }
        }
        // If majority of elements have list markers, it's a list
        return listCount >= Math.ceil(elements.length * 0.6);
    }
    /**
     * Checks if the list is ordered (numbered).
     */
    isOrderedList(elements) {
        let orderedCount = 0;
        for (const element of elements) {
            const trimmed = element.text.trim();
            if (NUMBERED_PATTERN.test(trimmed)) {
                orderedCount++;
            }
        }
        return orderedCount > elements.length / 2;
    }
    /**
     * Checks if text has a list marker.
     */
    hasListMarker(text) {
        const trimmed = text.trim();
        // Check for bullet markers
        if (BULLET_MARKERS.some((marker) => trimmed.startsWith(marker))) {
            return true;
        }
        // Check for numbered markers
        if (NUMBERED_PATTERN.test(trimmed)) {
            return true;
        }
        // Check for dash marker (common in PDFs)
        if (trimmed.startsWith('- ') && trimmed.length > 2) {
            return true;
        }
        return false;
    }
    /**
     * Strips the list marker from text.
     */
    stripListMarker(text) {
        const trimmed = text.trim();
        // Remove numbered markers (e.g., "1. ", "2) ")
        const numberedMatch = trimmed.match(NUMBERED_PATTERN);
        if (numberedMatch) {
            return trimmed.substring(numberedMatch[0].length);
        }
        // Remove bullet markers
        for (const marker of BULLET_MARKERS) {
            if (trimmed.startsWith(marker)) {
                return trimmed.substring(marker.length).trim();
            }
        }
        // Remove dash marker
        if (trimmed.startsWith('- ')) {
            return trimmed.substring(2).trim();
        }
        return trimmed;
    }
}


  // transformers/ParagraphTransformer
// import removed
/**
 * Transformer that handles regular paragraphs.
 * This is the fallback transformer for text that doesn't match other patterns.
 */
class ParagraphTransformer {
    getPriority() {
        return 10; // Lowest priority - fallback transformer
    }
    canTransform(_elements) {
        // Always can transform - this is the fallback
        return true;
    }
    transform(elements, _allElements) {
        if (elements.length === 0) {
            return [];
        }
        const nodes = [];
        const paragraphNode = createParagraphNode([]);
        for (const element of elements) {
            const textNode = createTextNode(element.text.trim());
            paragraphNode.children.push(textNode);
        }
        nodes.push(paragraphNode);
        return nodes;
    }
}


  // transformers/InlineFormatterTransformer
// import removed
/**
 * Transformer that detects and applies inline formatting (bold, italic, strike).
 * Analyzes font properties to determine the appropriate markdown formatting.
 */
class InlineFormatterTransformer {
    getPriority() {
        return 50; // Medium priority - applies to individual text elements
    }
    canTransform(elements) {
        // Can transform any non-empty text elements
        return elements.length > 0;
    }
    transform(elements, _allElements) {
        const nodes = [];
        for (const element of elements) {
            const formatting = this.detectFormatting(element);
            const textNode = createTextNode(element.text.trim(), formatting);
            nodes.push(textNode);
        }
        return nodes;
    }
    /**
     * Detects inline formatting based on text element properties.
     */
    detectFormatting(element) {
        const bold = element.isBold;
        const italic = element.isItalic;
        const strike = this.isStrikeThrough(element);
        return {
            bold,
            italic,
            strike,
            code: false,
        };
    }
    /**
     * Checks if the text element has strike-through formatting.
     */
    isStrikeThrough(element) {
        const fontName = element.fontName.toLowerCase();
        return (fontName.includes('strikethrough') ||
            fontName.includes('line-through') ||
            fontName.includes('strike') ||
            fontName.includes('linethrough') ||
            element.isStrike);
    }
}


  // transformers/TableTransformer
/**
 * Table Transformer
 *
 * Orchestrates table detection using multiple detector techniques.
 * Users can configure weights to favor specific detection methods.
 *
 * SOLID:
 * - OCP: New detectors can be added via registry
 * - DIP: Depends on ITableDetector abstraction
 * - SRP: Only orchestrates detection, doesn't implement algorithms
 */
// import removed
// import removed
/**
 * Transformer that detects and converts tables to Markdown.
 *
 * Uses a registry of detection techniques:
 * - **Lattice**: Vector-based line detection (bordered tables)
 * - **Stream**: Whitespace projection profiles (borderless tables)
 * - **R-XY-Cut**: Recursive structural slicing
 * - **Anchor Zoning**: Landmark-based keyword detection
 * - **SCA**: Sparse Columnar Alignment histograms
 * - **Graph-Based**: Relational nearest-neighbor
 * - **Morphology**: Shape-based box dilation
 * - **Visual Signature**: Template matching
 * - **Entropy**: Signal processing for table regions
 */
class TableTransformer {
    constructor(config = {}) {
        this.config = {
            autoDetectHeader: true,
            ...config,
        };
        this.registry = createStandardRegistry(config.registry);
    }
    getPriority() {
        return 80; // High priority, after headings
    }
    canTransform(elements) {
        // Quick check: need enough elements for a table
        return elements.length >= 4;
    }
    transform(elements, _allElements) {
        const config = {
            ...DEFAULT_DETECTION_CONFIG,
            tolerance: this.config.tolerance ?? DEFAULT_DETECTION_CONFIG.tolerance,
        };
        // Run all detectors via registry
        const tables = this.registry.detectAll(elements, config);
        if (tables.length === 0) {
            return [];
        }
        // Convert tables to Markdown nodes
        return this.convertTablesToMarkdown(tables, elements);
    }
    /**
     * Gets the detector registry for advanced configuration.
     */
    getRegistry() {
        return this.registry;
    }
    /**
     * Converts detected tables to Markdown nodes.
     */
    convertTablesToMarkdown(tables, elements) {
        const nodes = [];
        for (const table of tables) {
            const markdownTable = this.buildMarkdownTable(table, elements);
            if (markdownTable) {
                nodes.push(markdownTable);
            }
        }
        return nodes;
    }
    /**
     * Builds a Markdown table node from a detected table.
     */
    buildMarkdownTable(table, elements) {
        // Extract text content for each cell
        const headers = [];
        const rows = [];
        // Group elements by cell
        const cellContent = this.assignElementsToCells(table, elements);
        // Extract headers (first row)
        if (table.hasHeader) {
            for (let col = 0; col < table.cols; col++) {
                const content = cellContent.get(`0-${col}`) || '';
                headers.push(content.trim());
            }
        }
        // Extract data rows
        const startRow = table.hasHeader ? 1 : 0;
        for (let row = startRow; row < table.rows; row++) {
            const rowData = [];
            for (let col = 0; col < table.cols; col++) {
                const content = cellContent.get(`${row}-${col}`) || '';
                rowData.push(content.trim());
            }
            rows.push(rowData);
        }
        // If no headers detected, use empty headers
        const finalHeaders = headers.length > 0 ? headers : Array(table.cols).fill('');
        return createTableNode(finalHeaders, rows);
    }
    /**
     * Assigns text elements to table cells based on position.
     */
    assignElementsToCells(table, elements) {
        const cellContent = new Map();
        for (const element of elements) {
            const cell = this.findElementCell(element, table);
            if (cell) {
                const key = `${cell.rowIndex}-${cell.colIndex}`;
                const existing = cellContent.get(key) || '';
                const separator = existing ? ' ' : '';
                cellContent.set(key, existing + separator + element.text);
            }
        }
        return cellContent;
    }
    /**
     * Finds which cell contains a text element.
     */
    findElementCell(element, table) {
        const centerX = element.x + element.width / 2;
        const centerY = element.y - element.height / 2;
        for (const cell of table.cells) {
            const inX = centerX >= cell.x1 && centerX <= cell.x2;
            const inY = centerY >= cell.y2 && centerY <= cell.y1; // PDF Y is inverted
            if (inX && inY) {
                return { rowIndex: cell.rowIndex, colIndex: cell.colIndex };
            }
        }
        // Fallback: find nearest cell
        let nearest = null;
        let minDistance = Infinity;
        for (const cell of table.cells) {
            const cellCenterX = (cell.x1 + cell.x2) / 2;
            const cellCenterY = (cell.y1 + cell.y2) / 2;
            const dx = centerX - cellCenterX;
            const dy = centerY - cellCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = { rowIndex: cell.rowIndex, colIndex: cell.colIndex };
            }
        }
        return nearest;
    }
}


  // core/table-detection/TableTypes
/**
 * Shared types for table detection system.
 * Following SOLID: Interface Segregation + Dependency Inversion
 */
/**
 * Default detection configuration.
 */
const DEFAULT_DETECTION_CONFIG = {
    tolerance: 3,
    pageWidth: 612,
    pageHeight: 792,
    minRows: 2,
    minCols: 2,
};
/**
 * Default detector registry configuration.
 */
const DEFAULT_REGISTRY_CONFIG = {
    weights: [
        { name: 'Lattice', weight: 0.8, enabled: true },
        { name: 'Stream', weight: 0.6, enabled: true },
        { name: 'RXYCut', weight: 0.5, enabled: true },
        { name: 'AnchorZoning', weight: 0.4, enabled: false }, // Domain-specific
        { name: 'SCA', weight: 0.5, enabled: true },
        { name: 'GraphBased', weight: 0.4, enabled: true },
        { name: 'Morphology', weight: 0.3, enabled: false }, // Expensive
        { name: 'VisualSignature', weight: 0.9, enabled: false }, // Needs templates
        { name: 'Entropy', weight: 0.3, enabled: true },
    ],
    minConfidence: 0.4,
    maxTables: 10,
};


  // core/table-detection/StreamDetector
/**
 * Stream Table Detector (Whitespace-Based)
 *
 * Analyzes "gutters" via horizontal and vertical projection profiles.
 * Best for: Borderless tables with clean, aligned columns (e.g., Excel exports).
 *
 * Algorithm:
 * 1. Create vertical projection profile (histogram of text at each X)
 * 2. Find "gutters" (empty vertical spaces) → these define columns
 * 3. Create horizontal projection profile
 * 4. Find gaps → these define rows
 * 5. Intersect columns and rows to form table grid
 */
class StreamDetector {
    getName() {
        return 'Stream';
    }
    getCategory() {
        return 'whitespace';
    }
    getDefaultWeight() {
        return 0.6;
    }
    detect(elements, config) {
        if (elements.length < 4)
            return [];
        // Step 1: Find column boundaries via vertical projection
        const colBoundaries = this.findColumnBoundaries(elements, config.tolerance);
        if (colBoundaries.length < config.minCols + 1) {
            return [];
        }
        // Step 2: Find row boundaries via horizontal projection
        const rowBoundaries = this.findRowBoundaries(elements, config.tolerance);
        if (rowBoundaries.length < config.minRows + 1) {
            return [];
        }
        // Step 3: Build table from grid
        const table = this.buildGridTable(elements, colBoundaries, rowBoundaries, config);
        return table ? [table] : [];
    }
    getConfidence(table) {
        const alignmentScore = Math.min(table.cols / 10, 0.5);
        const sizeScore = Math.min((table.rows * table.cols) / 30, 0.5);
        return alignmentScore + sizeScore;
    }
    /**
     * Finds vertical gaps (gutters) that define columns.
     */
    findColumnBoundaries(elements, tolerance) {
        // Group elements by X position
        const xPositions = elements.map(el => el.x);
        // Cluster X positions
        const xClusters = this.clusterValues(xPositions, tolerance * 5);
        if (xClusters.length < 2) {
            return [];
        }
        // Column boundaries are between clusters
        const boundaries = [xClusters[0]];
        for (let i = 1; i < xClusters.length; i++) {
            // Add boundary midway between clusters
            boundaries.push((xClusters[i - 1] + xClusters[i]) / 2);
        }
        boundaries.push(xClusters[xClusters.length - 1]);
        return boundaries;
    }
    /**
     * Finds horizontal gaps that define rows.
     */
    findRowBoundaries(elements, tolerance) {
        // Group elements by Y position
        const yPositions = elements.map(el => el.y);
        // Cluster Y positions
        const yClusters = this.clusterValues(yPositions, tolerance * 5);
        if (yClusters.length < 2) {
            return [];
        }
        // Row boundaries are between clusters
        const boundaries = [yClusters[0]];
        for (let i = 1; i < yClusters.length; i++) {
            // Add boundary midway between clusters
            boundaries.push((yClusters[i - 1] + yClusters[i]) / 2);
        }
        boundaries.push(yClusters[yClusters.length - 1]);
        return boundaries;
    }
    /**
     * Clusters numeric values that are close together.
     * Returns the center of each cluster.
     */
    clusterValues(values, tolerance) {
        if (values.length === 0)
            return [];
        const sorted = [...new Set(values)].sort((a, b) => a - b);
        const clusters = [[sorted[0]]];
        for (let i = 1; i < sorted.length; i++) {
            const lastCluster = clusters[clusters.length - 1];
            const clusterCenter = lastCluster.reduce((a, b) => a + b, 0) / lastCluster.length;
            if (Math.abs(sorted[i] - clusterCenter) < tolerance) {
                lastCluster.push(sorted[i]);
            }
            else {
                clusters.push([sorted[i]]);
            }
        }
        // Return center of each cluster
        return clusters.map(cluster => cluster.reduce((a, b) => a + b, 0) / cluster.length);
    }
    /**
     * Builds table from column and row boundaries.
     */
    buildGridTable(_elements, colBoundaries, rowBoundaries, config) {
        const rows = rowBoundaries.length - 1;
        const cols = colBoundaries.length - 1;
        if (rows < config.minRows || cols < config.minCols) {
            return null;
        }
        const cells = [];
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x1 = colBoundaries[col];
                const x2 = colBoundaries[col + 1];
                const y1 = rowBoundaries[row];
                const y2 = rowBoundaries[row + 1];
                cells.push({
                    rowIndex: row,
                    colIndex: col,
                    x1,
                    y1,
                    x2,
                    y2,
                });
            }
        }
        return {
            id: `stream-${Date.now()}`,
            detectorName: this.getName(),
            x1: colBoundaries[0],
            y1: rowBoundaries[0],
            x2: colBoundaries[cols],
            y2: rowBoundaries[rows],
            rows,
            cols,
            cells,
            hasHeader: rows >= 2,
            confidence: 0,
        };
    }
}


  // core/table-detection/RXYCutDetector
/**
 * R-XY-Cut Table Detector (Structural Recursive Whitespace Cutting)
 *
 * Recursively slices the page by finding the largest whitespace gaps.
 * Algorithm:
 * 1. Start with bounding box of all elements
 * 2. Project elements onto X axis, find largest horizontal gap
 * 3. If gap is significant, split vertically (cut along X axis)
 * 4. Alternate: next level projects onto Y axis, splits horizontally
 * 5. Recurse until regions are too small or contain too few elements
 * 6. Leaf regions that form grid-like patterns become table candidates
 *
 * SOLID:
 * - SRP: Only handles structural recursive cutting
 * - OCP: Implements ITableDetector, can be replaced
 * - LSP: Interchangeable with other detectors
 * - DIP: Depends on ITableDetector abstraction
 */
/**
 * R-XY-Cut detector implementation.
 */
class RXYCutDetector {
    getName() {
        return 'RXYCut';
    }
    getCategory() {
        return 'structural';
    }
    getDefaultWeight() {
        return 0.5;
    }
    detect(elements, config) {
        if (elements.length < 4)
            return [];
        const elems = [...elements];
        // Build root region
        const root = this.buildRegion(elems, 0);
        if (!root)
            return [];
        // Recursively cut
        const cutRegions = this.recursiveCut(root, config, true);
        // Collect leaf regions and attempt to form tables
        const leaves = this.collectLeaves(cutRegions);
        const tables = [];
        for (const leaf of leaves) {
            const table = this.buildTableFromRegion(leaf, config);
            if (table) {
                tables.push(table);
            }
        }
        // Also try to build a table from the full set if cutting produced no results
        if (tables.length === 0 && elems.length >= config.minRows * config.minCols) {
            const table = this.buildTableFromProjection(elems, config);
            if (table) {
                tables.push(table);
            }
        }
        return tables;
    }
    getConfidence(table) {
        const expectedCells = table.rows * table.cols;
        const actualCells = table.cells.length;
        if (actualCells === 0)
            return 0;
        const completeness = actualCells / expectedCells;
        const sizeFactor = Math.min((table.rows * table.cols) / 20, 0.3);
        const regularityBonus = this.computeRegularity(table) * 0.2;
        return Math.min(completeness * 0.6 + sizeFactor + regularityBonus, 1.0);
    }
    // ─── Recursive Cutting ───────────────────────────────────────────────
    recursiveCut(region, config, cutHorizontalFirst) {
        if (region.elements.length < 4 ||
            region.depth >= 8 ||
            (region.x2 - region.x1) < 50 ||
            (region.y2 - region.y1) < 30) {
            return region; // Leaf node
        }
        // Determine cut direction
        const cutH = cutHorizontalFirst;
        const gapInfo = this.findLargestGap(region.elements, cutH);
        if (!gapInfo || gapInfo.gapSize < this.getGapThreshold(region, cutH)) {
            return region; // No significant gap, leaf node
        }
        // Split elements into two groups
        const { left, right } = gapInfo;
        const leftRegion = this.buildRegion(left, region.depth + 1);
        const rightRegion = this.buildRegion(right, region.depth + 1);
        if (!leftRegion || !rightRegion) {
            return region;
        }
        // Recurse on children
        const cutLeft = this.recursiveCut(leftRegion, config, !cutH);
        const cutRight = this.recursiveCut(rightRegion, config, !cutH);
        return {
            ...region,
            children: [cutLeft, cutRight],
        };
    }
    findLargestGap(elements, cutHorizontal) {
        if (elements.length < 2)
            return null;
        // Sort by the relevant axis
        const sorted = [...elements].sort((a, b) => {
            const posA = cutHorizontal ? a.x : a.y;
            const posB = cutHorizontal ? b.x : b.y;
            return posA - posB;
        });
        // Find the largest gap between consecutive element edges
        let bestGap = 0;
        let bestSplitIdx = -1;
        for (let i = 0; i < sorted.length - 1; i++) {
            const currentEdge = cutHorizontal
                ? sorted[i].x + sorted[i].width
                : sorted[i].y + sorted[i].height;
            const nextStart = cutHorizontal ? sorted[i + 1].x : sorted[i + 1].y;
            const gap = nextStart - currentEdge;
            if (gap > bestGap) {
                bestGap = gap;
                bestSplitIdx = i;
            }
        }
        if (bestSplitIdx < 0)
            return null;
        const splitPos = cutHorizontal
            ? sorted[bestSplitIdx].x + sorted[bestSplitIdx].width + bestGap / 2
            : sorted[bestSplitIdx].y + sorted[bestSplitIdx].height + bestGap / 2;
        return {
            left: sorted.slice(0, bestSplitIdx + 1),
            right: sorted.slice(bestSplitIdx + 1),
            splitPos,
            gapSize: bestGap,
        };
    }
    getGapThreshold(region, cutHorizontal) {
        const span = cutHorizontal
            ? region.x2 - region.x1
            : region.y2 - region.y1;
        return Math.max(span * 0.15, 10);
    }
    // ─── Region Building ─────────────────────────────────────────────────
    buildRegion(elements, depth) {
        if (elements.length === 0)
            return null;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const el of elements) {
            minX = Math.min(minX, el.x);
            minY = Math.min(minY, el.y);
            maxX = Math.max(maxX, el.x + el.width);
            maxY = Math.max(maxY, el.y + el.height);
        }
        return {
            x1: minX,
            y1: minY,
            x2: maxX,
            y2: maxY,
            elements,
            children: [],
            depth,
        };
    }
    collectLeaves(region) {
        if (region.children.length === 0) {
            return [region];
        }
        return region.children.flatMap(child => this.collectLeaves(child));
    }
    // ─── Table Construction from Regions ─────────────────────────────────
    buildTableFromRegion(region, config) {
        if (region.elements.length < config.minRows * config.minCols) {
            return null;
        }
        // Try to arrange into a grid via projection
        return this.buildTableFromProjection(region.elements, config);
    }
    buildTableFromProjection(elements, config) {
        const rows = this.groupElementsByY(elements, config.tolerance);
        if (rows.length < config.minRows)
            return null;
        // Find consistent column positions across rows
        const colPositions = this.findConsistentColumns(rows, config.tolerance, config.minCols);
        if (colPositions.length < config.minCols)
            return null;
        // Build cells
        const cells = [];
        let hasAnyContent = false;
        for (let r = 0; r < rows.length; r++) {
            const rowY = rows[r][0]?.y ?? 0;
            const nextRowY = r < rows.length - 1 ? rows[r + 1][0]?.y ?? 0 : rowY - 20;
            for (let c = 0; c < colPositions.length; c++) {
                const x1 = colPositions[c];
                const x2 = c < colPositions.length - 1 ? colPositions[c + 1] : x1 + 50;
                // Check if any element falls in this cell
                const cellElements = rows[r].filter(el => el.x >= x1 - config.tolerance && el.x < x2 + config.tolerance);
                if (cellElements.length > 0) {
                    hasAnyContent = true;
                }
                cells.push({
                    rowIndex: r,
                    colIndex: c,
                    x1,
                    y1: rowY,
                    x2,
                    y2: nextRowY,
                    content: cellElements.map(e => e.text).join(' ').trim() || undefined,
                });
            }
        }
        if (!hasAnyContent)
            return null;
        const x1 = Math.min(...colPositions);
        const x2 = colPositions[colPositions.length - 1] + 50;
        const yPositions = rows.map(r => r[0]?.y ?? 0);
        const y1 = Math.max(...yPositions);
        const y2 = Math.min(...yPositions) - 20;
        return {
            id: `rxy-cut-${Date.now()}`,
            detectorName: this.getName(),
            x1,
            y1,
            x2,
            y2,
            rows: rows.length,
            cols: colPositions.length,
            cells,
            hasHeader: rows.length >= 2,
            confidence: 0,
        };
    }
    groupElementsByY(elements, tolerance) {
        const sorted = [...elements].sort((a, b) => b.y - a.y);
        const rows = [];
        for (const el of sorted) {
            let placed = false;
            for (const row of rows) {
                if (Math.abs(row[0].y - el.y) <= tolerance * 2) {
                    row.push(el);
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                rows.push([el]);
            }
        }
        // Sort each row by X
        for (const row of rows) {
            row.sort((a, b) => a.x - b.x);
        }
        return rows;
    }
    findConsistentColumns(rows, tolerance, minCols) {
        // Collect all X positions
        const allXPositions = rows.flatMap(row => row.map(el => el.x));
        if (allXPositions.length === 0)
            return [];
        // Cluster X positions
        const clusters = this.clusterPositions(allXPositions, tolerance);
        // Keep only clusters that appear in enough rows
        const minRowCount = Math.max(2, Math.ceil(rows.length * 0.4));
        const consistent = clusters.filter(clusterCenter => {
            let rowCount = 0;
            for (const row of rows) {
                if (row.some(el => Math.abs(el.x - clusterCenter) <= tolerance * 3)) {
                    rowCount++;
                }
            }
            return rowCount >= minRowCount;
        });
        consistent.sort((a, b) => a - b);
        return consistent.length >= minCols ? consistent : [];
    }
    clusterPositions(positions, tolerance) {
        if (positions.length === 0)
            return [];
        const sorted = [...positions].sort((a, b) => a - b);
        const clusters = [];
        let clusterSum = sorted[0];
        let clusterCount = 1;
        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i] - sorted[i - 1] <= tolerance * 2) {
                clusterSum += sorted[i];
                clusterCount++;
            }
            else {
                clusters.push(clusterSum / clusterCount);
                clusterSum = sorted[i];
                clusterCount = 1;
            }
        }
        clusters.push(clusterSum / clusterCount);
        return clusters;
    }
    computeRegularity(table) {
        if (table.cells.length === 0)
            return 0;
        // Measure regularity of cell widths and heights
        const widths = table.cells.map(c => c.x2 - c.x1);
        const heights = table.cells.map(c => Math.abs(c.y2 - c.y1));
        const avgWidth = widths.reduce((a, b) => a + b, 0) / widths.length;
        const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
        if (avgWidth === 0 || avgHeight === 0)
            return 0;
        const widthVariance = widths.reduce((sum, w) => sum + Math.pow((w - avgWidth) / avgWidth, 2), 0) / widths.length;
        const heightVariance = heights.reduce((sum, h) => sum + Math.pow((h - avgHeight) / avgHeight, 2), 0) / heights.length;
        // Lower variance = higher regularity
        return Math.max(0, 1 - (widthVariance + heightVariance) / 2);
    }
}


  // core/table-detection/AnchorZoningDetector
/**
 * Anchor Zoning Table Detector (Landmark-Based)
 *
 * Searches for common anchor keywords and defines zones around them.
 * Algorithm:
 * 1. Scan for anchor keywords (Total, Name, Date, Amount, etc.)
 * 2. When found, define a search zone around the keyword
 * 3. Look for aligned text elements within the zone
 * 4. If enough aligned elements found, build a table
 * Best for: Fixed-form documents like invoices, receipts, forms
 *
 * SOLID:
 * - SRP: Only handles landmark-based detection
 * - OCP: Implements ITableDetector, can be replaced
 * - LSP: Interchangeable with other detectors
 * - DIP: Depends on ITableDetector abstraction
 */
/**
 * Default anchor keywords commonly found in tables/forms.
 */
const DEFAULT_ANCHOR_KEYWORDS = [
    'total', 'name', 'date', 'amount', 'description', 'item',
    'price', 'qty', 'quantity', 'id', 'no', '#',
    'subtotal', 'tax', 'discount', 'unit', 'cost',
    'rate', 'hours', 'payment', 'invoice', 'reference',
    'product', 'service', 'category', 'code', 'sku',
];
/**
 * Anchor Zoning detector implementation.
 */
class AnchorZoningDetector {
    getName() {
        return 'AnchorZoning';
    }
    getCategory() {
        return 'landmark';
    }
    getDefaultWeight() {
        return 0.4;
    }
    detect(elements, config) {
        if (elements.length < 3)
            return [];
        const elems = [...elements];
        const tables = [];
        // Step 1: Find anchor keyword matches
        const anchors = this.findAnchors(elems);
        if (anchors.length < 2) {
            return [];
        }
        // Step 2: Build zones around anchors
        const zones = this.buildZones(anchors, elems, config);
        if (zones.length === 0)
            return [];
        // Step 3: Try to build tables from each zone
        for (const zone of zones) {
            const table = this.buildTableFromZone(zone, config);
            if (table) {
                tables.push(table);
            }
        }
        // Step 4: If no zone-level tables, try building a table from all anchor-aligned elements
        if (tables.length === 0) {
            const table = this.buildGlobalAnchorTable(elems, anchors, config);
            if (table) {
                tables.push(table);
            }
        }
        return tables;
    }
    getConfidence(table) {
        const expectedCells = table.rows * table.cols;
        const actualCells = table.cells.filter(c => c.content).length;
        if (actualCells === 0)
            return 0;
        const fillRate = actualCells / expectedCells;
        const anchorBonus = table.hasHeader ? 0.2 : 0;
        const sizeBonus = Math.min((table.rows * table.cols) / 15, 0.3);
        return Math.min(fillRate * 0.5 + anchorBonus + sizeBonus, 1.0);
    }
    // ─── Anchor Detection ────────────────────────────────────────────────
    findAnchors(elements) {
        const matches = [];
        for (const el of elements) {
            const normalizedText = el.text.trim().toLowerCase();
            for (const keyword of DEFAULT_ANCHOR_KEYWORDS) {
                // Exact match or prefix match (e.g., "Total:" matches "total")
                if (normalizedText === keyword ||
                    normalizedText.startsWith(keyword) ||
                    normalizedText.endsWith(keyword) ||
                    normalizedText.includes(keyword + ':') ||
                    normalizedText.includes(keyword + ' ')) {
                    matches.push({ element: el, keyword });
                    break;
                }
            }
        }
        return matches;
    }
    // ─── Zone Building ───────────────────────────────────────────────────
    buildZones(anchors, allElements, config) {
        // Group anchors that are close together (same table region)
        const clusters = this.clusterAnchors(anchors, config.tolerance * 10);
        const zones = [];
        for (const cluster of clusters) {
            if (cluster.length < 2)
                continue;
            // Compute bounding box of the cluster
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const anchor of cluster) {
                minX = Math.min(minX, anchor.element.x);
                minY = Math.min(minY, anchor.element.y);
                maxX = Math.max(maxX, anchor.element.x + anchor.element.width);
                maxY = Math.max(maxY, anchor.element.y + anchor.element.height);
            }
            // Expand zone
            const zone = {
                anchor: cluster[0],
                x1: Math.max(0, minX - 300),
                y1: Math.max(0, minY - 200),
                x2: Math.min(config.pageWidth, maxX + 300),
                y2: Math.min(config.pageHeight, maxY + 200),
                elements: [],
            };
            // Collect elements within the zone
            for (const el of allElements) {
                const elRight = el.x + el.width;
                const elBottom = el.y + el.height;
                if (elRight >= zone.x1 &&
                    el.x <= zone.x2 &&
                    elBottom >= zone.y1 &&
                    el.y <= zone.y2 &&
                    !this.isAnchorElement(el, cluster)) {
                    zone.elements.push(el);
                }
            }
            if (zone.elements.length >= 3) {
                zones.push(zone);
            }
        }
        return zones;
    }
    clusterAnchors(anchors, tolerance) {
        if (anchors.length === 0)
            return [];
        const clusters = [];
        const used = new Set();
        for (let i = 0; i < anchors.length; i++) {
            if (used.has(i))
                continue;
            const cluster = [anchors[i]];
            used.add(i);
            for (let j = i + 1; j < anchors.length; j++) {
                if (used.has(j))
                    continue;
                // Check proximity to any element in cluster
                const closeToCluster = cluster.some(a => Math.abs(a.element.x - anchors[j].element.x) <= tolerance &&
                    Math.abs(a.element.y - anchors[j].element.y) <= tolerance * 3);
                if (closeToCluster) {
                    cluster.push(anchors[j]);
                    used.add(j);
                }
            }
            clusters.push(cluster);
        }
        return clusters;
    }
    isAnchorElement(el, cluster) {
        return cluster.some(a => a.element.x === el.x &&
            a.element.y === el.y &&
            a.element.text === el.text);
    }
    // ─── Table Building from Zone ────────────────────────────────────────
    buildTableFromZone(zone, config) {
        const allElements = [zone.anchor.element, ...zone.elements];
        const rows = this.groupElementsByY(allElements, config.tolerance);
        if (rows.length < config.minRows)
            return null;
        const colPositions = this.findColumnsFromZone(rows, zone, config);
        if (colPositions.length < config.minCols)
            return null;
        return this.constructTable(rows, colPositions, config);
    }
    findColumnsFromZone(rows, _zone, config) {
        const allX = rows.flatMap(r => r.map(el => el.x));
        if (allX.length === 0)
            return [];
        // Cluster X positions with tighter tolerance
        const clusters = this.clusterPositions(allX, config.tolerance);
        // Keep clusters with enough representatives
        const consistent = clusters.filter(center => {
            let count = 0;
            for (const row of rows) {
                if (row.some(el => Math.abs(el.x - center) <= config.tolerance * 1.5)) {
                    count++;
                }
            }
            return count >= Math.max(1, Math.ceil(rows.length * 0.3));
        });
        consistent.sort((a, b) => a - b);
        return consistent.length >= config.minCols ? consistent : [];
    }
    // ─── Global Anchor Table ─────────────────────────────────────────────
    buildGlobalAnchorTable(elements, _anchors, config) {
        // Use anchor positions to define a global table region
        const allElements = [...elements];
        const rows = this.groupElementsByY(allElements, config.tolerance);
        if (rows.length < config.minRows)
            return null;
        const allX = rows.flatMap(r => r.map(el => el.x));
        const colPositions = this.clusterPositions(allX, config.tolerance)
            .filter(c => {
            let count = 0;
            for (const row of rows) {
                if (row.some(el => Math.abs(el.x - c) <= config.tolerance * 1.5)) {
                    count++;
                }
            }
            return count >= Math.max(2, Math.ceil(rows.length * 0.3));
        })
            .sort((a, b) => a - b);
        if (colPositions.length < config.minCols)
            return null;
        return this.constructTable(rows, colPositions, config);
    }
    // ─── Utility Methods ─────────────────────────────────────────────────
    groupElementsByY(elements, tolerance) {
        const sorted = [...elements].sort((a, b) => b.y - a.y);
        const rows = [];
        for (const el of sorted) {
            let placed = false;
            for (const row of rows) {
                if (Math.abs(row[0].y - el.y) <= tolerance * 2) {
                    row.push(el);
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                rows.push([el]);
            }
        }
        for (const row of rows) {
            row.sort((a, b) => a.x - b.x);
        }
        return rows;
    }
    clusterPositions(positions, tolerance) {
        if (positions.length === 0)
            return [];
        const sorted = [...positions].sort((a, b) => a - b);
        const clusters = [];
        let clusterSum = sorted[0];
        let clusterCount = 1;
        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i] - sorted[i - 1] <= tolerance * 2) {
                clusterSum += sorted[i];
                clusterCount++;
            }
            else {
                clusters.push(clusterSum / clusterCount);
                clusterSum = sorted[i];
                clusterCount = 1;
            }
        }
        clusters.push(clusterSum / clusterCount);
        return clusters;
    }
    constructTable(rows, colPositions, config) {
        const cells = [];
        for (let r = 0; r < rows.length; r++) {
            const rowY = rows[r][0]?.y ?? 0;
            const nextRowY = r < rows.length - 1 ? rows[r + 1][0]?.y ?? 0 : rowY - 20;
            for (let c = 0; c < colPositions.length; c++) {
                const x1 = colPositions[c];
                const x2 = c < colPositions.length - 1 ? colPositions[c + 1] : x1 + 50;
                const cellElements = rows[r].filter(el => el.x >= x1 - config.tolerance && el.x < x2 + config.tolerance);
                cells.push({
                    rowIndex: r,
                    colIndex: c,
                    x1,
                    y1: rowY,
                    x2,
                    y2: nextRowY,
                    content: cellElements.map(e => e.text).join(' ').trim() || undefined,
                });
            }
        }
        const x1 = Math.min(...colPositions);
        const x2 = colPositions[colPositions.length - 1] + 50;
        const yPositions = rows.map(r => r[0]?.y ?? 0);
        const y1 = Math.max(...yPositions);
        const y2 = Math.min(...yPositions) - 20;
        return {
            id: `anchor-zoning-${Date.now()}`,
            detectorName: this.getName(),
            x1,
            y1,
            x2,
            y2,
            rows: rows.length,
            cols: colPositions.length,
            cells,
            hasHeader: this.detectHeader(rows),
            confidence: 0,
        };
    }
    detectHeader(rows) {
        if (rows.length < 2)
            return false;
        // Header detection: first row has bold text or significantly different formatting
        const firstRow = rows[0];
        if (firstRow.some(el => el.isBold || el.fontSize > (rows[1]?.[0]?.fontSize ?? 0) * 1.1)) {
            return true;
        }
        return false;
    }
}


  // core/table-detection/SCADetector
/**
 * SCA (Sparse Columnar Alignment) Table Detector (Statistical)
 *
 * Uses histogram analysis of text block centers to find column alignment patterns.
 * Algorithm:
 * 1. Compute X positions of all text element centers/edges
 * 2. Build a histogram of these positions
 * 3. Find "spikes" where many text edges align (column candidates)
 * 4. Calculate column alignment score for each candidate spike
 * 5. If alignment score exceeds threshold, build table from aligned elements
 * Handles "jagged" tables where some cells are empty (sparse alignment)
 *
 * SOLID:
 * - SRP: Only handles statistical column alignment detection
 * - OCP: Implements ITableDetector, can be replaced
 * - LSP: Interchangeable with other detectors
 * - DIP: Depends on ITableDetector abstraction
 */
/**
 * SCA Detector implementation.
 */
class SCADetector {
    getName() {
        return 'SCA';
    }
    getCategory() {
        return 'statistical';
    }
    getDefaultWeight() {
        return 0.5;
    }
    detect(elements, config) {
        if (elements.length < 4)
            return [];
        const elems = [...elements];
        const tables = [];
        // Step 1: Build histogram of text positions
        const histogram = this.buildHistogram(elems, config);
        if (histogram.length === 0)
            return [];
        // Step 2: Find spikes (positions with significant alignment)
        const spikes = this.findSpikes(histogram, elems, config);
        if (spikes.length < config.minCols)
            return [];
        // Step 3: Group spikes into column sets and attempt table construction
        const columnCandidates = this.selectBestColumns(spikes, config);
        for (const columns of columnCandidates) {
            const table = this.buildTableFromColumns(elems, columns, config);
            if (table) {
                tables.push(table);
            }
        }
        // If no tables found with strict criteria, try with relaxed thresholds
        if (tables.length === 0) {
            const relaxedSpikes = this.findSpikesRelaxed(histogram, elems, config);
            if (relaxedSpikes.length >= config.minCols) {
                const relaxedColumns = this.selectBestColumns(relaxedSpikes, config);
                for (const columns of relaxedColumns) {
                    const table = this.buildTableFromColumns(elems, columns, config);
                    if (table) {
                        tables.push(table);
                    }
                }
            }
        }
        return tables;
    }
    getConfidence(table) {
        const expectedCells = table.rows * table.cols;
        const filledCells = table.cells.filter(c => c.content).length;
        if (filledCells === 0)
            return 0;
        const fillRate = filledCells / expectedCells;
        const columnStrength = Math.min(table.cols / 8, 0.4);
        const sparseBonus = fillRate < 1.0 ? (1.0 - fillRate) * 0.2 : 0; // Bonus for handling sparse tables
        return Math.min(fillRate * 0.4 + columnStrength + 0.1 + sparseBonus * 0.3, 1.0);
    }
    // ─── Histogram Building ──────────────────────────────────────────────
    buildHistogram(elements, config) {
        if (elements.length === 0)
            return [];
        const binSize = config.tolerance * 1.5;
        const binMap = new Map();
        for (const el of elements) {
            // Consider both left edge and center for robustness
            const positions = [
                { pos: el.x, weight: 0.6 },
                { pos: el.x + el.width / 2, weight: 0.4 },
            ];
            for (const { pos } of positions) {
                const binKey = Math.round(pos / binSize) * binSize;
                const existing = binMap.get(binKey) || [];
                existing.push(el);
                binMap.set(binKey, existing);
            }
        }
        // Convert to bins
        const bins = [];
        for (const [center, els] of binMap.entries()) {
            bins.push({
                center,
                count: els.length,
                elements: els,
            });
        }
        // Sort by position
        bins.sort((a, b) => a.center - b.center);
        return bins;
    }
    // ─── Spike Detection ─────────────────────────────────────────────────
    findSpikes(histogram, elements, config) {
        if (histogram.length === 0)
            return [];
        // Calculate statistics
        const counts = histogram.map(b => b.count);
        const meanCount = counts.reduce((a, b) => a + b, 0) / counts.length;
        const stdDev = Math.sqrt(counts.reduce((sum, c) => sum + Math.pow(c - meanCount, 2), 0) / counts.length);
        // Threshold: mean + 1 std deviation
        const spikeThreshold = meanCount + stdDev * 1.0;
        const minRowCount = Math.max(2, Math.ceil(elements.length / this.estimateRowCount(elements) * 0.3));
        const spikes = [];
        for (const bin of histogram) {
            if (bin.count < spikeThreshold)
                continue;
            // Calculate alignment score: how many unique rows does this column cover?
            const uniqueRows = this.countUniqueRows(bin.elements, config.tolerance);
            const estimatedRows = this.estimateRowCount(elements);
            const coverageScore = estimatedRows > 0 ? uniqueRows / estimatedRows : 0;
            const score = (bin.count / spikeThreshold) * 0.5 + coverageScore * 0.5;
            if (score >= 0.25 && uniqueRows >= minRowCount) {
                spikes.push({
                    xPosition: bin.center,
                    alignmentScore: score,
                    rowCount: uniqueRows,
                    elements: bin.elements,
                });
            }
        }
        // Merge nearby spikes
        return this.mergeNearbySpikes(spikes, config.tolerance * 2);
    }
    findSpikesRelaxed(histogram, elements, config) {
        if (histogram.length === 0)
            return [];
        const counts = histogram.map(b => b.count);
        const meanCount = counts.reduce((a, b) => a + b, 0) / counts.length;
        const stdDev = Math.sqrt(counts.reduce((sum, c) => sum + Math.pow(c - meanCount, 2), 0) / counts.length);
        // Lower threshold for relaxed mode
        const spikeThreshold = meanCount + stdDev * 0.5;
        const spikes = [];
        for (const bin of histogram) {
            if (bin.count < spikeThreshold)
                continue;
            const uniqueRows = this.countUniqueRows(bin.elements, config.tolerance);
            const estimatedRows = this.estimateRowCount(elements);
            const coverageScore = estimatedRows > 0 ? uniqueRows / estimatedRows : 0;
            const score = (bin.count / spikeThreshold) * 0.4 + coverageScore * 0.6;
            if (score >= 0.18 && uniqueRows >= 2) {
                spikes.push({
                    xPosition: bin.center,
                    alignmentScore: score,
                    rowCount: uniqueRows,
                    elements: bin.elements,
                });
            }
        }
        return this.mergeNearbySpikes(spikes, config.tolerance * 3);
    }
    mergeNearbySpikes(spikes, tolerance) {
        if (spikes.length === 0)
            return [];
        const sorted = [...spikes].sort((a, b) => a.xPosition - b.xPosition);
        const merged = [];
        let current = sorted[0];
        for (let i = 1; i < sorted.length; i++) {
            if (Math.abs(sorted[i].xPosition - current.xPosition) <= tolerance) {
                // Merge: take the one with higher score
                if (sorted[i].alignmentScore > current.alignmentScore) {
                    current = sorted[i];
                }
                else {
                    // Combine elements
                    const allElements = [...new Set([...current.elements, ...sorted[i].elements])];
                    current = {
                        ...current,
                        elements: allElements,
                        rowCount: current.rowCount + sorted[i].rowCount,
                    };
                }
            }
            else {
                merged.push(current);
                current = sorted[i];
            }
        }
        merged.push(current);
        return merged;
    }
    // ─── Column Selection ────────────────────────────────────────────────
    selectBestColumns(spikes, config) {
        if (spikes.length < config.minCols)
            return [];
        // Sort by score descending
        const sorted = [...spikes].sort((a, b) => b.alignmentScore - a.alignmentScore);
        // Select top columns ensuring minimum spacing
        const selected = [];
        const minSpacing = config.tolerance * 4;
        for (const spike of sorted) {
            const tooClose = selected.some(pos => Math.abs(pos - spike.xPosition) < minSpacing);
            if (!tooClose) {
                selected.push(spike.xPosition);
            }
            if (selected.length >= spikes.length)
                break;
        }
        selected.sort((a, b) => a - b);
        // Return as single table candidate, or split into multiple if there are clear gaps
        const candidates = [];
        if (selected.length >= config.minCols) {
            candidates.push(selected);
        }
        return candidates;
    }
    // ─── Table Building ──────────────────────────────────────────────────
    buildTableFromColumns(elements, colPositions, config) {
        if (colPositions.length < config.minCols)
            return null;
        // Group elements by Y position (rows)
        const rows = this.groupElementsByY(elements, config.tolerance);
        if (rows.length < config.minRows)
            return null;
        // Build cells
        const cells = [];
        for (let r = 0; r < rows.length; r++) {
            const rowY = rows[r][0]?.y ?? 0;
            const nextRowY = r < rows.length - 1 ? rows[r + 1][0]?.y ?? 0 : rowY - 20;
            for (let c = 0; c < colPositions.length; c++) {
                const x1 = colPositions[c];
                const x2 = c < colPositions.length - 1 ? colPositions[c + 1] : x1 + 50;
                // Find elements that align with this column
                const cellElements = rows[r].filter(el => {
                    // Check if element's left edge or center is near column position
                    const leftEdgeDist = Math.abs(el.x - x1);
                    const centerDist = Math.abs(el.x + el.width / 2 - x1);
                    const withinColumn = el.x >= x1 - config.tolerance * 2 && el.x < x2 + config.tolerance;
                    return (leftEdgeDist <= config.tolerance * 2 || centerDist <= config.tolerance * 2) && withinColumn;
                });
                cells.push({
                    rowIndex: r,
                    colIndex: c,
                    x1,
                    y1: rowY,
                    x2,
                    y2: nextRowY,
                    content: cellElements.map(e => e.text).join(' ').trim() || undefined,
                });
            }
        }
        // Verify we have meaningful content
        const filledCells = cells.filter(c => c.content).length;
        if (filledCells < config.minRows * Math.ceil(config.minCols * 0.5))
            return null;
        const x1 = Math.min(...colPositions);
        const x2 = colPositions[colPositions.length - 1] + 50;
        const yPositions = rows.map(r => r[0]?.y ?? 0);
        const y1 = Math.max(...yPositions);
        const y2 = Math.min(...yPositions) - 20;
        return {
            id: `sca-${Date.now()}`,
            detectorName: this.getName(),
            x1,
            y1,
            x2,
            y2,
            rows: rows.length,
            cols: colPositions.length,
            cells,
            hasHeader: this.detectHeader(rows),
            confidence: 0,
        };
    }
    // ─── Utility Methods ─────────────────────────────────────────────────
    groupElementsByY(elements, tolerance) {
        const sorted = [...elements].sort((a, b) => b.y - a.y);
        const rows = [];
        for (const el of sorted) {
            let placed = false;
            for (const row of rows) {
                if (Math.abs(row[0].y - el.y) <= tolerance * 2) {
                    row.push(el);
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                rows.push([el]);
            }
        }
        for (const row of rows) {
            row.sort((a, b) => a.x - b.x);
        }
        return rows;
    }
    countUniqueRows(elements, tolerance) {
        const yPositions = new Set();
        for (const el of elements) {
            // Quantize Y position
            const quantizedY = Math.round(el.y / tolerance) * tolerance;
            yPositions.add(quantizedY);
        }
        return yPositions.size;
    }
    estimateRowCount(elements) {
        if (elements.length === 0)
            return 0;
        const avgHeight = elements.reduce((sum, el) => sum + el.height, 0) / elements.length;
        const yPositions = elements.map(el => el.y);
        const minY = Math.min(...yPositions);
        const maxY = Math.max(...yPositions);
        // Estimate based on vertical span and average element height
        const span = maxY - minY + avgHeight;
        const estimatedRowHeight = avgHeight * 1.5; // Account for spacing
        return Math.max(1, Math.round(span / estimatedRowHeight));
    }
    detectHeader(rows) {
        if (rows.length < 2)
            return false;
        const firstRow = rows[0];
        const secondRow = rows[1];
        // Bold text in first row
        if (firstRow.some(el => el.isBold)) {
            return true;
        }
        // Larger font in first row
        const avgFirstFontSize = firstRow.reduce((sum, el) => sum + el.fontSize, 0) / firstRow.length;
        const avgSecondFontSize = secondRow.reduce((sum, el) => sum + el.fontSize, 0) / secondRow.length;
        if (avgFirstFontSize > avgSecondFontSize * 1.1) {
            return true;
        }
        return false;
    }
}


  // core/table-detection/GraphBasedDetector
/**
 * Graph-Based Table Detector (Relational Nearest-Neighbor)
 *
 * Treats each text block as a node in a graph. Connects nodes that are
 * nearest neighbors (right neighbor = same row, below neighbor = same column).
 * Finds subgraphs that form grid-like structures.
 *
 * Best for: key-value pairs and tables with irregular spacing.
 *
 * Algorithm:
 * 1. Build a directed graph where each text element is a node
 * 2. For each node, find its right neighbor (same Y, nearest X to the right)
 *    and below neighbor (same X, nearest Y below)
 * 3. Find connected subgraphs where nodes have consistent right/below links
 * 4. A grid exists when nodes form a rectangular lattice of connections
 * 5. Extract table boundaries from the bounding box of each grid subgraph
 */
class GraphBasedDetector {
    getName() {
        return 'GraphBased';
    }
    getCategory() {
        return 'relational';
    }
    getDefaultWeight() {
        return 0.4;
    }
    detect(elements, config) {
        if (elements.length < config.minRows * config.minCols) {
            return [];
        }
        // Step 1: Build the nearest-neighbor graph
        const nodes = this.buildGraph(elements, config.tolerance);
        // Step 2: Find grid-like clusters
        const clusters = this.findGridClusters(nodes, config);
        if (clusters.length === 0) {
            return [];
        }
        // Step 3: Convert clusters to DetectedTable objects
        const tables = [];
        for (const cluster of clusters) {
            const table = this.buildTableFromCluster(cluster, nodes, config);
            if (table) {
                tables.push(table);
            }
        }
        return tables;
    }
    getConfidence(table) {
        // Confidence based on grid regularity
        const cellCount = table.cells.length;
        const expectedCells = table.rows * table.cols;
        const completeness = cellCount / expectedCells;
        // Larger tables with more cells are more likely to be real tables
        const sizeScore = Math.min(expectedCells / 12, 0.5);
        const completenessScore = completeness * 0.5;
        return Math.min(sizeScore + completenessScore, 1.0);
    }
    /**
     * Builds a directed graph from text elements.
     * Each node has at most one right neighbor and one below neighbor.
     */
    buildGraph(elements, tolerance) {
        const nodes = elements.map((el, idx) => ({
            element: el,
            index: idx,
            rightNeighbor: null,
            belowNeighbor: null,
        }));
        // For each node, find right neighbor (same row, nearest X to the right)
        for (let i = 0; i < nodes.length; i++) {
            let bestRight = null;
            let bestRightDist = Infinity;
            for (let j = 0; j < nodes.length; j++) {
                if (i === j)
                    continue;
                const sameRow = Math.abs(nodes[i].element.y - nodes[j].element.y) <= tolerance;
                const isRight = nodes[j].element.x > nodes[i].element.x + nodes[i].element.width;
                if (sameRow && isRight) {
                    const dist = nodes[j].element.x - (nodes[i].element.x + nodes[i].element.width);
                    if (dist < bestRightDist) {
                        bestRightDist = dist;
                        bestRight = j;
                    }
                }
            }
            nodes[i].rightNeighbor = bestRight;
        }
        // For each node, find below neighbor (same column, nearest Y below)
        for (let i = 0; i < nodes.length; i++) {
            let bestBelow = null;
            let bestBelowDist = Infinity;
            for (let j = 0; j < nodes.length; j++) {
                if (i === j)
                    continue;
                const sameCol = Math.abs(nodes[i].element.x - nodes[j].element.x) <= tolerance;
                const isBelow = nodes[j].element.y > nodes[i].element.y + nodes[i].element.height;
                if (sameCol && isBelow) {
                    const dist = nodes[j].element.y - (nodes[i].element.y + nodes[i].element.height);
                    if (dist < bestBelowDist) {
                        bestBelowDist = dist;
                        bestBelow = j;
                    }
                }
            }
            nodes[i].belowNeighbor = bestBelow;
        }
        return nodes;
    }
    /**
     * Finds clusters of nodes that form grid-like structures.
     * A grid is detected when nodes have consistent right/below connections
     * forming a rectangular pattern.
     */
    findGridClusters(nodes, config) {
        const visited = new Set();
        const clusters = [];
        // Find seed nodes: nodes that have both a right and below neighbor
        const seedIndices = [];
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].rightNeighbor !== null && nodes[i].belowNeighbor !== null) {
                seedIndices.push(i);
            }
        }
        for (const seedIdx of seedIndices) {
            if (visited.has(seedIdx))
                continue;
            const cluster = this.growGridFromSeed(seedIdx, nodes, visited, config);
            if (cluster && cluster.rows >= config.minRows && cluster.cols >= config.minCols) {
                clusters.push(cluster);
            }
        }
        return clusters;
    }
    /**
     * Grows a grid cluster from a seed node by following right and below links.
     */
    growGridFromSeed(seedIdx, nodes, visited, config) {
        // Trace the first row by following right neighbors
        const firstRow = [];
        let current = seedIdx;
        while (current !== null && !visited.has(current)) {
            firstRow.push(current);
            current = nodes[current].rightNeighbor;
        }
        if (firstRow.length < config.minCols) {
            return null;
        }
        // Trace columns by following below neighbors from each node in the first row
        const grid = [firstRow];
        for (let row = 0; row < 50; row++) {
            // Safety limit
            const nextRow = [];
            let allNull = true;
            for (const nodeIdx of grid[row]) {
                const below = nodes[nodeIdx].belowNeighbor;
                if (below !== null && !visited.has(below)) {
                    nextRow.push(below);
                    allNull = false;
                }
                else {
                    nextRow.push(-1); // Placeholder for missing cell
                }
            }
            if (allNull)
                break;
            grid.push(nextRow);
        }
        // Validate grid: check if columns are consistent
        const validRows = [];
        for (const row of grid) {
            const nonPlaceholders = row.filter((idx) => idx >= 0);
            if (nonPlaceholders.length >= config.minCols) {
                validRows.push(row);
            }
        }
        if (validRows.length < config.minRows) {
            return null;
        }
        // Mark nodes as visited
        const nodeIndices = new Set();
        for (const row of validRows) {
            for (const idx of row) {
                if (idx >= 0) {
                    visited.add(idx);
                    nodeIndices.add(idx);
                }
            }
        }
        return {
            nodes: Array.from(nodeIndices),
            rows: validRows.length,
            cols: validRows[0].filter((idx) => idx >= 0).length,
        };
    }
    /**
     * Builds a DetectedTable from a grid cluster.
     */
    buildTableFromCluster(cluster, nodes, config) {
        const clusterElements = cluster.nodes.map((idx) => nodes[idx].element);
        if (clusterElements.length === 0)
            return null;
        // Compute bounding box
        const x1 = Math.min(...clusterElements.map((el) => el.x));
        const y1 = Math.min(...clusterElements.map((el) => el.y));
        const x2 = Math.max(...clusterElements.map((el) => el.x + el.width));
        const y2 = Math.max(...clusterElements.map((el) => el.y + el.height));
        // Build cells by estimating grid positions
        // Group elements by Y (rows) and X (columns)
        const rowGroups = this.clusterByCoordinate(clusterElements, 'y', config.tolerance);
        const colGroups = this.clusterByCoordinate(clusterElements, 'x', config.tolerance);
        const rows = rowGroups.length;
        const cols = colGroups.length;
        if (rows < config.minRows || cols < config.minCols) {
            return null;
        }
        // Build cell grid
        const cells = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                // Find elements in this cell
                const cellElements = clusterElements.filter((el) => rowGroups[r].includes(el) && colGroups[c].includes(el));
                if (cellElements.length > 0) {
                    const cx1 = Math.min(...cellElements.map((el) => el.x));
                    const cy1 = Math.min(...cellElements.map((el) => el.y));
                    const cx2 = Math.max(...cellElements.map((el) => el.x + el.width));
                    const cy2 = Math.max(...cellElements.map((el) => el.y + el.height));
                    cells.push({
                        rowIndex: r,
                        colIndex: c,
                        x1: cx1,
                        y1: cy1,
                        x2: cx2,
                        y2: cy2,
                        content: cellElements.map((el) => el.text).join(' '),
                    });
                }
                else {
                    // Empty cell: estimate position from grid
                    const rowY = Math.min(...rowGroups[r].map((el) => el.y));
                    const colX = Math.min(...colGroups[c].map((el) => el.x));
                    const rowH = rowGroups[r].reduce((s, el) => s + el.height, 0) /
                        rowGroups[r].length;
                    const colW = colGroups[c].reduce((s, el) => s + el.width, 0) /
                        colGroups[c].length;
                    cells.push({
                        rowIndex: r,
                        colIndex: c,
                        x1: colX,
                        y1: rowY,
                        x2: colX + colW,
                        y2: rowY + rowH,
                    });
                }
            }
        }
        // Detect header: first row elements are typically bold or larger
        const firstRowElements = clusterElements.filter((el) => rowGroups[0].includes(el));
        const avgFontSize = clusterElements.reduce((s, el) => s + el.fontSize, 0) /
            clusterElements.length;
        const hasHeader = firstRowElements.length > 0 &&
            firstRowElements.some((el) => el.isBold || el.fontSize > avgFontSize);
        return {
            id: `graph-${Date.now()}`,
            detectorName: this.getName(),
            x1,
            y1,
            x2,
            y2,
            rows,
            cols,
            cells,
            hasHeader,
            confidence: 0,
        };
    }
    /**
     * Clusters elements by a coordinate (x or y) within tolerance.
     */
    clusterByCoordinate(elements, coord, tolerance) {
        const sorted = [...elements].sort((a, b) => {
            const valA = coord === 'x' ? a[coord] : a[coord];
            const valB = coord === 'x' ? b[coord] : b[coord];
            return valA - valB;
        });
        const groups = [];
        let currentGroup = [sorted[0]];
        for (let i = 1; i < sorted.length; i++) {
            const prevVal = coord === 'x' ? sorted[i - 1].x : sorted[i - 1].y;
            const currVal = coord === 'x' ? sorted[i].x : sorted[i].y;
            if (Math.abs(currVal - prevVal) <= tolerance) {
                currentGroup.push(sorted[i]);
            }
            else {
                groups.push(currentGroup);
                currentGroup = [sorted[i]];
            }
        }
        groups.push(currentGroup);
        return groups;
    }
}


  // core/table-detection/MorphologyDetector
/**
 * Morphology-Based Table Detector (Shape Bounding Box Dilation)
 *
 * Dilates (stretches) text bounding boxes by tolerance, merges overlapping
 * boxes into visual "blobs", then analyzes blob shapes. Table regions form
 * rectangular clusters which are split back into cell-sized regions.
 *
 * Best for: chaotic layouts where text blocks are fragmented.
 *
 * Algorithm:
 * 1. Dilate each text element's bounding box by tolerance
 * 2. Merge overlapping dilated boxes into connected components (blobs)
 * 3. Analyze blob shape: table regions form rectangular clusters
 * 4. Split large blobs back into cell-sized regions using internal gaps
 * 5. Validate rectangularity and grid regularity
 */
class MorphologyDetector {
    getName() {
        return 'Morphology';
    }
    getCategory() {
        return 'shape';
    }
    getDefaultWeight() {
        return 0.3;
    }
    detect(elements, config) {
        if (elements.length < config.minRows * config.minCols) {
            return [];
        }
        // Step 1: Dilate bounding boxes
        const dilatedBoxes = elements.map((el) => this.dilateBox(el, config.tolerance));
        // Step 2: Merge overlapping boxes into blobs
        const blobs = this.mergeOverlappingBoxes(dilatedBoxes);
        // Step 3: Filter blobs that look like tables
        const tableBlobs = blobs.filter((blob) => this.isTableLike(blob, config));
        if (tableBlobs.length === 0) {
            return [];
        }
        // Step 4: Convert blobs to DetectedTable objects
        const tables = [];
        for (const blob of tableBlobs) {
            const table = this.buildTableFromBlob(blob, elements, config);
            if (table) {
                tables.push(table);
            }
        }
        return tables;
    }
    getConfidence(table) {
        // Confidence based on rectangularity and cell coverage
        const blobArea = (table.x2 - table.x1) * (table.y2 - table.y1);
        if (blobArea === 0)
            return 0;
        const cellArea = table.cells.reduce((sum, cell) => sum + (cell.x2 - cell.x1) * (cell.y2 - cell.y1), 0);
        const coverageScore = Math.min(cellArea / blobArea, 1.0) * 0.4;
        const gridScore = Math.min((table.rows * table.cols) / 20, 0.4);
        const minDimensionScore = table.rows >= 2 && table.cols >= 2 ? 0.2 : 0;
        return Math.min(coverageScore + gridScore + minDimensionScore, 1.0);
    }
    /**
     * Dilates a text element's bounding box by the tolerance amount.
     */
    dilateBox(element, tolerance) {
        return {
            x1: element.x - tolerance,
            y1: element.y - tolerance,
            x2: element.x + element.width + tolerance,
            y2: element.y + element.height + tolerance,
        };
    }
    /**
     * Checks if two bounding boxes overlap.
     */
    boxesOverlap(a, b) {
        return !(a.x2 < b.x1 ||
            b.x2 < a.x1 ||
            a.y2 < b.y1 ||
            b.y2 < a.y1);
    }
    /**
     * Merges two bounding boxes into their union.
     */
    mergeBoxes(a, b) {
        return {
            x1: Math.min(a.x1, b.x1),
            y1: Math.min(a.y1, b.y1),
            x2: Math.max(a.x2, b.x2),
            y2: Math.max(a.y2, b.y2),
        };
    }
    /**
     * Merges overlapping boxes into connected components (blobs)
     * using a union-find approach.
     */
    mergeOverlappingBoxes(boxes) {
        if (boxes.length === 0)
            return [];
        // Union-Find data structure
        const parent = boxes.map((_, i) => i);
        const find = (x) => {
            if (parent[x] !== x) {
                parent[x] = find(parent[x]); // Path compression
            }
            return parent[x];
        };
        const union = (a, b) => {
            parent[find(a)] = find(b);
        };
        // Find all overlapping pairs and union them
        for (let i = 0; i < boxes.length; i++) {
            for (let j = i + 1; j < boxes.length; j++) {
                if (this.boxesOverlap(boxes[i], boxes[j])) {
                    union(i, j);
                }
            }
        }
        // Group boxes by their root
        const groups = new Map();
        for (let i = 0; i < boxes.length; i++) {
            const root = find(i);
            if (!groups.has(root)) {
                groups.set(root, []);
            }
            groups.get(root).push(i);
        }
        // Build blobs from groups
        const blobs = [];
        for (const indices of groups.values()) {
            const groupBoxes = indices.map((i) => boxes[i]);
            const mergedBox = groupBoxes.reduce((acc, box) => this.mergeBoxes(acc, box));
            blobs.push({ boxes: groupBoxes, mergedBox });
        }
        return blobs;
    }
    /**
     * Determines if a blob looks like a table based on shape analysis.
     */
    isTableLike(blob, config) {
        const { mergedBox } = blob;
        const width = mergedBox.x2 - mergedBox.x1;
        const height = mergedBox.y2 - mergedBox.y1;
        // Filter out tiny blobs (likely just text lines)
        const minWidth = config.tolerance * config.minCols * 3;
        const minHeight = config.tolerance * config.minRows * 3;
        if (width < minWidth || height < minHeight) {
            return false;
        }
        // Filter out blobs that are too tall and narrow (likely paragraphs)
        const aspectRatio = height / width;
        if (aspectRatio > 5) {
            return false; // Too tall and narrow
        }
        // Table-like blobs should have multiple elements
        if (blob.boxes.length < config.minRows * config.minCols) {
            return false;
        }
        // Check for internal structure: count distinct X and Y clusters
        const xPositions = blob.boxes.flatMap((b) => [b.x1, b.x2]);
        const yPositions = blob.boxes.flatMap((b) => [b.y1, b.y2]);
        const distinctX = this.countClusters(xPositions, config.tolerance);
        const distinctY = this.countClusters(yPositions, config.tolerance);
        // Table should have multiple distinct row and column boundaries
        return distinctX >= config.minCols + 1 && distinctY >= config.minRows + 1;
    }
    /**
     * Counts the number of clusters in a set of values within tolerance.
     */
    countClusters(values, tolerance) {
        if (values.length === 0)
            return 0;
        const sorted = [...values].sort((a, b) => a - b);
        let clusters = 1;
        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i] - sorted[i - 1] > tolerance * 2) {
                clusters++;
            }
        }
        return clusters;
    }
    /**
     * Builds a DetectedTable from a blob by analyzing internal structure.
     */
    buildTableFromBlob(blob, elements, config) {
        const { mergedBox } = blob;
        // Find elements inside the blob
        const containedElements = elements.filter((el) => el.x >= mergedBox.x1 &&
            el.x + el.width <= mergedBox.x2 &&
            el.y >= mergedBox.y1 &&
            el.y + el.height <= mergedBox.y2);
        if (containedElements.length === 0)
            return null;
        // Detect row boundaries by clustering Y positions
        const rowGroups = this.clusterElements(containedElements, (el) => el.y, config.tolerance);
        // Detect column boundaries by clustering X positions
        const colGroups = this.clusterElements(containedElements, (el) => el.x, config.tolerance);
        const rows = rowGroups.length;
        const cols = colGroups.length;
        if (rows < config.minRows || cols < config.minCols) {
            return null;
        }
        // Build cells
        const cells = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cellElements = containedElements.filter((el) => rowGroups[r].includes(el) && colGroups[c].includes(el));
                if (cellElements.length > 0) {
                    const cx1 = Math.min(...cellElements.map((el) => el.x));
                    const cy1 = Math.min(...cellElements.map((el) => el.y));
                    const cx2 = Math.max(...cellElements.map((el) => el.x + el.width));
                    const cy2 = Math.max(...cellElements.map((el) => el.y + el.height));
                    cells.push({
                        rowIndex: r,
                        colIndex: c,
                        x1: cx1,
                        y1: cy1,
                        x2: cx2,
                        y2: cy2,
                        content: cellElements.map((el) => el.text).join(' '),
                    });
                }
                else {
                    // Empty cell: estimate from grid
                    const rowYAvg = rowGroups[r].reduce((s, el) => s + el.y, 0) / rowGroups[r].length;
                    const colXAvg = colGroups[c].reduce((s, el) => s + el.x, 0) / colGroups[c].length;
                    const avgH = rowGroups[r].reduce((s, el) => s + el.height, 0) / rowGroups[r].length;
                    const avgW = colGroups[c].reduce((s, el) => s + el.width, 0) / colGroups[c].length;
                    cells.push({
                        rowIndex: r,
                        colIndex: c,
                        x1: colXAvg,
                        y1: rowYAvg,
                        x2: colXAvg + avgW,
                        y2: rowYAvg + avgH,
                    });
                }
            }
        }
        // Detect header
        const firstRowElements = containedElements.filter((el) => rowGroups[0].includes(el));
        const avgFontSize = containedElements.reduce((s, el) => s + el.fontSize, 0) /
            containedElements.length;
        const hasHeader = firstRowElements.length > 0 &&
            (firstRowElements.some((el) => el.isBold) ||
                firstRowElements.some((el) => el.fontSize > avgFontSize * 1.1));
        return {
            id: `morph-${Date.now()}`,
            detectorName: this.getName(),
            x1: mergedBox.x1,
            y1: mergedBox.y1,
            x2: mergedBox.x2,
            y2: mergedBox.y2,
            rows,
            cols,
            cells,
            hasHeader,
            confidence: 0,
        };
    }
    /**
     * Clusters elements by a projection function within tolerance.
     */
    clusterElements(elements, project, tolerance) {
        if (elements.length === 0)
            return [];
        const sorted = [...elements].sort((a, b) => project(a) - project(b));
        const groups = [];
        let currentGroup = [sorted[0]];
        let currentCenter = project(sorted[0]);
        for (let i = 1; i < sorted.length; i++) {
            const val = project(sorted[i]);
            if (Math.abs(val - currentCenter) <= tolerance) {
                currentGroup.push(sorted[i]);
                currentCenter =
                    currentGroup.reduce((s, el) => s + project(el), 0) /
                        currentGroup.length;
            }
            else {
                groups.push(currentGroup);
                currentGroup = [sorted[i]];
                currentCenter = val;
            }
        }
        groups.push(currentGroup);
        return groups;
    }
}


  // core/table-detection/VisualSignatureDetector
/**
 * Visual Signature Table Detector (Template Matching by Bitmask)
 *
 * Generates a low-resolution bitmask of the page, marks cells where text
 * exists, and compares against predefined templates. Match score = overlap
 * percentage. If match > threshold, extracts table at template coordinates.
 *
 * Best for: known document formats (invoices, receipts, forms).
 *
 * Algorithm:
 * 1. Generate bitmask: divide page into grid (e.g., 50x70 cells)
 * 2. Mark cells where text exists (1 = text, 0 = empty)
 * 3. Compare bitmask against predefined templates using XOR overlap
 * 4. If match score > threshold, extract table at template-defined region
 * 5. Support user-defined templates via config
 */
/** Default visual signature configuration. */
const DEFAULT_VISUAL_SIGNATURE_CONFIG = {
    gridWidth: 50,
    gridHeight: 70,
    matchThreshold: 0.6,
    templates: [],
};
/**
 * Built-in template for a standard invoice layout.
 * Table region is typically in the lower-middle portion of the page.
 */
const INVOICE_TEMPLATE = {
    name: 'invoice',
    gridWidth: 50,
    gridHeight: 70,
    // Simplified invoice bitmask: header top, table in middle, totals at bottom
    bitmask: (() => {
        const grid = [];
        for (let y = 0; y < 70; y++) {
            const row = [];
            for (let x = 0; x < 50; x++) {
                // Header region (top 10%): text across the width
                if (y < 7) {
                    row.push(x >= 5 && x < 45 ? 1 : 0);
                }
                // Table region (middle 50%): structured columns
                else if (y >= 15 && y < 50) {
                    row.push(x % 8 < 6 ? 1 : 0); // Columns with small gaps
                }
                // Totals region (bottom): right-aligned text
                else if (y >= 55 && y < 62) {
                    row.push(x >= 30 ? 1 : 0);
                }
                // Empty regions (gaps between sections)
                else {
                    row.push(0);
                }
            }
            grid.push(row);
        }
        return grid;
    })(),
    tableRegion: [0.1, 0.22, 0.9, 0.72], // x1, y1, x2, y2 as fraction of page
    minRows: 3,
    minCols: 4,
};
/**
 * Built-in template for a receipt layout.
 * Narrower, single-column table with left-aligned text.
 */
const RECEIPT_TEMPLATE = {
    name: 'receipt',
    gridWidth: 50,
    gridHeight: 70,
    bitmask: (() => {
        const grid = [];
        for (let y = 0; y < 70; y++) {
            const row = [];
            for (let x = 0; x < 50; x++) {
                // Header (top)
                if (y < 5) {
                    row.push(x >= 15 && x < 35 ? 1 : 0);
                }
                // Line items (alternating text/gap pattern for item + price)
                else if (y >= 10 && y < 50) {
                    row.push((x >= 5 && x < 30) || (x >= 38 && x < 48) ? 1 : 0);
                }
                // Total line
                else if (y >= 52 && y < 57) {
                    row.push(x >= 30 ? 1 : 0);
                }
                // Footer
                else if (y >= 60 && y < 65) {
                    row.push(x >= 15 && x < 35 ? 1 : 0);
                }
                else {
                    row.push(0);
                }
            }
            grid.push(row);
        }
        return grid;
    })(),
    tableRegion: [0.05, 0.14, 0.95, 0.72],
    minRows: 3,
    minCols: 2,
};
/**
 * Built-in template for a form layout with labeled fields.
 */
const FORM_TEMPLATE = {
    name: 'form',
    gridWidth: 50,
    gridHeight: 70,
    bitmask: (() => {
        const grid = [];
        for (let y = 0; y < 70; y++) {
            const row = [];
            for (let x = 0; x < 50; x++) {
                // Form title
                if (y < 5) {
                    row.push(x >= 10 && x < 40 ? 1 : 0);
                }
                // Form fields: label on left, value on right
                else if (y >= 8 && y < 55) {
                    // Label column (left) and value column (right)
                    row.push((x >= 3 && x < 20) || (x >= 25 && x < 47) ? 1 : 0);
                }
                // Separator line
                else if (y === 56 || y === 57) {
                    row.push(x >= 3 && x < 47 ? 1 : 0);
                }
                // Signature area
                else if (y >= 60 && y < 67) {
                    row.push((x >= 3 && x < 22) || (x >= 28 && x < 47) ? 1 : 0);
                }
                else {
                    row.push(0);
                }
            }
            grid.push(row);
        }
        return grid;
    })(),
    tableRegion: [0.06, 0.11, 0.94, 0.79],
    minRows: 4,
    minCols: 2,
};
const BUILTIN_TEMPLATES = [
    INVOICE_TEMPLATE,
    RECEIPT_TEMPLATE,
    FORM_TEMPLATE,
];
class VisualSignatureDetector {
    constructor(config) {
        this.config = { ...DEFAULT_VISUAL_SIGNATURE_CONFIG, ...config };
    }
    getName() {
        return 'VisualSignature';
    }
    getCategory() {
        return 'template';
    }
    getDefaultWeight() {
        return 0.9;
    }
    detect(elements, config) {
        if (elements.length < 4) {
            return [];
        }
        // Step 1: Generate page bitmask
        const bitmask = this.generateBitmask(elements, config);
        // Step 2: Match against all templates
        const allTemplates = [
            ...BUILTIN_TEMPLATES,
            ...(this.config.templates || []),
        ];
        const matches = [];
        for (const template of allTemplates) {
            const score = this.computeMatchScore(bitmask, template);
            if (score >= this.config.matchThreshold) {
                matches.push({ template, score });
            }
        }
        if (matches.length === 0) {
            return [];
        }
        // Step 3: Extract tables from matched templates
        const tables = [];
        for (const match of matches) {
            const table = this.extractTableFromTemplate(match.template, match.score, elements, config);
            if (table) {
                tables.push(table);
            }
        }
        return tables;
    }
    getConfidence(table) {
        // For template-based detection, confidence is largely the match score
        return Math.min(table.confidence, 1.0);
    }
    /**
     * Generates a low-resolution bitmask from text elements.
     * Each cell is 1 if it contains text, 0 otherwise.
     */
    generateBitmask(elements, config) {
        const gw = this.config.gridWidth;
        const gh = this.config.gridHeight;
        const cellW = config.pageWidth / gw;
        const cellH = config.pageHeight / gh;
        // Initialize empty grid
        const grid = [];
        for (let y = 0; y < gh; y++) {
            grid[y] = new Array(gw).fill(0);
        }
        // Mark cells containing text
        for (const el of elements) {
            const textCenterX = el.x + el.width / 2;
            const textCenterY = el.y + el.height / 2;
            // Skip elements outside page bounds
            if (textCenterX < 0 ||
                textCenterX > config.pageWidth ||
                textCenterY < 0 ||
                textCenterY > config.pageHeight) {
                continue;
            }
            const gridX = Math.min(Math.floor(textCenterX / cellW), gw - 1);
            const gridY = Math.min(Math.floor(textCenterY / cellH), gh - 1);
            if (gridY >= 0 && gridX >= 0) {
                grid[gridY][gridX] = 1;
            }
        }
        return grid;
    }
    /**
     * Computes match score between a generated bitmask and a template.
     * Uses normalized overlap (Jaccard-like similarity adapted for templates).
     */
    computeMatchScore(actual, template) {
        const gw = this.config.gridWidth;
        const gh = this.config.gridHeight;
        // Resample template to our grid size if needed
        const resampledTemplate = this.resampleTemplate(template, gw, gh);
        let matches = 0;
        let total = 0;
        for (let y = 0; y < gh; y++) {
            for (let x = 0; x < gw; x++) {
                const actualVal = actual[y]?.[x] ?? 0;
                const templateVal = resampledTemplate[y]?.[x] ?? 0;
                total++;
                if (actualVal === templateVal) {
                    matches++;
                }
            }
        }
        return total > 0 ? matches / total : 0;
    }
    /**
     * Resamples a template bitmask to match the detector grid size.
     */
    resampleTemplate(template, targetWidth, targetHeight) {
        // If sizes match, return as-is
        if (template.gridWidth === targetWidth && template.gridHeight === targetHeight) {
            return template.bitmask;
        }
        const resampled = [];
        const scaleX = template.gridWidth / targetWidth;
        const scaleY = template.gridHeight / targetHeight;
        for (let y = 0; y < targetHeight; y++) {
            resampled[y] = [];
            for (let x = 0; x < targetWidth; x++) {
                const srcY = Math.min(Math.floor(y * scaleY), template.gridHeight - 1);
                const srcX = Math.min(Math.floor(x * scaleX), template.gridWidth - 1);
                resampled[y][x] = template.bitmask[srcY]?.[srcX] ?? 0;
            }
        }
        return resampled;
    }
    /**
     * Extracts a table from a matched template region.
     */
    extractTableFromTemplate(template, matchScore, elements, config) {
        const [rx1, ry1, rx2, ry2] = template.tableRegion;
        const x1 = rx1 * config.pageWidth;
        const y1 = ry1 * config.pageHeight;
        const x2 = rx2 * config.pageWidth;
        const y2 = ry2 * config.pageHeight;
        // Find elements inside the template region
        const containedElements = elements.filter((el) => el.x + el.width / 2 >= x1 &&
            el.x + el.width / 2 <= x2 &&
            el.y + el.height / 2 >= y1 &&
            el.y + el.height / 2 <= y2);
        if (containedElements.length === 0) {
            return null;
        }
        // Detect grid structure within the template region
        const rowGroups = this.clusterByCoordinate(containedElements, (el) => el.y, config.tolerance);
        const colGroups = this.clusterByCoordinate(containedElements, (el) => el.x, config.tolerance);
        const rows = rowGroups.length;
        const cols = colGroups.length;
        if (rows < template.minRows || cols < template.minCols) {
            return null;
        }
        // Build cells
        const cells = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cellElements = containedElements.filter((el) => rowGroups[r].includes(el) && colGroups[c].includes(el));
                if (cellElements.length > 0) {
                    const cx1 = Math.min(...cellElements.map((el) => el.x));
                    const cy1 = Math.min(...cellElements.map((el) => el.y));
                    const cx2 = Math.max(...cellElements.map((el) => el.x + el.width));
                    const cy2 = Math.max(...cellElements.map((el) => el.y + el.height));
                    cells.push({
                        rowIndex: r,
                        colIndex: c,
                        x1: cx1,
                        y1: cy1,
                        x2: cx2,
                        y2: cy2,
                        content: cellElements.map((el) => el.text).join(' '),
                    });
                }
                else {
                    // Estimate empty cell position
                    const rowYAvg = rowGroups[r].reduce((s, el) => s + el.y, 0) / rowGroups[r].length;
                    const colXAvg = colGroups[c].reduce((s, el) => s + el.x, 0) / colGroups[c].length;
                    const avgH = rowGroups[r].reduce((s, el) => s + el.height, 0) / rowGroups[r].length;
                    const avgW = colGroups[c].reduce((s, el) => s + el.width, 0) / colGroups[c].length;
                    cells.push({
                        rowIndex: r,
                        colIndex: c,
                        x1: colXAvg,
                        y1: rowYAvg,
                        x2: colXAvg + avgW,
                        y2: rowYAvg + avgH,
                    });
                }
            }
        }
        // Detect header
        const firstRowEls = containedElements.filter((el) => rowGroups[0].includes(el));
        const avgFontSize = containedElements.reduce((s, el) => s + el.fontSize, 0) /
            containedElements.length;
        const hasHeader = firstRowEls.length > 0 &&
            (firstRowEls.some((el) => el.isBold) ||
                firstRowEls.some((el) => el.fontSize > avgFontSize * 1.1));
        return {
            id: `visual-${template.name}-${Date.now()}`,
            detectorName: this.getName(),
            x1,
            y1,
            x2,
            y2,
            rows,
            cols,
            cells,
            hasHeader,
            confidence: matchScore,
        };
    }
    /**
     * Clusters elements by a projection function within tolerance.
     */
    clusterByCoordinate(elements, project, tolerance) {
        if (elements.length === 0)
            return [];
        const sorted = [...elements].sort((a, b) => project(a) - project(b));
        const groups = [];
        let currentGroup = [sorted[0]];
        let currentCenter = project(sorted[0]);
        for (let i = 1; i < sorted.length; i++) {
            const val = project(sorted[i]);
            if (Math.abs(val - currentCenter) <= tolerance) {
                currentGroup.push(sorted[i]);
                currentCenter =
                    currentGroup.reduce((s, el) => s + project(el), 0) / currentGroup.length;
            }
            else {
                groups.push(currentGroup);
                currentGroup = [sorted[i]];
                currentCenter = val;
            }
        }
        groups.push(currentGroup);
        return groups;
    }
}


  // core/table-detection/EntropyDetector
/**
 * Entropy-Based Table Detector (Signal Processing for Text/Whitespace Alternation)
 *
 * Scans the page with a sliding window, counting alternations between
 * "text present" and "whitespace" in each window. High entropy = frequent
 * alternation = likely table region. Low entropy = mostly text or whitespace.
 *
 * Best for: processing varied document types where tables need to be located first.
 *
 * Algorithm:
 * 1. Create a binary signal: for each scanline, 1 = text present, 0 = whitespace
 * 2. Apply sliding window across the signal
 * 3. Compute entropy (alternation rate) within each window
 * 4. Identify high-entropy regions as table candidates
 * 5. Merge adjacent high-entropy regions into table bounding boxes
 * 6. Extract grid structure within detected regions
 */
class EntropyDetector {
    getName() {
        return 'Entropy';
    }
    getCategory() {
        return 'signal';
    }
    getDefaultWeight() {
        return 0.3;
    }
    detect(elements, config) {
        if (elements.length < config.minRows * config.minCols) {
            return [];
        }
        // Step 1: Build binary signal from scanlines
        const { signal } = this.buildBinarySignal(elements, config);
        // Step 2: Compute entropy with sliding window
        const entropyProfile = this.computeEntropyProfile(signal, config);
        // Step 3: Find high-entropy regions
        const highEntropyRegions = this.findHighEntropyRegions(entropyProfile, elements, config);
        if (highEntropyRegions.length === 0) {
            return [];
        }
        // Step 4: Build tables from regions
        const tables = [];
        for (const region of highEntropyRegions) {
            const table = this.buildTableFromRegion(region, config);
            if (table) {
                tables.push(table);
            }
        }
        return tables;
    }
    getConfidence(table) {
        // Confidence based on entropy strength and grid quality
        const cellDensity = table.cells.length / (table.rows * table.cols);
        const gridScore = cellDensity * 0.5;
        const sizeScore = Math.min((table.rows * table.cols) / 10, 0.5);
        return Math.min(gridScore + sizeScore, 1.0);
    }
    /**
     * Builds a binary signal from text elements.
     * Divides the page into horizontal scanlines; each scanline is 1 if
     * it contains text, 0 if it's whitespace.
     */
    buildBinarySignal(elements, config) {
        // Determine scanline height based on average text height
        const avgHeight = elements.reduce((sum, el) => sum + el.height, 0) / elements.length;
        const lineHeight = Math.max(avgHeight * 0.5, config.tolerance);
        const totalLines = Math.ceil(config.pageHeight / lineHeight);
        const signal = new Array(totalLines).fill(0);
        // Mark lines that contain text
        for (const el of elements) {
            const topLine = Math.floor(el.y / lineHeight);
            const bottomLine = Math.floor((el.y + el.height) / lineHeight);
            for (let line = topLine; line <= bottomLine && line < totalLines; line++) {
                if (line >= 0) {
                    signal[line] = 1;
                }
            }
        }
        return { signal, lineHeight, totalLines };
    }
    /**
     * Computes entropy profile using a sliding window.
     * Entropy measures the alternation rate between text and whitespace.
     */
    computeEntropyProfile(signal, config) {
        // Window size: enough to capture several row cycles of a table
        const windowSize = Math.max(Math.ceil(config.pageHeight / (config.tolerance * 10)), 5);
        const entropies = [];
        for (let i = 0; i < signal.length; i++) {
            const start = Math.max(0, i - Math.floor(windowSize / 2));
            const end = Math.min(signal.length, i + Math.floor(windowSize / 2));
            const window = signal.slice(start, end);
            entropies.push(this.calculateShannonEntropy(window));
        }
        return { entropies, windowSize };
    }
    /**
     * Calculates Shannon entropy of a binary signal.
     * Higher entropy = more alternation between 0 and 1.
     */
    calculateShannonEntropy(signal) {
        if (signal.length === 0)
            return 0;
        const ones = signal.filter((v) => v === 1).length;
        const zeros = signal.length - ones;
        const p1 = ones / signal.length;
        const p0 = zeros / signal.length;
        let entropy = 0;
        if (p1 > 0) {
            entropy -= p1 * Math.log2(p1);
        }
        if (p0 > 0) {
            entropy -= p0 * Math.log2(p0);
        }
        // Normalize to 0-1 range (max entropy for binary is 1.0)
        return entropy;
    }
    /**
     * Finds regions of high entropy that likely contain tables.
     */
    findHighEntropyRegions(entropyProfile, elements, config) {
        const { entropies, windowSize } = entropyProfile;
        if (entropies.length === 0)
            return [];
        // Compute entropy threshold: regions above the mean + std deviation
        const meanEntropy = entropies.reduce((sum, e) => sum + e, 0) / entropies.length;
        const variance = entropies.reduce((sum, e) => sum + (e - meanEntropy) ** 2, 0) /
            entropies.length;
        const stdDev = Math.sqrt(variance);
        const threshold = meanEntropy + stdDev * 0.3;
        // Find contiguous high-entropy segments
        const segments = [];
        let inSegment = false;
        let segmentStart = 0;
        let segmentSum = 0;
        let segmentCount = 0;
        for (let i = 0; i < entropies.length; i++) {
            if (entropies[i] >= threshold) {
                if (!inSegment) {
                    inSegment = true;
                    segmentStart = i;
                    segmentSum = 0;
                    segmentCount = 0;
                }
                segmentSum += entropies[i];
                segmentCount++;
            }
            else {
                if (inSegment && segmentCount > 0) {
                    segments.push({
                        start: segmentStart,
                        end: i - 1,
                        avgEntropy: segmentSum / segmentCount,
                    });
                }
                inSegment = false;
            }
        }
        // Close last segment
        if (inSegment && segmentCount > 0) {
            segments.push({
                start: segmentStart,
                end: entropies.length - 1,
                avgEntropy: segmentSum / segmentCount,
            });
        }
        // Filter segments that are too small to be tables
        const lineHeight = elements.length > 0
            ? elements.reduce((s, el) => s + el.height, 0) / elements.length
            : config.tolerance;
        const minLines = config.minRows;
        const validSegments = segments.filter((seg) => seg.end - seg.start >= minLines);
        if (validSegments.length === 0)
            return [];
        // Merge adjacent segments (tables might have slight entropy dips)
        const mergedSegments = this.mergeAdjacentSegments(validSegments, windowSize);
        // Convert segments to EntropyRegions
        const regions = [];
        for (const seg of mergedSegments) {
            const yStart = seg.start * lineHeight;
            const yEnd = seg.end * lineHeight;
            // Find elements within this Y range
            const regionElements = elements.filter((el) => el.y + el.height >= yStart && el.y <= yEnd);
            if (regionElements.length >= config.minRows * config.minCols) {
                regions.push({
                    yStart,
                    yEnd,
                    avgEntropy: seg.avgEntropy,
                    elements: regionElements,
                });
            }
        }
        return regions;
    }
    /**
     * Merges adjacent or overlapping entropy segments.
     */
    mergeAdjacentSegments(segments, windowSize) {
        if (segments.length === 0)
            return [];
        const merged = [{ ...segments[0] }];
        for (let i = 1; i < segments.length; i++) {
            const last = merged[merged.length - 1];
            const gap = segments[i].start - last.end;
            // Merge if segments are close enough (within 1 window size)
            if (gap <= windowSize * 2) {
                last.end = Math.max(last.end, segments[i].end);
                last.avgEntropy = (last.avgEntropy + segments[i].avgEntropy) / 2;
            }
            else {
                merged.push({ ...segments[i] });
            }
        }
        return merged;
    }
    /**
     * Builds a DetectedTable from an entropy-detected region.
     */
    buildTableFromRegion(region, config) {
        const elements = region.elements;
        if (elements.length < config.minRows * config.minCols) {
            return null;
        }
        // Compute bounding box
        const x1 = Math.min(...elements.map((el) => el.x));
        const y1 = region.yStart;
        const x2 = Math.max(...elements.map((el) => el.x + el.width));
        const y2 = region.yEnd;
        // Detect row and column structure
        const rowGroups = this.clusterByCoordinate(elements, (el) => el.y, config.tolerance);
        const colGroups = this.clusterByCoordinate(elements, (el) => el.x, config.tolerance);
        const rows = rowGroups.length;
        const cols = colGroups.length;
        if (rows < config.minRows || cols < config.minCols) {
            return null;
        }
        // Build cells
        const cells = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cellElements = elements.filter((el) => rowGroups[r].includes(el) && colGroups[c].includes(el));
                if (cellElements.length > 0) {
                    const cx1 = Math.min(...cellElements.map((el) => el.x));
                    const cy1 = Math.min(...cellElements.map((el) => el.y));
                    const cx2 = Math.max(...cellElements.map((el) => el.x + el.width));
                    const cy2 = Math.max(...cellElements.map((el) => el.y + el.height));
                    cells.push({
                        rowIndex: r,
                        colIndex: c,
                        x1: cx1,
                        y1: cy1,
                        x2: cx2,
                        y2: cy2,
                        content: cellElements.map((el) => el.text).join(' '),
                    });
                }
                else {
                    // Empty cell: estimate position
                    const rowYAvg = rowGroups[r].reduce((s, el) => s + el.y, 0) / rowGroups[r].length;
                    const colXAvg = colGroups[c].reduce((s, el) => s + el.x, 0) / colGroups[c].length;
                    const avgH = rowGroups[r].reduce((s, el) => s + el.height, 0) / rowGroups[r].length;
                    const avgW = colGroups[c].reduce((s, el) => s + el.width, 0) / colGroups[c].length;
                    cells.push({
                        rowIndex: r,
                        colIndex: c,
                        x1: colXAvg,
                        y1: rowYAvg,
                        x2: colXAvg + avgW,
                        y2: rowYAvg + avgH,
                    });
                }
            }
        }
        // Detect header
        const firstRowEls = elements.filter((el) => rowGroups[0].includes(el));
        const avgFontSize = elements.reduce((s, el) => s + el.fontSize, 0) / elements.length;
        const hasHeader = firstRowEls.length > 0 &&
            (firstRowEls.some((el) => el.isBold) ||
                firstRowEls.some((el) => el.fontSize > avgFontSize * 1.1));
        return {
            id: `entropy-${Date.now()}`,
            detectorName: this.getName(),
            x1,
            y1,
            x2,
            y2,
            rows,
            cols,
            cells,
            hasHeader,
            confidence: 0,
        };
    }
    /**
     * Clusters elements by a projection function within tolerance.
     */
    clusterByCoordinate(elements, project, tolerance) {
        if (elements.length === 0)
            return [];
        const sorted = [...elements].sort((a, b) => project(a) - project(b));
        const groups = [];
        let currentGroup = [sorted[0]];
        let currentCenter = project(sorted[0]);
        for (let i = 1; i < sorted.length; i++) {
            const val = project(sorted[i]);
            if (Math.abs(val - currentCenter) <= tolerance) {
                currentGroup.push(sorted[i]);
                currentCenter =
                    currentGroup.reduce((s, el) => s + project(el), 0) / currentGroup.length;
            }
            else {
                groups.push(currentGroup);
                currentGroup = [sorted[i]];
                currentCenter = val;
            }
        }
        groups.push(currentGroup);
        return groups;
    }
}


  // core/table-detection/DetectorRegistry
/**
 * Detector Registry
 *
 * Manages table detectors with configurable weights.
 * Follows SOLID:
 * - OCP: New detectors can be added without modifying registry
 * - DIP: Depends on ITableDetector abstraction
 * - SRP: Only manages detector lifecycle
 */
// import removed
// Import all detectors
// import removed
// import removed
// import removed
// import removed
// import removed
// import removed
// import removed
// import removed
// import removed
/**
 * Registry that manages table detectors and their execution.
 */
class DetectorRegistry {
    constructor(config) {
        this.detectors = new Map();
        this.config = { ...DEFAULT_REGISTRY_CONFIG, ...config };
    }
    /**
     * Registers a detector.
     */
    register(detector) {
        this.detectors.set(detector.getName(), detector);
    }
    /**
     * Unregisters a detector by name.
     */
    unregister(name) {
        return this.detectors.delete(name);
    }
    /**
     * Gets a detector by name.
     */
    get(name) {
        return this.detectors.get(name);
    }
    /**
     * Gets all registered detector names.
     */
    getDetectorNames() {
        return Array.from(this.detectors.keys());
    }
    /**
     * Runs all enabled detectors and merges results.
     * Results are sorted by confidence (highest first).
     */
    detectAll(elements, config = DEFAULT_DETECTION_CONFIG) {
        const allTables = [];
        for (const weight of this.config.weights) {
            if (!weight.enabled)
                continue;
            const detector = this.detectors.get(weight.name);
            if (!detector)
                continue;
            try {
                const tables = detector.detect(elements, config);
                // Calculate confidence for each table
                for (const table of tables) {
                    const rawConfidence = detector.getConfidence(table);
                    const weightedConfidence = rawConfidence * weight.weight;
                    // Create new table with updated confidence
                    allTables.push({
                        ...table,
                        confidence: weightedConfidence,
                    });
                }
            }
            catch (error) {
                console.warn(`Detector ${weight.name} failed:`, error);
            }
        }
        // Sort by confidence (highest first)
        allTables.sort((a, b) => b.confidence - a.confidence);
        // Filter by minimum confidence
        const filtered = allTables.filter(t => t.confidence >= this.config.minConfidence);
        // Limit to max tables
        return filtered.slice(0, this.config.maxTables);
    }
    /**
     * Runs a specific detector by name.
     */
    detectWith(name, elements, config = DEFAULT_DETECTION_CONFIG) {
        const detector = this.detectors.get(name);
        if (!detector) {
            throw new Error(`Detector ${name} not found`);
        }
        const tables = detector.detect(elements, config);
        const weight = this.config.weights.find(w => w.name === name);
        const weightValue = weight?.weight ?? 1.0;
        return tables.map(table => ({
            ...table,
            confidence: detector.getConfidence(table) * weightValue,
        }));
    }
    /**
     * Updates detector weights.
     */
    updateWeights(weights) {
        for (const weight of weights) {
            const existing = this.config.weights.find(w => w.name === weight.name);
            if (existing) {
                existing.weight = weight.weight;
                existing.enabled = weight.enabled;
            }
            else {
                this.config.weights.push(weight);
            }
        }
    }
    /**
     * Gets current detector weights.
     */
    getWeights() {
        return [...this.config.weights];
    }
}
/**
 * Creates a registry with all standard detectors registered.
 */
function createStandardRegistry(config) {
    const registry = new DetectorRegistry(config);
    // Register all detectors
    registry.register(new LatticeDetector());
    registry.register(new StreamDetector());
    registry.register(new RXYCutDetector());
    registry.register(new AnchorZoningDetector());
    registry.register(new SCADetector());
    registry.register(new GraphBasedDetector());
    registry.register(new MorphologyDetector());
    registry.register(new VisualSignatureDetector());
    registry.register(new EntropyDetector());
    return registry;
}


  // core/table-detection/index
// export { DEFAULT_DETECTION_CONFIG, DEFAULT_REGISTRY_CONFIG, } from './TableTypes';
// export { LatticeDetector } from './LatticeDetector';
// export { StreamDetector } from './StreamDetector';
// export { RXYCutDetector } from './RXYCutDetector';
// export { AnchorZoningDetector } from './AnchorZoningDetector';
// export { SCADetector } from './SCADetector';
// export { GraphBasedDetector } from './GraphBasedDetector';
// export { MorphologyDetector } from './MorphologyDetector';
// export { VisualSignatureDetector } from './VisualSignatureDetector';
// export { EntropyDetector } from './EntropyDetector';
// export { DetectorRegistry, createStandardRegistry } from './DetectorRegistry';



  // Expose to global scope
  window.PdfToMarkdown = PdfToMarkdown;
  window.PdfReader = PdfReader;
  window.PdfParser = PdfParser;
  window.MarkdownWriter = MarkdownWriter;
  window.TextElement = TextElement;
  window.Page = Page;
  window.PdfDocument = PdfDocument;
  window.MarkdownNode = MarkdownNode;
  window.Tokenizer = Tokenizer;
  window.ObjectParser = ObjectParser;
  window.ContentStreamParser = ContentStreamParser;
  window.TextExtractor = TextExtractor;
  window.LatticeDetector = LatticeDetector;
  window.TableExtractor = TableExtractor;
  window.TableTransformer = TableTransformer;
  window.HeadingTransformer = HeadingTransformer;
  window.ListTransformer = ListTransformer;
  window.ParagraphTransformer = ParagraphTransformer;
  window.InlineFormatterTransformer = InlineFormatterTransformer;
  window.FontRegistry = FontRegistry;
  window.DetectorRegistry = DetectorRegistry;
  window.createStandardRegistry = createStandardRegistry;
  window.DetectorCategory = DetectorCategory;
  window.DetectionConfig = DetectionConfig;
  
})(typeof window !== 'undefined' ? window : globalThis);
