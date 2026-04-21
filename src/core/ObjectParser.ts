import { Token, TokenType, Tokenizer } from './Tokenizer';

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
export type PdfObject =
  | { readonly type: 'null' }
  | { readonly type: 'boolean'; readonly value: boolean }
  | { readonly type: 'number'; readonly value: number }
  | { readonly type: 'string'; readonly value: string }
  | { readonly type: 'name'; readonly value: string }
  | { readonly type: 'reference'; readonly objNum: number; readonly genNum: number }
  | PdfDictionary
  | PdfArray
  | PdfStream;

/**
 * Parses PDF objects from tokenized content.
 */
export class ObjectParser {
  private readonly tokens: Token[];
  private position: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  /**
   * Parses PDF object content from raw string.
   */
  static parseContent(content: string): PdfObject {
    const tokenizer = new Tokenizer(content);
    const tokens = tokenizer.tokenize();
    const parser = new ObjectParser(tokens);
    return parser.parseObject();
  }

  /**
   * Parses the next PDF object from tokens.
   */
  parseObject(): PdfObject {
    if (this.position >= this.tokens.length) {
      throw new Error('Unexpected end of tokens');
    }

    const token = this.tokens[this.position];

    switch (token.type) {
      case TokenType.KEYWORD:
        this.position++;
        return this.parseKeyword(token.value as string);

      case TokenType.NUMBER:
        this.position++;
        // Check if this is an indirect reference (num gen R)
        if (
          this.position + 1 < this.tokens.length &&
          this.tokens[this.position].type === TokenType.NUMBER &&
          this.tokens[this.position + 1].type === TokenType.OPERATOR &&
          this.tokens[this.position + 1].value === 'R'
        ) {
          const objNum = token.value as number;
          const genNum = this.tokens[this.position].value as number;
          this.position += 2;
          return { type: 'reference', objNum, genNum };
        }
        return { type: 'number', value: token.value as number };

      case TokenType.STRING:
        this.position++;
        return { type: 'string', value: token.value as string };

      case TokenType.HEX_STRING:
        this.position++;
        return { type: 'string', value: this.hexToString(token.value as string) };

      case TokenType.NAME:
        this.position++;
        return { type: 'name', value: token.value as string };

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
  private parseKeyword(value: string): PdfObject {
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
  private parseArray(): PdfArray {
    this.position++; // Skip [
    const elements: PdfObject[] = [];

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
  private parseDictionary(): PdfObject {
    this.position++; // Skip <<
    const entries = new Map<string, PdfObject>();
    const dict: PdfDictionary = { type: 'dictionary', entries };

    while (this.position < this.tokens.length) {
      const token = this.tokens[this.position];

      if (token.type === TokenType.DICT_END) {
        this.position++;

        // Check if followed by stream
        if (
          this.position < this.tokens.length &&
          this.tokens[this.position].type === TokenType.STREAM
        ) {
          return this.handleStreamDictionary(dict);
        }

        return dict;
      }

      if (token.type === TokenType.NAME) {
        const key = token.value as string;
        this.position++;
        const value = this.parseObject();
        entries.set(key, value);
      } else {
        this.position++;
      }
    }

    throw new Error('Unterminated dictionary');
  }

  /**
   * Handles a dictionary that is followed by a stream.
   */
  private handleStreamDictionary(dict: PdfDictionary): PdfStream {
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

      // Add spaces back for non-string tokens to maintain structure, mostly for content streams
      if (
        streamContent.length > 0 &&
        token.type !== TokenType.STRING &&
        token.type !== TokenType.ARRAY_END &&
        token.type !== TokenType.ARRAY_START
      ) {
        streamContent += ' ';
      }

      if (token.type === TokenType.NAME) {
        streamContent += '/' + String(token.value);
      } else if (token.type === TokenType.STRING) {
        const val = String(token.value)
          .replace(/\\/g, '\\\\')
          .replace(/\(/g, '\\(')
          .replace(/\)/g, '\\)');
        streamContent += '(' + val + ')';
      } else if (token.type === TokenType.ARRAY_START) {
        streamContent += '[';
      } else if (token.type === TokenType.ARRAY_END) {
        streamContent += ']';
      } else if (token.type === TokenType.HEX_STRING) {
        streamContent += '<' + String(token.value) + '>';
      } else {
        streamContent += String(token.value);
      }
      this.position++;
    }

    // In many cases endstream is omitted or part of the last token. Just return what we have.
    if (streamContent.endsWith('endstream')) {
      streamContent = streamContent.substring(0, streamContent.length - 9).trim();
    }
    return {
      type: 'stream',
      dictionary: dict,
      content: streamContent,
    };
  }

  /**
   * Converts a hex string to a regular string.
   */
  private hexToString(hex: string): string {
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
  peek(): Token | undefined {
    return this.tokens[this.position];
  }

  /**
   * Checks if there are more tokens to process.
   */
  hasMore(): boolean {
    return this.position < this.tokens.length;
  }
}
