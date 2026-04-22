import { logger } from '../utils/Logger';

/**
 * Represents a text positioning matrix.
 */
export interface TextMatrix {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly e: number; // x position
  readonly f: number; // y position
}

/**
 * Represents a parsed text operation from the content stream.
 */
export interface TextOperation {
  readonly type:
    | 'text'
    | 'moveToNextLine'
    | 'setTextMatrix'
    | 'setFont'
    | 'lineWidth'
    | 'saveState'
    | 'restoreState'
    | 'concatenateMatrix'
    | 'pathMoveTo'
    | 'pathLineTo'
    | 'pathRect'
    | 'pathClose'
    | 'paintStroke'
    | 'pathFill'
    | 'pathFillEvenOdd'
    | 'pathFillAndStroke'
    | 'pathFillAndStrokeEvenOdd'
    | 'setFillColor'
    | 'setStrokeColor'
    | 'unknown';
  readonly text?: string;
  readonly matrix?: TextMatrix;
  readonly fontName?: string;
  readonly fontSize?: number;
  readonly x?: number;
  readonly y?: number;
  readonly width?: number;
  readonly height?: number;
  readonly color?: number[]; // [r, g, b] or [gray] or [c, m, y, k]
  readonly relative?: boolean;
}

/**
 * Default identity matrix.
 */
export const IDENTITY_MATRIX: TextMatrix = {
  a: 1,
  b: 0,
  c: 0,
  d: 1,
  e: 0,
  f: 0,
};

/**
 * Robust parser for PDF content streams.
 * Handles the postfix notation of PDF operators.
 */
export class ContentStreamParser {
  private readonly streamContent: string;
  private position: number = 0;
  private stack: unknown[] = [];

  constructor(streamContent: string) {
    this.streamContent = streamContent;
  }

  parse(): TextOperation[] {
    const operations: TextOperation[] = [];
    let currentFontName: string | undefined;
    let currentFontSize: number | undefined;

    while (this.position < this.streamContent.length) {
      this.skipWhitespace();
      if (this.position >= this.streamContent.length) break;

      const char = this.streamContent[this.position];

      if (char === '(') {
        this.stack.push(this.parseParenthesizedString());
      } else if (char === '[') {
        this.stack.push(this.parseArray());
      } else if (char === '<') {
        if (this.streamContent[this.position + 1] === '<') {
           this.skipDictionary();
        } else {
           this.stack.push(this.parseHexString());
        }
      } else if (this.isNumberStart(char)) {
        this.stack.push(this.parseNumber());
      } else if (char === '/') {
        this.stack.push(this.parseName());
      } else if (this.isOperatorStart(char)) {
        const op = this.parseOperator();
        const result = this.handleOperator(op, currentFontName, currentFontSize);
        if (result) {
          if (result.type === 'setFont') {
            currentFontName = result.fontName;
            currentFontSize = result.fontSize;
          }
          operations.push(result);
        }
      } else {
        this.position++;
      }
    }

    return operations;
  }

  private skipWhitespace(): void {
    while (this.position < this.streamContent.length) {
      const char = this.streamContent[this.position];
      if (char === ' ' || char === '\t' || char === '\n' || char === '\r' || char === '\f' || char === '\0') {
        this.position++;
      } else if (char === '%') {
        this.skipComment();
      } else {
        break;
      }
    }
  }

  private skipComment(): void {
    while (this.position < this.streamContent.length) {
      const char = this.streamContent[this.position];
      this.position++;
      if (char === '\n' || char === '\r') break;
    }
  }

  private isNumberStart(char: string): boolean {
    return (char >= '0' && char <= '9') || char === '-' || char === '+' || char === '.';
  }

  private parseNumber(): number {
    let str = '';
    while (this.position < this.streamContent.length) {
      const char = this.streamContent[this.position];
      if (this.isNumberStart(char)) {
        str += char;
        this.position++;
      } else {
        break;
      }
    }
    return parseFloat(str);
  }

  private parseName(): string {
    this.position++; // skip /
    let name = '';
    while (this.position < this.streamContent.length) {
      const char = this.streamContent[this.position];
      if (this.isWhitespace(char) || '()<>[]{}/%'.includes(char)) break;
      name += char;
      this.position++;
    }
    return name;
  }

  private isWhitespace(char: string): boolean {
    return ' \t\n\r\f\0'.includes(char);
  }

  private parseParenthesizedString(): string {
    this.position++; // skip (
    let result = '';
    let depth = 1;
    while (this.position < this.streamContent.length && depth > 0) {
      const char = this.streamContent[this.position];
      if (char === '\\') {
        this.position++;
        const next = this.streamContent[this.position];
        if (next === 'n') result += '\n';
        else if (next === 'r') result += '\r';
        else if (next === 't') result += '\t';
        else if (next === '(' || next === ')' || next === '\\') result += next;
        else result += next;
      } else if (char === '(') {
        depth++;
        result += char;
      } else if (char === ')') {
        depth--;
        if (depth > 0) result += char;
      } else {
        result += char;
      }
      this.position++;
    }
    return result;
  }

  private parseHexString(): string {
    this.position++; // skip <
    let hex = '';
    while (this.position < this.streamContent.length) {
      const char = this.streamContent[this.position];
      if (char === '>') {
        this.position++;
        break;
      }
      if (/[0-9a-fA-F]/.test(char)) hex += char;
      this.position++;
    }
    // Simple hex to string
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

  private parseArray(): unknown[] {
    this.position++; // skip [
    const arr: unknown[] = [];
    while (this.position < this.streamContent.length) {
      this.skipWhitespace();
      if (this.streamContent[this.position] === ']') {
        this.position++;
        break;
      }
      const char = this.streamContent[this.position];
      if (char === '(') arr.push(this.parseParenthesizedString());
      else if (this.isNumberStart(char)) arr.push(this.parseNumber());
      else if (char === '[') arr.push(this.parseArray());
      else if (char === '/') arr.push(this.parseName());
      else this.position++;
    }
    return arr;
  }

  private skipDictionary(): void {
    this.position += 2; // skip <<
    let depth = 1;
    while (this.position < this.streamContent.length && depth > 0) {
      if (this.streamContent.startsWith('<<', this.position)) {
        depth++;
        this.position += 2;
      } else if (this.streamContent.startsWith('>>', this.position)) {
        depth--;
        this.position += 2;
      } else {
        this.position++;
      }
    }
  }

  private isOperatorStart(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '*' || char === "'" || char === '"';
  }

  private parseOperator(): string {
    let op = '';
    while (this.position < this.streamContent.length) {
      const char = this.streamContent[this.position];
      if (this.isOperatorStart(char)) {
        op += char;
        this.position++;
      } else {
        break;
      }
    }
    return op;
  }

  private handleOperator(op: string, fontName?: string, fontSize?: number): TextOperation | null {
    try {
      switch (op) {
        case 'BT':
          this.stack = [];
          return null;
        case 'ET':
          this.stack = [];
          return null;
        case 'Tf': {
          const size = this.stack.pop();
          const name = this.stack.pop();
          return { type: 'setFont', fontName: String(name), fontSize: Number(size) };
        }
        case 'Tm': {
          const f = Number(this.stack.pop());
          const e = Number(this.stack.pop());
          const d = Number(this.stack.pop());
          const c = Number(this.stack.pop());
          const b = Number(this.stack.pop());
          const a = Number(this.stack.pop());
          return { type: 'setTextMatrix', matrix: { a, b, c, d, e, f } };
        }
        case 'Td': {
          const y = Number(this.stack.pop());
          const x = Number(this.stack.pop());
          return { type: 'moveToNextLine', x, y, relative: true };
        }
        case 'TD': {
          const y = Number(this.stack.pop());
          const x = Number(this.stack.pop());
          // TD also sets leading, but for text position it's like Td
          return { type: 'moveToNextLine', x, y, relative: true };
        }
        case 'T*':
          return { type: 'moveToNextLine', x: 0, y: -1, relative: true }; // -1 is a guess for leading
        case 'TL':
          this.stack.pop(); // skip leading
          return { type: 'moveToNextLine' };
        case 'Tj': {
          const text = this.stack.pop();
          return { type: 'text', text: String(text), fontName, fontSize };
        }
        case 'TJ': {
          const arr = this.stack.pop();
          let text = '';
          if (Array.isArray(arr)) {
            for (const item of arr) {
              if (typeof item === 'string') text += item;
            }
          }
          return { type: 'text', text, fontName, fontSize };
        }
        case "'": {
          const text = this.stack.pop();
          return { type: 'text', text: String(text), fontName, fontSize };
        }
        case '"': {
          const text = this.stack.pop();
          this.stack.pop(); // skip w
          this.stack.pop(); // skip ac
          return { type: 'text', text: String(text), fontName, fontSize };
        }
        case 'cm': {
          const f = Number(this.stack.pop());
          const e = Number(this.stack.pop());
          const d = Number(this.stack.pop());
          const c = Number(this.stack.pop());
          const b = Number(this.stack.pop());
          const a = Number(this.stack.pop());
          return { type: 'concatenateMatrix', matrix: { a, b, c, d, e, f } };
        }
        case 'q':
          return { type: 'saveState' };
        case 'Q':
          return { type: 'restoreState' };
        case 'm': {
          const y = Number(this.stack.pop());
          const x = Number(this.stack.pop());
          return { type: 'pathMoveTo', x, y };
        }
        case 'l': {
          const y = Number(this.stack.pop());
          const x = Number(this.stack.pop());
          return { type: 'pathLineTo', x, y };
        }
        case 're': {
          const h = Number(this.stack.pop());
          const w = Number(this.stack.pop());
          const y = Number(this.stack.pop());
          const x = Number(this.stack.pop());
          return { type: 'pathRect', x, y, width: w, height: h };
        }
        case 'h':
          return { type: 'pathClose' };
        case 'S':
        case 's': // s is 'h S'
          return { type: 'paintStroke' };
        case 'f':
        case 'F':
        case 'f*':
          return { type: op === 'f*' ? 'pathFillEvenOdd' : 'pathFill' };
        case 'B':
        case 'B*':
        case 'b':
        case 'b*':
          return { type: (op === 'B*' || op === 'b*') ? 'pathFillAndStrokeEvenOdd' : 'pathFillAndStroke' };
        case 'w': {
          const width = Number(this.stack.pop());
          return { type: 'lineWidth', width };
        }
        case 'rg': {
          const b = Number(this.stack.pop());
          const g = Number(this.stack.pop());
          const r = Number(this.stack.pop());
          return { type: 'setFillColor', color: [r, g, b] };
        }
        case 'RG': {
          const b = Number(this.stack.pop());
          const g = Number(this.stack.pop());
          const r = Number(this.stack.pop());
          return { type: 'setStrokeColor', color: [r, g, b] };
        }
        case 'g': {
          const gray = Number(this.stack.pop());
          return { type: 'setFillColor', color: [gray] };
        }
        case 'G': {
          const gray = Number(this.stack.pop());
          return { type: 'setStrokeColor', color: [gray] };
        }
        case 'k': {
          const k = Number(this.stack.pop());
          const y = Number(this.stack.pop());
          const m = Number(this.stack.pop());
          const c = Number(this.stack.pop());
          return { type: 'setFillColor', color: [c, m, y, k] };
        }
        case 'K': {
          const k = Number(this.stack.pop());
          const y = Number(this.stack.pop());
          const m = Number(this.stack.pop());
          const c = Number(this.stack.pop());
          return { type: 'setStrokeColor', color: [c, m, y, k] };
        }
        default:
          // For now we don't log every single unknown operator to avoid spam
          // but we clear the stack to keep it healthy
          if (op.length > 0) {
             logger.verbose(`Operator ${op} ignored, stack cleared`);
          }
          this.stack = []; 
          return null;
      }
    } catch (e) {
      logger.debug(`Error handling operator ${op}:`, e);
      this.stack = [];
      return null;
    }
  }
}
