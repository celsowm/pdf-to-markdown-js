import type { TextElement } from '../models/TextElement';

/**
 * Represents a region of a page to be processed by OCR.
 */
export interface OcrRegion {
  readonly pageIndex: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Interface for OCR/Image text extraction.
 * Following ISP: clients only depend on extraction capability.
 */
export interface ImageExtractor {
  /**
   * Extracts text from a specific region of a page.
   */
  extractTextFromRegion(region: OcrRegion): Promise<TextElement[]>;
}
