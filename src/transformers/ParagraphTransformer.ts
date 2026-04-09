import { TextElement } from '../models/TextElement';
import { MarkdownNode, createParagraphNode, createTextNode } from '../models/MarkdownNode';
import { MarkdownTransformer } from './MarkdownTransformer';

/**
 * Transformer that handles regular paragraphs.
 * This is the fallback transformer for text that doesn't match other patterns.
 */
export class ParagraphTransformer implements MarkdownTransformer {
  getPriority(): number {
    return 10; // Lowest priority - fallback transformer
  }

  canTransform(_elements: TextElement[]): boolean {
    // Always can transform - this is the fallback
    return true;
  }

  transform(elements: TextElement[], _allElements: TextElement[]): MarkdownNode[] {
    if (elements.length === 0) {
      return [];
    }

    const nodes: MarkdownNode[] = [];
    const paragraphNode = createParagraphNode([]);

    for (const element of elements) {
      const textNode = createTextNode(element.text.trim());
      paragraphNode.children.push(textNode);
    }

    nodes.push(paragraphNode);
    return nodes;
  }
}
