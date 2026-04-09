import { TextElement } from '../models/TextElement';
import { TextOperation } from './ContentStreamParser';
/**
 * Extracts and organizes text from PDF text operations.
 * Applies heuristics to detect paragraphs, headings, and other structural elements.
 */
export declare class TextExtractor {
    private readonly pageIndex;
    constructor(_pageWidth: number, _pageHeight: number, pageIndex: number);
    /**
     * Extracts text elements from a list of text operations.
     */
    extractTextElements(operations: TextOperation[]): TextElement[];
    /**
     * Organizes positioned text into coherent text elements.
     */
    private organizeTextElements;
    /**
     * Processes a single line of text, merging nearby text into words.
     */
    private processLine;
    /**
     * Creates a TextElement with proper formatting.
     */
    private createTextElement;
    /**
     * Estimates the width of text based on font size.
     */
    private estimateTextWidth;
    /**
     * Checks if a font name indicates strike-through text.
     */
    private isStrikeFont;
}
//# sourceMappingURL=TextExtractor.d.ts.map