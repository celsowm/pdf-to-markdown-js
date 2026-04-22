import type { TextElement } from '../models/TextElement';
import type { TextOperation, TextMatrix } from './ContentStreamParser';
import { IDENTITY_MATRIX } from './ContentStreamParser';
import { FontRegistry } from '../utils/FontRegistry';
import { logger } from '../utils/Logger';
import { CMapParser } from '../utils/CMapParser';

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
export class TextExtractor {
  private readonly pageIndex: number;
  private readonly cmaps: Map<string, Map<number, string>>;

  constructor(_pageWidth: number, _pageHeight: number, pageIndex: number, cmaps?: Map<string, Map<number, string>>) {
    this.pageIndex = pageIndex;
    this.cmaps = cmaps || new Map();
  }

  /**
   * Extracts text elements from a list of text operations.
   */
  extractTextElements(operations: TextOperation[]): TextElement[] {
    const positionedTexts: Array<{
      text: string;
      x: number;
      y: number;
      fontSize: number;
      fontName: string;
    }> = [];

    let tm: TextMatrix = { ...IDENTITY_MATRIX };
    let tlm: TextMatrix = { ...IDENTITY_MATRIX };
    let ctm: TextMatrix = { ...IDENTITY_MATRIX };
    const ctmStack: TextMatrix[] = [];
    
    let currentFontName = 'F1';
    let currentFontSize = DEFAULT_FONT_SIZES.normal;

    logger.verbose(`Extracting text from ${operations.length} operations for page ${this.pageIndex + 1}`);

    for (const operation of operations) {
      switch (operation.type) {
        case 'saveState':
          ctmStack.push({ ...ctm });
          break;

        case 'restoreState':
          if (ctmStack.length > 0) {
            ctm = ctmStack.pop()!;
          }
          break;

        case 'concatenateMatrix':
          if (operation.matrix) {
            ctm = this.multiplyMatrices(operation.matrix, ctm);
          }
          break;

        case 'setTextMatrix':
          if (operation.matrix) {
            tm = { ...operation.matrix };
            tlm = { ...operation.matrix };
          }
          break;

        case 'setFont':
          if (operation.fontName) {
            currentFontName = operation.fontName.startsWith('/') ? operation.fontName.substring(1) : operation.fontName;
          }
          if (operation.fontSize) {
            currentFontSize = operation.fontSize;
          }
          break;

        case 'text':
          if (operation.text) {
            // Apply CMap if available for this font
            const cmap = this.cmaps.get(currentFontName);
            const mappedText = cmap ? CMapParser.apply(operation.text, cmap) : operation.text;
            
            // Transform text position by CTM
            // (x, y) in text space -> (tx, ty) in user space
            const tx = tm.e * ctm.a + tm.f * ctm.c + ctm.e;
            const ty = tm.e * ctm.b + tm.f * ctm.d + ctm.f;

            // Deduplication: skip if exactly same text at almost same position
            const isDuplicate = positionedTexts.some(pt => 
              pt.text === mappedText && 
              Math.abs(pt.x - tx) < 0.5 && 
              Math.abs(pt.y - ty) < 0.5
            );

            if (!isDuplicate) {
              positionedTexts.push({
                text: mappedText,
                x: tx,
                y: ty,
                fontSize: currentFontSize,
                fontName: currentFontName,
              });
            }
          }
          break;

        case 'moveToNextLine':
          if (operation.relative && operation.x !== undefined && operation.y !== undefined) {
            // Td, TD move relative to current line matrix
            tlm = {
              ...tlm,
              e: tlm.e + operation.x,
              f: tlm.f + operation.y
            };
            tm = { ...tlm };
          } else if (operation.x !== undefined && operation.y !== undefined) {
            // Absolute move (uncommon for next line but handled)
            tm = { ...tm, e: operation.x, f: operation.y };
            tlm = { ...tm };
          } else {
            // T* or similar
            tlm = { ...tlm, e: 0, f: tlm.f - currentFontSize };
            tm = { ...tlm };
          }
          break;
      }
    }

    if (positionedTexts.length === 0 && operations.length > 0) {
       logger.debug(`No text extracted despite having ${operations.length} operations`);
    }

    return this.organizeTextElements(positionedTexts);
  }

  /**
   * Multiplies two matrices: m1 * m2
   */
  private multiplyMatrices(m1: TextMatrix, m2: TextMatrix): TextMatrix {
    return {
      a: m1.a * m2.a + m1.b * m2.c,
      b: m1.a * m2.b + m1.b * m2.d,
      c: m1.c * m2.a + m1.d * m2.c,
      d: m1.c * m2.b + m1.d * m2.d,
      e: m1.e * m2.a + m1.f * m2.c + m2.e,
      f: m1.e * m2.b + m1.f * m2.d + m2.f,
    };
  }

  /**
   * Organizes positioned text into coherent text elements.
   */
  private organizeTextElements(
    positionedTexts: Array<{
      text: string;
      x: number;
      y: number;
      fontSize: number;
      fontName: string;
    }>,
  ): TextElement[] {
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

    const textElements: TextElement[] = [];
    let currentLine: Array<(typeof positionedTexts)[0]> = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const item = sorted[i];
      const prevItem = currentLine[currentLine.length - 1];

      const yDiff = Math.abs(item.y - prevItem.y);

      if (yDiff <= LINE_TOLERANCE) {
        // Same line
        currentLine.push(item);
      } else {
        // New line - process the current line
        textElements.push(...this.processLine(currentLine));
        currentLine = [item];
      }
    }

    // Process the last line
    if (currentLine.length > 0) {
      textElements.push(...this.processLine(currentLine));
    }

    logger.verbose(`Organized into ${textElements.length} text elements`);
    return textElements;
  }

  /**
   * Processes a single line of text, merging nearby text into words.
   */
  private processLine(
    lineItems: Array<{
      text: string;
      x: number;
      y: number;
      fontSize: number;
      fontName: string;
    }>,
  ): TextElement[] {
    if (lineItems.length === 0) {
      return [];
    }

    // Sort by X position
    const sorted = [...lineItems].sort((a, b) => a.x - b.x);

    const elements: TextElement[] = [];
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
      } else {
        // Create new element
        elements.push(
          this.createTextElement(
            currentText,
            currentX,
            currentY,
            maxX - currentX,
            currentFontSize,
            currentFontName,
          ),
        );

        currentText = item.text;
        currentX = item.x;
        currentY = item.y;
        currentFontSize = item.fontSize;
        currentFontName = item.fontName;
        maxX = item.x + itemWidth;
      }
    }

    // Add the last element
    elements.push(
      this.createTextElement(
        currentText,
        currentX,
        currentY,
        maxX - currentX,
        currentFontSize,
        currentFontName,
      ),
    );

    return elements;
  }

  /**
   * Creates a TextElement with proper formatting.
   */
  private createTextElement(
    text: string,
    x: number,
    y: number,
    width: number,
    fontSize: number,
    fontName: string,
  ): TextElement {
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
  private estimateTextWidth(text: string, fontSize: number): number {
    // Rough estimation: average character width is ~0.5 * fontSize
    return text.length * fontSize * 0.5;
  }

  /**
   * Checks if a font name indicates strike-through text.
   */
  private isStrikeFont(fontName: string): boolean {
    const lower = fontName.toLowerCase();
    return (
      lower.includes('strikethrough') ||
      lower.includes('line-through') ||
      lower.includes('strike') ||
      lower.includes('linethrough')
    );
  }
}
