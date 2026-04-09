import { TextElement } from '../models/TextElement';
import { MarkdownNode } from '../models/MarkdownNode';
import { MarkdownTransformer } from './MarkdownTransformer';
/**
 * Transformer that handles regular paragraphs.
 * This is the fallback transformer for text that doesn't match other patterns.
 */
export declare class ParagraphTransformer implements MarkdownTransformer {
    getPriority(): number;
    canTransform(_elements: TextElement[]): boolean;
    transform(elements: TextElement[], _allElements: TextElement[]): MarkdownNode[];
}
//# sourceMappingURL=ParagraphTransformer.d.ts.map