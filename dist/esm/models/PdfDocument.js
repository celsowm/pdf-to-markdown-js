/**
 * Helper function to create a PdfDocument object.
 */
export function createPdfDocument(pages, metadata = {}) {
    return {
        pages,
        metadata,
    };
}
