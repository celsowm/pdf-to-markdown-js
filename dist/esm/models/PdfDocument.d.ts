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
export declare function createPdfDocument(pages: ReadonlyArray<Page>, metadata?: Readonly<Record<string, string>>): PdfDocument;
//# sourceMappingURL=PdfDocument.d.ts.map