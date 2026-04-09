import { TextElement } from '../models/TextElement';
import { TextOperation, TextMatrix } from './ContentStreamParser';
import { IDENTITY_MATRIX } from './ContentStreamParser';
import { FontRegistry } from '../utils/FontRegistry';

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

  constructor(_pageWidth: number, _pageHeight: number, pageIndex: number) {
    this.pageIndex = pageIndex;
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

    let currentMatrix: TextMatrix = { ...IDENTITY_MATRIX };
    let currentFontName = 'F1';
    let currentFontSize = DEFAULT_FONT_SIZES.normal;

    for (const operation of operations) {
      switch (operation.type) {
        case 'setTextMatrix':
          if (operation.matrix) {
            currentMatrix = operation.matrix;
          }
          break;

        case 'setFont':
          if (operation.fontName) {
            currentFontName = operation.fontName;
          }
          if (operation.fontSize) {
            currentFontSize = operation.fontSize;
          }
          break;

        case 'text':
          if (operation.text) {
            positionedTexts.push({
              text: operation.text,
              x: currentMatrix.e,
              y: currentMatrix.f,
              fontSize: currentFontSize,
              fontName: currentFontName,
            });
          }
          break;

        case 'moveToNextLine':
          // Adjust matrix for next line
          if (operation.x !== undefined && operation.y !== undefined) {
            currentMatrix = {
              ...currentMatrix,
              e: operation.x,
              f: operation.y,
            };
          } else {
            currentMatrix = {
              ...currentMatrix,
              e: 0,
              f: currentMatrix.f - currentFontSize,
            };
          }
          break;
      }
    }

    return this.organizeTextElements(positionedTexts);
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
    }>
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
    let currentLine: Array<typeof positionedTexts[0]> = [sorted[0]];

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
    }>
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
            currentFontName
          )
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
        currentFontName
      )
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
    fontName: string
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
