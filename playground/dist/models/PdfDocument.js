"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPdfDocument = createPdfDocument;
/**
 * Helper function to create a PdfDocument object.
 */
function createPdfDocument(pages, metadata = {}) {
    return {
        pages,
        metadata,
    };
}
//# sourceMappingURL=PdfDocument.js.map