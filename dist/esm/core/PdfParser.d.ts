import { PdfReader } from '../utils/PdfReader';
import { MarkdownTransformer } from '../transformers/MarkdownTransformer';
import { MarkdownNode } from '../models/MarkdownNode';
/**
 * Main PDF parser that orchestrates the entire parsing process.
 * Follows the Facade pattern - provides a simplified interface to the complex subsystem.
 */
export declare class PdfParser {
    private readonly pdfReader;
    private readonly transformers;
    constructor(pdfReader: PdfReader, transformers: MarkdownTransformer[]);
    /**
     * Parses the PDF document and returns the Markdown AST.
     */
    parse(): MarkdownNode;
    /**
     * Parses the cross-reference table.
     */
    private parseXRefTable;
    /**
     * Extracts page information from the PDF.
     */
    private extractPages;
    /**
     * Extracts a single page from the PDF.
     */
    private extractPage;
    /**
     * Extracts text elements from the page contents.
     */
    private extractTextFromContents;
    /**
     * Extracts metadata from the PDF.
     */
    private extractMetadata;
    /**
     * Gets a dictionary entry by key.
     */
    private getDictionaryEntry;
    /**
     * Gets numeric value from a PDF object.
     */
    private getNumericValue;
    /**
     * Converts a PdfDocument to Markdown AST.
     */
    private convertToMarkdown;
    /**
     * Transforms text elements to Markdown nodes using registered transformers.
     */
    private transformPage;
}
//# sourceMappingURL=PdfParser.d.ts.map