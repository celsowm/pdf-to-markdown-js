import { TokenType, Tokenizer } from './Tokenizer';
/**
 * Parses PDF objects from tokenized content.
 */
export class ObjectParser {
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
