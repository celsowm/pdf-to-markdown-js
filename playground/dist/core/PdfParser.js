"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfParser = void 0;
const ObjectParser_1 = require("../core/ObjectParser");
const ContentStreamParser_1 = require("../core/ContentStreamParser");
const TextExtractor_1 = require("../core/TextExtractor");
const PdfDocument_1 = require("../models/PdfDocument");
const Page_1 = require("../models/Page");
const MarkdownNode_1 = require("../models/MarkdownNode");
/**
 * Helper function to check if a PdfObject is a reference.
 */
function isReference(obj) {
    return obj.type === 'reference';
}
/**
 * Helper function to check if a PdfObject is a dictionary.
 */
function isDictionary(obj) {
    return obj.type === 'dictionary';
}
/**
 * Helper function to check if a PdfObject is an array.
 */
function isArray(obj) {
    return obj.type === 'array';
}
/**
 * Helper function to check if a PdfObject is a stream.
 */
function isStream(obj) {
    return obj.type === 'stream';
}
/**
 * Helper function to check if a PdfObject is a number.
 */
function isNumber(obj) {
    return obj.type === 'number';
}
/**
 * Helper function to check if a PdfObject is a string.
 */
function isString(obj) {
    return obj.type === 'string';
}
/**
 * Main PDF parser that orchestrates the entire parsing process.
 * Follows the Facade pattern - provides a simplified interface to the complex subsystem.
 */
class PdfParser {
    constructor(pdfReader, transformers) {
        this.pdfReader = pdfReader;
        this.transformers = [...transformers].sort((a, b) => b.getPriority() - a.getPriority());
    }
    /**
     * Parses the PDF document and returns the Markdown AST.
     */
    parse() {
        // Parse PDF structure
        const xrefTable = this.parseXRefTable();
        const trailer = this.pdfReader.parseTrailer();
        // Get pages
        const pages = this.extractPages(xrefTable, trailer);
        // Build document
        const metadata = this.extractMetadata(xrefTable, trailer);
        const document = (0, PdfDocument_1.createPdfDocument)(pages, metadata);
        // Convert to Markdown AST
        return this.convertToMarkdown(document);
    }
    /**
     * Parses the cross-reference table.
     */
    parseXRefTable() {
        try {
            return this.pdfReader.parseXRefTable();
        }
        catch {
            // If xref table parsing fails, try to find objects manually
            console.warn('Failed to parse xref table, attempting alternative extraction');
            return new Map();
        }
    }
    /**
     * Extracts page information from the PDF.
     */
    extractPages(xrefTable, trailer) {
        const pages = [];
        try {
            // Find catalog and pages
            const catalogObj = trailer.root;
            if (!catalogObj) {
                return pages;
            }
            const catalogContent = this.pdfReader.extractObjectContent(catalogObj, xrefTable);
            const catalogDict = ObjectParser_1.ObjectParser.parseContent(catalogContent);
            // Navigate to pages
            const pagesObj = this.getDictionaryEntry(catalogDict, '/Pages');
            if (!pagesObj || !isReference(pagesObj)) {
                return pages;
            }
            const pagesContent = this.pdfReader.extractObjectContent(pagesObj.objNum, xrefTable);
            const pagesDict = ObjectParser_1.ObjectParser.parseContent(pagesContent);
            // Get kids (individual pages)
            const kidsObj = this.getDictionaryEntry(pagesDict, '/Kids');
            if (!kidsObj || !isArray(kidsObj)) {
                return pages;
            }
            const kidsArray = kidsObj.elements;
            let pageIndex = 0;
            for (const kid of kidsArray) {
                if (isReference(kid)) {
                    const page = this.extractPage(kid.objNum, xrefTable, pageIndex++);
                    if (page) {
                        pages.push(page);
                    }
                }
            }
        }
        catch (error) {
            console.warn('Error extracting pages:', error);
        }
        return pages;
    }
    /**
     * Extracts a single page from the PDF.
     */
    extractPage(objNum, xrefTable, pageIndex) {
        try {
            const pageContent = this.pdfReader.extractObjectContent(objNum, xrefTable);
            const pageDict = ObjectParser_1.ObjectParser.parseContent(pageContent);
            // Get page dimensions
            const mediaBox = this.getDictionaryEntry(pageDict, '/MediaBox');
            let width = 612; // Default letter size
            let height = 792;
            if (mediaBox && isArray(mediaBox)) {
                const elements = mediaBox.elements;
                if (elements.length >= 4) {
                    width = this.getNumericValue(elements[2]);
                    height = this.getNumericValue(elements[3]);
                }
            }
            // Extract content stream
            const contents = this.getDictionaryEntry(pageDict, '/Contents');
            const textElements = this.extractTextFromContents(contents, xrefTable, width, height, pageIndex);
            return (0, Page_1.createPage)(pageIndex, width, height, textElements);
        }
        catch (error) {
            console.warn(`Error extracting page ${pageIndex + 1}:`, error);
            return null;
        }
    }
    /**
     * Extracts text elements from the page contents.
     */
    extractTextFromContents(contents, xrefTable, width, height, pageIndex) {
        if (!contents) {
            return [];
        }
        let streamContent = '';
        if (isReference(contents)) {
            try {
                const objContent = this.pdfReader.extractObjectContent(contents.objNum, xrefTable);
                const objDict = ObjectParser_1.ObjectParser.parseContent(objContent);
                if (isStream(objDict)) {
                    streamContent = objDict.content;
                }
            }
            catch {
                return [];
            }
        }
        else if (isArray(contents)) {
            // Multiple content streams
            const elements = contents.elements;
            for (const elem of elements) {
                if (isReference(elem)) {
                    try {
                        const objContent = this.pdfReader.extractObjectContent(elem.objNum, xrefTable);
                        const objDict = ObjectParser_1.ObjectParser.parseContent(objContent);
                        if (isStream(objDict)) {
                            streamContent += objDict.content;
                        }
                    }
                    catch {
                        // Continue with next stream
                    }
                }
            }
        }
        if (!streamContent) {
            return [];
        }
        // Parse content stream
        const contentStreamParser = new ContentStreamParser_1.ContentStreamParser(streamContent);
        const operations = contentStreamParser.parse();
        // Extract text
        const textExtractor = new TextExtractor_1.TextExtractor(width, height, pageIndex);
        return textExtractor.extractTextElements(operations);
    }
    /**
     * Extracts metadata from the PDF.
     */
    extractMetadata(xrefTable, trailer) {
        const metadata = {};
        if (trailer.info) {
            try {
                const infoContent = this.pdfReader.extractObjectContent(trailer.info, xrefTable);
                const infoDict = ObjectParser_1.ObjectParser.parseContent(infoContent);
                if (isDictionary(infoDict)) {
                    const entries = infoDict.entries;
                    for (const [key, value] of entries) {
                        if (isString(value)) {
                            metadata[key] = value.value;
                        }
                    }
                }
            }
            catch {
                // Ignore metadata errors
            }
        }
        return metadata;
    }
    /**
     * Gets a dictionary entry by key.
     */
    getDictionaryEntry(dict, key) {
        if (!isDictionary(dict)) {
            return null;
        }
        const entries = dict.entries;
        return entries.get(key) || null;
    }
    /**
     * Gets numeric value from a PDF object.
     */
    getNumericValue(obj) {
        if (isNumber(obj)) {
            return obj.value;
        }
        return 0;
    }
    /**
     * Converts a PdfDocument to Markdown AST.
     */
    convertToMarkdown(document) {
        const allNodes = [];
        for (const page of document.pages) {
            const pageNodes = this.transformPage(page.textElements, page.textElements);
            allNodes.push(...pageNodes);
        }
        return (0, MarkdownNode_1.createDocumentNode)(allNodes);
    }
    /**
     * Transforms text elements to Markdown nodes using registered transformers.
     */
    transformPage(elements, allElements) {
        if (elements.length === 0) {
            return [];
        }
        const nodes = [];
        const usedElements = new Set();
        // Try each transformer in priority order
        for (const transformer of this.transformers) {
            const unusedElements = elements.filter((el) => !usedElements.has(el));
            if (unusedElements.length === 0) {
                continue;
            }
            if (transformer.canTransform([...unusedElements])) {
                const transformed = transformer.transform([...unusedElements], [...allElements]);
                nodes.push(...transformed);
                unusedElements.forEach((el) => usedElements.add(el));
            }
        }
        return nodes;
    }
}
exports.PdfParser = PdfParser;
//# sourceMappingURL=PdfParser.js.map