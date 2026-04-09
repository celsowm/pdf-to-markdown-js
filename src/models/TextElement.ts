/**
 * Represents a text element extracted from a PDF page.
 * Contains the text content along with its positioning and styling information.
 */
export interface TextElement {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly fontSize: number;
  readonly fontName: string;
  readonly isBold: boolean;
  readonly isItalic: boolean;
  readonly isStrike: boolean;
  readonly isUnderline: boolean;
  readonly pageIndex: number;
}
