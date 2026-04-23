import type { Page } from '../models/Page';
import type { TextElement } from '../models/TextElement';
import type { MarkdownTransformer } from '../transformers/MarkdownTransformer';
import type { MarkdownNode } from '../models/MarkdownNode';
import { createDocumentNode } from '../models/MarkdownNode';
import type { PdfDocument } from '../models/PdfDocument';

interface NodeWithPosition {
  node: MarkdownNode;
  y: number;
}

/**
 * Orchestrates the conversion of extracted PDF elements to Markdown nodes.
 * Following SRP: handles only the transformation orchestration.
 */
export class TransformationOrchestrator {
  private readonly transformers: MarkdownTransformer[];

  constructor(transformers: MarkdownTransformer[]) {
    this.transformers = [...transformers].sort((a, b) => b.getPriority() - a.getPriority());
  }

  /**
   * Converts a PdfDocument to a root MarkdownNode.
   */
  async orchestrate(document: PdfDocument): Promise<MarkdownNode> {
    const allNodes: MarkdownNode[] = [];

    for (const page of document.pages) {
      const pageNodes = await this.transformPage(page);
      allNodes.push(...pageNodes);
    }

    return createDocumentNode(allNodes);
  }

  /**
   * Transforms a single page's elements into Markdown nodes.
   */
  private async transformPage(page: Page): Promise<MarkdownNode[]> {
    const elements = page.textElements;
    if (elements.length === 0) {
      return [];
    }

    const nodesWithPosition: NodeWithPosition[] = [];
    const usedElements = new Set<TextElement>();

    // Try each transformer in priority order
    for (const transformer of this.transformers) {
      const unusedElements = elements.filter((el) => !usedElements.has(el));

      if (unusedElements.length === 0) {
        break;
      }

      if (transformer.canTransform([...unusedElements])) {
        const { nodes: newNodes, consumedElements, positions } = await transformer.transform(
          [...unusedElements],
          page,
        );
        
        if (newNodes.length > 0) {
           for (let i = 0; i < newNodes.length; i++) {
             const node = newNodes[i];
             const y = (positions && positions[i] !== undefined) 
               ? positions[i] 
               : (consumedElements.length > 0 ? consumedElements.reduce((sum, el) => sum + el.y, 0) / consumedElements.length : 0);
             
             nodesWithPosition.push({ node, y });
           }
        }
        
        consumedElements.forEach((el) => usedElements.add(el));
      }
    }

    // Sort nodes by Y position (descending, as PDF Y is typically bottom-up)
    nodesWithPosition.sort((a, b) => b.y - a.y);

    return nodesWithPosition.map(n => n.node);
  }
}
