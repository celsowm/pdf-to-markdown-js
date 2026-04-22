/**
 * Represents the type of a PDF token.
 */
export enum TokenType {
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  HEX_STRING = 'HEX_STRING',
  NAME = 'NAME',
  KEYWORD = 'KEYWORD',
  ARRAY_START = 'ARRAY_START',
  ARRAY_END = 'ARRAY_END',
  DICT_START = 'DICT_START',
  DICT_END = 'DICT_END',
  STREAM = 'STREAM',
  ENDSTREAM = 'ENDSTREAM',
  OBJ = 'OBJ',
  ENDLOBJ = 'ENDOBJ',
  OPERATOR = 'OPERATOR',
  COMMENT = 'COMMENT',
  EOF = 'EOF',
}

/**
 * Represents a tokenized unit from PDF content.
 */
export interface Token {
  readonly type: TokenType;
  readonly value: string | number;
  readonly lineNumber: number;
  readonly charOffset: number;
}

/**
 * Tokenizes PDF file content into individual tokens.
 * Follows PDF Reference 3.2 (Lexical Conventions).
 */
export class Tokenizer {
  private readonly content: string;
  private position: number = 0;
  private lineNumber: number = 1;

  constructor(content: string) {
    this.content = content;
  }

  /**
   * Tokenizes the entire content and returns all tokens.
   */
  public tokenize(): Token[] {
    const tokens: Token[] = [];

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
  private nextToken(): Token | null {
    this.skipWhitespace();

    if (this.position >= this.content.length) {
      return null;
    }

    const startOffset = this.position;
    const char = this.content[this.position];

    // Comments
    if (char === '%') {
      const token = this.readComment();
      return { ...token, charOffset: startOffset };
    }

    // Delimiters
    switch (char) {
      case '<': {
        if (this.content[this.position + 1] === '<') {
          this.position += 2;
          return { type: TokenType.DICT_START, value: '<<', lineNumber: this.lineNumber, charOffset: startOffset };
        }
        const hexToken = this.readHexString();
        return { ...hexToken, charOffset: startOffset };
      }
      case '>':
        if (this.content[this.position + 1] === '>') {
          this.position += 2;
          return { type: TokenType.DICT_END, value: '>>', lineNumber: this.lineNumber, charOffset: startOffset };
        }
        // Single > is unusual but skip it
        this.position++;
        return { type: TokenType.OPERATOR, value: '>', lineNumber: this.lineNumber, charOffset: startOffset };
      case '[':
        this.position++;
        return { type: TokenType.ARRAY_START, value: '[', lineNumber: this.lineNumber, charOffset: startOffset };
      case ']':
        this.position++;
        return { type: TokenType.ARRAY_END, value: ']', lineNumber: this.lineNumber, charOffset: startOffset };
      case '/': {
        const nameToken = this.readName();
        return { ...nameToken, charOffset: startOffset };
      }
      case '(': {
        const stringToken = this.readString();
        return { ...stringToken, charOffset: startOffset };
      }
      case ')':
        this.position++;
        return { type: TokenType.STRING, value: ')', lineNumber: this.lineNumber, charOffset: startOffset };
    }

    // Numbers (integers or real)
    if (char === '+' || char === '-' || (char >= '0' && char <= '9')) {
      const numberToken = this.readNumber();
      return { ...numberToken, charOffset: startOffset };
    }

    // Keywords and operators
    if (this.isDelimiter(char) === false) {
      const keywordToken = this.readKeyword();
      return { ...keywordToken, charOffset: startOffset };
    }

    // Skip unknown single characters
    this.position++;
    return { type: TokenType.OPERATOR, value: char, lineNumber: this.lineNumber, charOffset: startOffset };
  }

  /**
   * Skips whitespace characters (spaces, tabs, newlines).
   */
  private skipWhitespace(): void {
    while (this.position < this.content.length) {
      const char = this.content[this.position];
      if (this.isWhitespace(char)) {
        if (char === '\r' || char === '\n') {
          if (char === '\r' && this.content[this.position + 1] === '\n') {
            this.position++;
          }
          this.lineNumber++;
        }
        this.position++;
      } else {
        break;
      }
    }
  }

  /**
   * Checks if a character is whitespace.
   */
  private isWhitespace(char: string): boolean {
    return char === ' ' || char === '\t' || char === '\n' || char === '\r' || char === '\f';
  }

  /**
   * Checks if a character is a delimiter.
   */
  private isDelimiter(char: string): boolean {
    return '[]<>()/{}/%'.includes(char) || this.isWhitespace(char);
  }

  /**
   * Reads a comment token (starts with %).
   */
  private readComment(): Omit<Token, 'charOffset'> {
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
  private readHexString(): Omit<Token, 'charOffset'> {
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
  private readString(): Omit<Token, 'charOffset'> {
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
                    } else {
                      this.position--;
                    }
                  }
                } else {
                  this.position--;
                }
              }
              value += String.fromCharCode(parseInt(octal, 8));
            } else {
              value += nextChar;
            }
        }
      } else if (char === '(') {
        depth++;
        value += char;
      } else if (char === ')') {
        depth--;
        if (depth > 0) {
          value += char;
        }
      } else {
        value += char;
      }

      this.position++;
    }

    return { type: TokenType.STRING, value, lineNumber: this.lineNumber };
  }

  /**
   * Reads a name (starts with /).
   */
  private readName(): Omit<Token, 'charOffset'> {
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
  private readNumber(): Omit<Token, 'charOffset'> {
    let value = '';
    let isReal = false;

    while (this.position < this.content.length) {
      const char = this.content[this.position];
      if (char === '.') {
        isReal = true;
        value += char;
      } else if (char >= '0' && char <= '9') {
        value += char;
      } else if ((char === '+' || char === '-') && value === '') {
        value += char;
      } else {
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
  private readKeyword(): Omit<Token, 'charOffset'> {
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
