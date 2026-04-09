/**
 * Represents the type of a PDF token.
 */
export var TokenType;
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
export class Tokenizer {
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
