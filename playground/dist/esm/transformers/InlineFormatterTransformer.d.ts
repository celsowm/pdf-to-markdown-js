import { TextElement } from '../models/TextElement';
import { MarkdownNode } from '../models/MarkdownNode';
import { MarkdownTransformer } from './MarkdownTransformer';
/**
 * Transformer that detects and applies inline formatting (bold, italic, strike).
 * Analyzes font properties to determine the appropriate markdown formatting.
 */
export declare class InlineFormatterTransformer implements MarkdownTransformer {
    getPriority(): number;
    canTransform(elements: TextElement[]): boolean;
    transform(elements: TextElement[], _allElements: TextElement[]): MarkdownNode[];
    /**
     * Detects inline formatting based on text element properties.
     */
    private detectFormatting;
    /**
     * Checks if the text element has strike-through formatting.
     */
    private isStrikeThrough;
}
//# sourceMappingURL=InlineFormatterTransformer.d.ts.map