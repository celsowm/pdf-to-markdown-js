import type { Token} from './Tokenizer';
import { TokenType, Tokenizer } from './Tokenizer';
import { Decompressor } from '../utils/Decompressor';
import { Ascii85 } from '../utils/Ascii85';
import { logger } from '../utils/Logger';

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
  private readonly rawBuffer: Buffer;
  private position: number = 0;

  constructor(tokens: Token[], rawBuffer: Buffer) {
    this.tokens = tokens;
    this.rawBuffer = rawBuffer;
  }

  /**
   * Parses PDF object content from raw string or Buffer.
   */
  static parseContent(content: string | Buffer): PdfObject {
    const buffer = typeof content === 'string' ? Buffer.from(content, 'binary') : content;
    const tokenizer = new Tokenizer(buffer.toString('binary'));
    const tokens = tokenizer.tokenize();
    const parser = new ObjectParser(tokens, buffer);
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
    const streamToken = this.tokens[this.position];
    this.position++; // skip 'stream' keyword

    let offset = streamToken.charOffset + 6; // length of 'stream'

    // Skip the newline after 'stream' (can be \n or \r\n)
    if (this.rawBuffer[offset] === 0x0d && this.rawBuffer[offset + 1] === 0x0a) {
      offset += 2;
    } else if (this.rawBuffer[offset] === 0x0a) {
      offset += 1;
    }

    // Get length from dictionary
    let length = 0;
    const lengthObj = dict.entries.get('Length') || dict.entries.get('/Length');
    if (lengthObj && lengthObj.type === 'number') {
      length = lengthObj.value;
    }

    let streamData: Buffer;
    if (length > 0) {
      streamData = this.rawBuffer.subarray(offset, offset + length);
    } else {
      // Manual endstream search
      const searchBuffer = this.rawBuffer.subarray(offset);
      const endstreamMarker = Buffer.from('endstream');
      const endstreamIndex = searchBuffer.indexOf(endstreamMarker);
      
      if (endstreamIndex !== -1) {
        streamData = searchBuffer.subarray(0, endstreamIndex);
        // Trim trailing newline
        if (streamData.length > 0) {
          if (streamData[streamData.length - 1] === 0x0a) {
            if (streamData[streamData.length - 2] === 0x0d) {
              streamData = streamData.subarray(0, streamData.length - 2);
            } else {
              streamData = streamData.subarray(0, streamData.length - 1);
            }
          } else if (streamData[streamData.length - 1] === 0x0d) {
            streamData = streamData.subarray(0, streamData.length - 1);
          }
        }
      } else {
        streamData = searchBuffer;
      }
    }

    // Handle decompression
    const filter = dict.entries.get('Filter') || dict.entries.get('/Filter');
    if (filter) {
      const filters = filter.type === 'array' ? filter.elements : [filter];
      for (const f of filters) {
        const filterName = f.type === 'name' ? f.value : '';
        if (filterName === 'FlateDecode' || filterName === '/FlateDecode') {
          try {
            streamData = Decompressor.decompress(streamData);
            logger.verbose(`Successfully decompressed FlateDecode stream`);
          } catch (e) {
            // Try to find Zlib header 0x78 0x9c nearby
            const headerIndex = streamData.indexOf(Buffer.from([0x78, 0x9c]));
            if (headerIndex !== -1 && headerIndex < 10) {
              try {
                streamData = Decompressor.decompress(streamData.subarray(headerIndex));
                logger.verbose(`Successfully decompressed FlateDecode stream after finding header at ${headerIndex}`);
              } catch (e2) {
                logger.warn(`Failed to decompress FlateDecode even after finding header`, e2);
              }
            } else {
               logger.warn(`Failed to decompress FlateDecode stream`, e);
            }
          }
        } else if (filterName === 'ASCII85Decode' || filterName === '/ASCII85Decode') {
          try {
            streamData = Ascii85.decode(streamData);
            logger.verbose(`Successfully decoded ASCII85 stream`);
          } catch (e) {
            logger.warn(`Failed to decode ASCII85 stream`, e);
          }
        } else if (filterName) {
           logger.info(`Stream has unsupported filter: ${filterName}`);
        }
      }
    }

    // Skip until endobj or end of tokens
    while (this.position < this.tokens.length && this.tokens[this.position].type !== TokenType.ENDLOBJ) {
      this.position++;
    }

    return {
      type: 'stream',
      dictionary: dict,
      content: streamData.toString('binary'),
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
