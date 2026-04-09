import { TextElement } from '../models/TextElement';
import { MarkdownNode } from '../models/MarkdownNode';
import { MarkdownTransformer } from './MarkdownTransformer';
/**
 * Transformer that detects headings based on font size and weight.
 */
export declare class HeadingTransformer implements MarkdownTransformer {
    getPriority(): number;
    canTransform(elements: TextElement[]): boolean;
    transform(elements: TextElement[], allElements: TextElement[]): MarkdownNode[];
    /**
     * Detects the heading level based on font size and weight.
     */
    private detectHeadingLevel;
    /**
     * Calculates the median font size from all elements.
     */
    private getMedianFontSize;
}
//# sourceMappingURL=HeadingTransformer.d.ts.map