import { TextElement } from './TextElement';
/**
 * Represents a single page in a PDF document.
 */
export interface Page {
    readonly index: number;
    readonly width: number;
    readonly height: number;
    readonly textElements: ReadonlyArray<TextElement>;
}
/**
 * Helper function to create a Page object.
 */
export declare function createPage(index: number, width: number, height: number, textElements: ReadonlyArray<TextElement>): Page;
//# sourceMappingURL=Page.d.ts.map