import { TextElement } from '../models/TextElement';
import { MarkdownNode } from '../models/MarkdownNode';
import { MarkdownTransformer } from './MarkdownTransformer';
/**
 * Transformer that detects ordered and unordered lists.
 */
export declare class ListTransformer implements MarkdownTransformer {
    getPriority(): number;
    canTransform(elements: TextElement[]): boolean;
    transform(elements: TextElement[], _allElements: TextElement[]): MarkdownNode[];
    /**
     * Checks if elements form a list pattern.
     */
    private isListPattern;
    /**
     * Checks if the list is ordered (numbered).
     */
    private isOrderedList;
    /**
     * Checks if text has a list marker.
     */
    private hasListMarker;
    /**
     * Strips the list marker from text.
     */
    private stripListMarker;
}
//# sourceMappingURL=ListTransformer.d.ts.map