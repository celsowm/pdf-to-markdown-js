import type { TextElement } from './TextElement';
import type { LineSegment } from '../core/TextExtractor';

/**
 * Represents a single page in a PDF document.
 */
export interface Page {
  readonly index: number;
  readonly width: number;
  readonly height: number;
  readonly textElements: ReadonlyArray<TextElement>;
  readonly lines: ReadonlyArray<LineSegment>;
}

/**
 * Helper function to create a Page object.
 */
export function createPage(
  index: number,
  width: number,
  height: number,
  textElements: ReadonlyArray<TextElement>,
  lines: ReadonlyArray<LineSegment> = [],
): Page {
  return {
    index,
    width,
    height,
    textElements,
    lines,
  };
}
