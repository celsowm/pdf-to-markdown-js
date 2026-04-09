import { createParagraphNode, createTextNode } from '../models/MarkdownNode';
/**
 * Transformer that handles regular paragraphs.
 * This is the fallback transformer for text that doesn't match other patterns.
 */
export class ParagraphTransformer {
    getPriority() {
        return 10; // Lowest priority - fallback transformer
    }
    canTransform(_elements) {
        // Always can transform - this is the fallback
        return true;
    }
    transform(elements, _allElements) {
        if (elements.length === 0) {
            return [];
        }
        const nodes = [];
        const paragraphNode = createParagraphNode([]);
        for (const element of elements) {
            const textNode = createTextNode(element.text.trim());
            paragraphNode.children.push(textNode);
        }
        nodes.push(paragraphNode);
        return nodes;
    }
}
