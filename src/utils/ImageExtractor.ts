import type { TextElement } from '../models/TextElement';

/**
 * Interface for OCR providers that can be used by the library.
 * This allows users to bring their own OCR implementation (like Transformers.js, Tesseract, etc.)
 */
export interface OcrProvider {
  /**
   * Processes a region of a page and returns its Markdown representation.
   * @param pageIndex The index of the page being processed
   * @param region The bounding box of the region to process
   * @returns Promise resolving to Markdown string
   */
  processRegion(pageIndex: number, region: { x1: number; y1: number; x2: number; y2: number }): Promise<string>;
}

/**
 * Helper to identify regions of interest for OCR.
 */
export interface OcrRegion {
  readonly pageIndex: number;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly elements: TextElement[];
}
