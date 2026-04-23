import type { PdfReader, XRefEntry } from '../utils/PdfReader';
import { ObjectParser } from '../core/ObjectParser';
import type { PdfObject, PdfDictionary, PdfStream } from '../core/ObjectParser';
import { CMapParser } from '../utils/CMapParser';
import { logger } from '../utils/Logger';

/**
 * Manages PDF resources like fonts, CMaps, and metadata.
 * Following SRP: handles only resource-related extraction.
 */
export class ResourceManager {
  private readonly pdfReader: PdfReader;
  private readonly cmapCache: Map<number, Map<number, string>> = new Map();

  constructor(pdfReader: PdfReader) {
    this.pdfReader = pdfReader;
  }

  /**
   * Extracts CMaps for all fonts in a page's resources.
   */
  extractCMaps(
    resources: PdfDictionary,
    xrefTable: Map<number, XRefEntry>
  ): Map<string, Map<number, string>> {
    const cmaps = new Map<string, Map<number, string>>();
    const fonts = this.getDictionaryEntry(resources, '/Font');

    if (fonts && isDictionary(fonts)) {
      for (const [fontName, fontRef] of fonts.entries) {
        if (!isReference(fontRef)) continue;

        // Check cache first
        if (this.cmapCache.has(fontRef.objNum)) {
          cmaps.set(fontName.startsWith('/') ? fontName.substring(1) : fontName, this.cmapCache.get(fontRef.objNum)!);
          continue;
        }

        try {
          const fontContent = this.pdfReader.extractObjectBuffer(fontRef.objNum, xrefTable);
          const fontDict = ObjectParser.parseContent(fontContent);

          if (isDictionary(fontDict)) {
            const toUnicodeRef = this.getDictionaryEntry(fontDict, '/ToUnicode');
            if (toUnicodeRef && isReference(toUnicodeRef)) {
              if (this.cmapCache.has(toUnicodeRef.objNum)) {
                const cmap = this.cmapCache.get(toUnicodeRef.objNum)!;
                cmaps.set(fontName.startsWith('/') ? fontName.substring(1) : fontName, cmap);
                this.cmapCache.set(fontRef.objNum, cmap);
                continue;
              }

              const cmapContent = this.pdfReader.extractObjectBuffer(toUnicodeRef.objNum, xrefTable);
              const cmapObj = ObjectParser.parseContent(cmapContent);

              if (isStream(cmapObj)) {
                const cmap = CMapParser.parse(cmapObj.content);
                cmaps.set(fontName.startsWith('/') ? fontName.substring(1) : fontName, cmap);
                this.cmapCache.set(toUnicodeRef.objNum, cmap);
                this.cmapCache.set(fontRef.objNum, cmap);
              }
            }
          }
        } catch (e) {
          logger.debug(`Failed to extract CMap for font ${fontName}`, e);
        }
      }
    }

    return cmaps;
  }

  /**
   * Extracts metadata from the PDF info dictionary.
   */
  extractMetadata(
    xrefTable: Map<number, XRefEntry>,
    infoObjNum?: number,
  ): Record<string, string> {
    const metadata: Record<string, string> = {};

    if (infoObjNum) {
      try {
        const infoContent = this.pdfReader.extractObjectBuffer(infoObjNum, xrefTable);
        const infoDict = ObjectParser.parseContent(infoContent);

        if (isDictionary(infoDict)) {
          for (const [key, value] of infoDict.entries) {
            if (isString(value)) {
              metadata[key] = value.value;
            }
          }
        }
      } catch {
        // Ignore metadata errors
      }
    }

    return metadata;
  }

  /**
   * Helper to get dictionary entry.
   */
  getDictionaryEntry(dict: PdfObject, key: string): PdfObject | null {
    if (!isDictionary(dict)) return null;
    const entries = dict.entries;
    let val = entries.get(key);
    if (!val && key.startsWith('/')) val = entries.get(key.substring(1));
    else if (!val) val = entries.get('/' + key);
    return val || null;
  }
}

// Internal helpers mirrored from PdfParser for now
function isReference(obj: PdfObject): obj is { type: 'reference'; objNum: number; genNum: number } {
  return obj && obj.type === 'reference';
}
function isDictionary(obj: PdfObject): obj is PdfDictionary {
  return obj && obj.type === 'dictionary';
}
function isStream(obj: PdfObject): obj is PdfStream {
  return obj && obj.type === 'stream';
}
function isString(obj: PdfObject): obj is { type: 'string'; value: string } {
  return obj && obj.type === 'string';
}
