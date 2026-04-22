import type { TextElement } from '../models/TextElement';
import type { TextOperation, TextMatrix } from './ContentStreamParser';
import { IDENTITY_MATRIX } from './ContentStreamParser';
import { FontRegistry } from '../utils/FontRegistry';
import { logger } from '../utils/Logger';
import { CMapParser } from '../utils/CMapParser';

/**
 * Represents a line segment in PDF space.
 */
export interface LineSegment {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly isHorizontal: boolean;
  readonly isVertical: boolean;
}

/**
 * Represents a filled rectangular region (e.g. background color).
 */
export interface FillRegion {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly color: number[];
}

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
            let mappedText = cmap ? CMapParser.apply(operation.text, cmap) : operation.text;
            
            // Remove null bytes and other common PDF artifacts
            mappedText = mappedText.replace(/\0/g, '');

            // (x, y) in text space -> (tx, ty) in user space
            const tx = tm.e * ctm.a + tm.f * ctm.c + ctm.e;
            const ty = tm.e * ctm.b + tm.f * ctm.d + ctm.f;

            positionedTexts.push({
              text: mappedText,
              x: tx,
              y: ty,
              fontSize: currentFontSize,
              fontName: currentFontName,
            });
          }
          break;

        case 'moveToNextLine':
          if (operation.relative && operation.x !== undefined && operation.y !== undefined) {
            tlm = {
              ...tlm,
              e: tlm.e + operation.x,
              f: tlm.f + operation.y
            };
            tm = { ...tlm };
          } else if (operation.x !== undefined && operation.y !== undefined) {
            tm = { ...tm, e: operation.x, f: operation.y };
            tlm = { ...tm };
          } else {
            tlm = { ...tlm, e: 0, f: tlm.f - currentFontSize };
            tm = { ...tlm };
          }
          break;
      }
    }

    return this.organizeTextElements(positionedTexts);
  }

  /**
   * Extracts graphical line segments from path operations.
   */
  extractGraphics(operations: TextOperation[]): LineSegment[] {
    const lines: LineSegment[] = [];
    let currentX = 0;
    let currentY = 0;
    let startPathX = 0;
    let startPathY = 0;
    
    let ctm: TextMatrix = { ...IDENTITY_MATRIX };
    const ctmStack: TextMatrix[] = [];

    for (const op of operations) {
      switch (op.type) {
        case 'saveState':
          ctmStack.push({ ...ctm });
          break;
        case 'restoreState':
          if (ctmStack.length > 0) ctm = ctmStack.pop()!;
          break;
        case 'concatenateMatrix':
          if (op.matrix) ctm = this.multiplyMatrices(op.matrix, ctm);
          break;
        case 'pathMoveTo':
          if (op.x !== undefined && op.y !== undefined) {
            const p = this.transformPoint(op.x, op.y, ctm);
            currentX = p.x;
            currentY = p.y;
            startPathX = p.x;
            startPathY = p.y;
          }
          break;
        case 'pathLineTo':
          if (op.x !== undefined && op.y !== undefined) {
            const p = this.transformPoint(op.x, op.y, ctm);
            lines.push(this.createLine(currentX, currentY, p.x, p.y));
            currentX = p.x;
            currentY = p.y;
          }
          break;
        case 'pathRect':
          if (op.x !== undefined && op.y !== undefined && op.width !== undefined && op.height !== undefined) {
            const p1 = this.transformPoint(op.x, op.y, ctm);
            const p2 = this.transformPoint(op.x + op.width, op.y + op.height, ctm);
            
            lines.push(this.createLine(p1.x, p1.y, p2.x, p1.y)); // bottom
            lines.push(this.createLine(p2.x, p1.y, p2.x, p2.y)); // right
            lines.push(this.createLine(p2.x, p2.y, p1.x, p2.y)); // top
            lines.push(this.createLine(p1.x, p2.y, p1.x, p1.y)); // left
          }
          break;
        case 'pathClose':
          if (currentX !== startPathX || currentY !== startPathY) {
            lines.push(this.createLine(currentX, currentY, startPathX, startPathY));
          }
          break;
      }
    }

    return lines;
  }

  /**
   * Extracts filled rectangular regions from path operations.
   */
  extractFillRegions(operations: TextOperation[]): FillRegion[] {
    const regions: FillRegion[] = [];
    
    let currentFillColor: number[] = [0, 0, 0]; // Default black
    let ctm: TextMatrix = { ...IDENTITY_MATRIX };
    const ctmStack: TextMatrix[] = [];

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      switch (op.type) {
        case 'saveState':
          ctmStack.push({ ...ctm });
          break;
        case 'restoreState':
          if (ctmStack.length > 0) ctm = ctmStack.pop()!;
          break;
        case 'concatenateMatrix':
          if (op.matrix) ctm = this.multiplyMatrices(op.matrix, ctm);
          break;
        case 'setFillColor':
          if (op.color) currentFillColor = op.color;
          break;
        case 'pathFill':
        case 'pathFillEvenOdd':
        case 'pathFillAndStroke':
        case 'pathFillAndStrokeEvenOdd':
          // Check previous operator for rect
          if (i > 0) {
            const prev = operations[i - 1];
            if (prev.type === 'pathRect' && prev.x !== undefined && prev.y !== undefined && prev.width !== undefined && prev.height !== undefined) {
              const p1 = this.transformPoint(prev.x, prev.y, ctm);
              const p2 = this.transformPoint(prev.x + prev.width, prev.y + prev.height, ctm);
              
              regions.push({
                x: Math.min(p1.x, p2.x),
                y: Math.min(p1.y, p2.y),
                width: Math.abs(p1.x - p2.x),
                height: Math.abs(p1.y - p2.y),
                color: [...currentFillColor],
              });
            }
          }
          break;
      }
    }

    return regions;
  }

  private transformPoint(x: number, y: number, m: TextMatrix): { x: number; y: number } {
    return {
      x: x * m.a + y * m.c + m.e,
      y: x * m.b + y * m.d + m.f,
    };
  }

  private createLine(x1: number, y1: number, x2: number, y2: number): LineSegment {
    return {
      x1, y1, x2, y2,
      isHorizontal: Math.abs(y1 - y2) < 0.1,
      isVertical: Math.abs(x1 - x2) < 0.1,
    };
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
