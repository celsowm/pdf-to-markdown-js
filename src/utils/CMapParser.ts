import { logger } from './Logger';

/**
 * Parses PDF ToUnicode CMap streams to map character codes to Unicode strings.
 */
export class CMapParser {
  /**
   * Parses a CMap stream content and returns a mapping.
   */
  static parse(content: string): Map<number, string> {
    const map = new Map<number, string>();
    
    // Process bfchar blocks
    const bfcharBlocks = content.match(/beginbfchar[\s\S]*?endbfchar/g);
    if (bfcharBlocks) {
      const bfcharRegex = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g;
      for (const block of bfcharBlocks) {
        let match;
        while ((match = bfcharRegex.exec(block)) !== null) {
          const code = parseInt(match[1], 16);
          const unicode = this.hexToUnicode(match[2]);
          map.set(code, unicode);
        }
      }
    }

    // Process bfrange blocks
    const bfrangeBlocks = content.match(/beginbfrange[\s\S]*?endbfrange/g);
    if (bfrangeBlocks) {
      // Range with start/end/start_unicode
      const bfrangeRegex = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g;
      // Range with start/end/array_of_unicodes
      const bfrangeArrayRegex = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*\[([^\]]+)\]/g;

      for (const block of bfrangeBlocks) {
        let match;
        
        // Handle simple ranges
        while ((match = bfrangeRegex.exec(block)) !== null) {
          const start = parseInt(match[1], 16);
          const end = parseInt(match[2], 16);
          const unicodeStart = parseInt(match[3], 16);

          // Safety check: avoid extreme memory allocation if range is corrupted or huge
          const rangeSize = end - start;
          if (rangeSize >= 0 && rangeSize < 10000) {
            for (let i = 0; i <= rangeSize; i++) {
              map.set(start + i, String.fromCharCode(unicodeStart + i));
            }
          }
        }

        // Reset regex state for second pass on the same block
        bfrangeArrayRegex.lastIndex = 0;
        
        // Handle array ranges
        while ((match = bfrangeArrayRegex.exec(block)) !== null) {
          const start = parseInt(match[1], 16);
          const hexList = match[3].match(/<([0-9a-fA-F]+)>/g);
          if (hexList) {
            hexList.forEach((hex, i) => {
              const unicode = this.hexToUnicode(hex.substring(1, hex.length - 1));
              map.set(start + i, unicode);
            });
          }
        }
      }
    }

    if (map.size > 0) {
      logger.debug(`Parsed CMap with ${map.size} entries`);
    }

    return map;
  }

  private static hexToUnicode(hex: string): string {
    if (hex.length <= 4) {
      return String.fromCharCode(parseInt(hex, 16));
    }
    
    // Handle surrogate pairs or multi-byte sequences
    let result = '';
    for (let i = 0; i < hex.length; i += 4) {
      result += String.fromCharCode(parseInt(hex.substring(i, i + 4), 16));
    }
    return result;
  }

  /**
   * Applies the CMap to a raw string or hex code.
   */
  static apply(text: string, cmap: Map<number, string>): string {
    if (!cmap || cmap.size === 0) return text;

    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      result += cmap.get(charCode) || text[i];
    }
    return result;
  }
}
