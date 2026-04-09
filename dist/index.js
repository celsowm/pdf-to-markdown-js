"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FontStyle = exports.FontWeight = exports.FontRegistry = exports.TableExtractor = exports.DEFAULT_LATTICE_CONFIG = exports.LatticeDetector = exports.createStandardRegistry = exports.DetectorRegistry = exports.TableTransformer = exports.InlineFormatterTransformer = exports.ParagraphTransformer = exports.ListTransformer = exports.HeadingTransformer = exports.createTableNode = exports.createListNode = exports.createTextNode = exports.createParagraphNode = exports.createHeadingNode = exports.createDocumentNode = exports.createPdfDocument = exports.createPage = exports.MarkdownWriter = exports.PdfParser = exports.PdfReader = exports.PdfToMarkdown = void 0;
const PdfReader_1 = require("./utils/PdfReader");
const PdfParser_1 = require("./core/PdfParser");
const MarkdownWriter_1 = require("./utils/MarkdownWriter");
const transformers_1 = require("./transformers");
/**
 * Main API for converting PDF to Markdown.
 * Provides static methods for simple usage.
 */
class PdfToMarkdown {
    /**
     * Converts a PDF file to Markdown string.
     * @param filePath Path to the PDF file
     * @returns Promise resolving to Markdown string
     */
    static async fromFile(filePath) {
        const pdfReader = PdfReader_1.PdfReader.fromFile(filePath);
        return this.convert(pdfReader);
    }
    /**
     * Converts a PDF buffer to Markdown string.
     * @param buffer PDF file buffer
     * @returns Promise resolving to Markdown string
     */
    static async fromBuffer(buffer) {
        const pdfReader = PdfReader_1.PdfReader.fromBuffer(buffer);
        return this.convert(pdfReader);
    }
    /**
     * Converts a PDF from binary string to Markdown string (for browser).
     * @param binaryString Binary string representation of PDF
     * @returns Promise resolving to Markdown string
     */
    static async fromBinary(binaryString) {
        const pdfReader = PdfReader_1.PdfReader.fromBinaryString(binaryString);
        return this.convert(pdfReader);
    }
    /**
     * Converts a PDF from a URL to Markdown string.
     * @param url URL to the PDF file
     * @returns Promise resolving to Markdown string
     */
    static async fromUrl(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch PDF from URL: ${response.status} ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return this.fromBuffer(buffer);
    }
    /**
     * Internal conversion method.
     */
    static convert(pdfReader) {
        // Create transformers (order matters - priority sorted)
        const transformers = [
            new transformers_1.HeadingTransformer(),
            new transformers_1.TableTransformer(),
            new transformers_1.InlineFormatterTransformer(),
            new transformers_1.ListTransformer(),
            new transformers_1.ParagraphTransformer(),
        ];
        // Parse PDF
        const pdfParser = new PdfParser_1.PdfParser(pdfReader, transformers);
        const markdownAst = pdfParser.parse();
        // Convert to markdown string
        const markdownWriter = new MarkdownWriter_1.MarkdownWriter();
        return markdownWriter.write(markdownAst);
    }
}
exports.PdfToMarkdown = PdfToMarkdown;
// Export individual components for advanced usage
var PdfReader_2 = require("./utils/PdfReader");
Object.defineProperty(exports, "PdfReader", { enumerable: true, get: function () { return PdfReader_2.PdfReader; } });
var PdfParser_2 = require("./core/PdfParser");
Object.defineProperty(exports, "PdfParser", { enumerable: true, get: function () { return PdfParser_2.PdfParser; } });
var MarkdownWriter_2 = require("./utils/MarkdownWriter");
Object.defineProperty(exports, "MarkdownWriter", { enumerable: true, get: function () { return MarkdownWriter_2.MarkdownWriter; } });
var Page_1 = require("./models/Page");
Object.defineProperty(exports, "createPage", { enumerable: true, get: function () { return Page_1.createPage; } });
var PdfDocument_1 = require("./models/PdfDocument");
Object.defineProperty(exports, "createPdfDocument", { enumerable: true, get: function () { return PdfDocument_1.createPdfDocument; } });
var MarkdownNode_1 = require("./models/MarkdownNode");
Object.defineProperty(exports, "createDocumentNode", { enumerable: true, get: function () { return MarkdownNode_1.createDocumentNode; } });
Object.defineProperty(exports, "createHeadingNode", { enumerable: true, get: function () { return MarkdownNode_1.createHeadingNode; } });
Object.defineProperty(exports, "createParagraphNode", { enumerable: true, get: function () { return MarkdownNode_1.createParagraphNode; } });
Object.defineProperty(exports, "createTextNode", { enumerable: true, get: function () { return MarkdownNode_1.createTextNode; } });
Object.defineProperty(exports, "createListNode", { enumerable: true, get: function () { return MarkdownNode_1.createListNode; } });
Object.defineProperty(exports, "createTableNode", { enumerable: true, get: function () { return MarkdownNode_1.createTableNode; } });
var HeadingTransformer_1 = require("./transformers/HeadingTransformer");
Object.defineProperty(exports, "HeadingTransformer", { enumerable: true, get: function () { return HeadingTransformer_1.HeadingTransformer; } });
var ListTransformer_1 = require("./transformers/ListTransformer");
Object.defineProperty(exports, "ListTransformer", { enumerable: true, get: function () { return ListTransformer_1.ListTransformer; } });
var ParagraphTransformer_1 = require("./transformers/ParagraphTransformer");
Object.defineProperty(exports, "ParagraphTransformer", { enumerable: true, get: function () { return ParagraphTransformer_1.ParagraphTransformer; } });
var InlineFormatterTransformer_1 = require("./transformers/InlineFormatterTransformer");
Object.defineProperty(exports, "InlineFormatterTransformer", { enumerable: true, get: function () { return InlineFormatterTransformer_1.InlineFormatterTransformer; } });
var TableTransformer_1 = require("./transformers/TableTransformer");
Object.defineProperty(exports, "TableTransformer", { enumerable: true, get: function () { return TableTransformer_1.TableTransformer; } });
var table_detection_1 = require("./core/table-detection");
Object.defineProperty(exports, "DetectorRegistry", { enumerable: true, get: function () { return table_detection_1.DetectorRegistry; } });
Object.defineProperty(exports, "createStandardRegistry", { enumerable: true, get: function () { return table_detection_1.createStandardRegistry; } });
var LatticeDetector_1 = require("./core/LatticeDetector");
Object.defineProperty(exports, "LatticeDetector", { enumerable: true, get: function () { return LatticeDetector_1.LatticeDetector; } });
Object.defineProperty(exports, "DEFAULT_LATTICE_CONFIG", { enumerable: true, get: function () { return LatticeDetector_1.DEFAULT_LATTICE_CONFIG; } });
var TableExtractor_1 = require("./core/TableExtractor");
Object.defineProperty(exports, "TableExtractor", { enumerable: true, get: function () { return TableExtractor_1.TableExtractor; } });
var FontRegistry_1 = require("./utils/FontRegistry");
Object.defineProperty(exports, "FontRegistry", { enumerable: true, get: function () { return FontRegistry_1.FontRegistry; } });
Object.defineProperty(exports, "FontWeight", { enumerable: true, get: function () { return FontRegistry_1.FontWeight; } });
Object.defineProperty(exports, "FontStyle", { enumerable: true, get: function () { return FontRegistry_1.FontStyle; } });
// Default export
exports.default = PdfToMarkdown;
//# sourceMappingURL=index.js.map