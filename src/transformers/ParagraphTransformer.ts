import type { TextElement } from '../models/TextElement';
import type { MarkdownNode } from '../models/MarkdownNode';
import { createParagraphNode, createTextNode } from '../models/MarkdownNode';
import type { MarkdownTransformer, TransformationResult } from './MarkdownTransformer';

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

  transform(elements: TextElement[], _allElements: TextElement[]): TransformationResult {
    if (elements.length === 0) {
      return { nodes: [], consumedElements: [] };
    }

    const nodes: MarkdownNode[] = [];
    const positions: number[] = [];
    
    // Sort elements by position (top to bottom)
    const sortedElements = [...elements].sort((a, b) => {
        const yDiff = Math.abs(a.y - b.y);
        if (yDiff > 5) return b.y - a.y;
        return a.x - b.x;
    });

    const paragraphGroups = this.partitionIntoParagraphs(sortedElements);

    for (const group of paragraphGroups) {
      const paragraphNode = createParagraphNode([]);
      for (const element of group) {
        const textNode = createTextNode(element.text.trim());
        paragraphNode.children.push(textNode);
      }
      nodes.push(paragraphNode);
      
      const avgY = group.reduce((sum, el) => sum + el.y, 0) / group.length;
      positions.push(avgY);
    }

    return { nodes, consumedElements: elements, positions };
  }

  /**
   * Partitions elements into multiple paragraphs based on vertical gaps.
   */
  private partitionIntoParagraphs(elements: TextElement[]): TextElement[][] {
    if (elements.length === 0) return [];

    const groups: TextElement[][] = [];
    let currentGroup: TextElement[] = [elements[0]];

    for (let i = 1; i < elements.length; i++) {
      const prev = elements[i - 1];
      const curr = elements[i];
      
      const yDiff = Math.abs(prev.y - curr.y);
      
      // If gap is large, start a new paragraph
      if (yDiff > 20) {
        groups.push(currentGroup);
        currentGroup = [curr];
      } else {
        currentGroup.push(curr);
      }
    }

    groups.push(currentGroup);
    return groups;
  }
}
