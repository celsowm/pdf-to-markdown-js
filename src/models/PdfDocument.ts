import { Page } from './Page';

/**
 * Represents a complete PDF document.
 */
export interface PdfDocument {
  readonly pages: ReadonlyArray<Page>;
  readonly metadata: Readonly<Record<string, string>>;
}

/**
 * Helper function to create a PdfDocument object.
 */
export function createPdfDocument(
  pages: ReadonlyArray<Page>,
  metadata: Readonly<Record<string, string>> = {},
): PdfDocument {
  return {
    pages,
    metadata,
  };
}
