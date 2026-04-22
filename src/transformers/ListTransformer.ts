import type { TextElement } from '../models/TextElement';
import type { Page } from '../models/Page';
import type { MarkdownNode } from '../models/MarkdownNode';
import { createListNode, createTextNode } from '../models/MarkdownNode';
import type { MarkdownTransformer, TransformationResult } from './MarkdownTransformer';

/**
 * Common list markers.
 */
const BULLET_MARKERS = ['•', '●', '○', '▪', '▫', '◦', '∙', '-'];
const NUMBERED_PATTERN = /^\d+[.)]\s/;

/**
 * Transformer that detects ordered and unordered lists.
 */
export class ListTransformer implements MarkdownTransformer {
  getPriority(): number {
    return 90; // High priority, but after headings
  }

  canTransform(elements: TextElement[]): boolean {
    if (elements.length < 2) {
      return false;
    }

    // Check if elements form a list pattern
    return this.isListPattern(elements);
  }

  transform(elements: TextElement[], page: Page): TransformationResult {
    const nodes: MarkdownNode[] = [];
    const isOrdered = this.isOrderedList(elements);
    const listNode = createListNode(isOrdered);

    for (const element of elements) {
      const text = this.stripListMarker(element.text);
      const textNode = createTextNode(text.trim());
      listNode.children.push(textNode);
    }

    nodes.push(listNode);
    return { nodes, consumedElements: elements };
  }

  /**
   * Checks if elements form a list pattern.
   */
  private isListPattern(elements: TextElement[]): boolean {
    let listCount = 0;

    for (const element of elements) {
      const trimmed = element.text.trim();
      if (this.hasListMarker(trimmed)) {
        listCount++;
      }
    }

    // If majority of elements have list markers, it's a list
    return listCount >= Math.ceil(elements.length * 0.6);
  }

  /**
   * Checks if the list is ordered (numbered).
   */
  private isOrderedList(elements: TextElement[]): boolean {
    let orderedCount = 0;

    for (const element of elements) {
      const trimmed = element.text.trim();
      if (NUMBERED_PATTERN.test(trimmed)) {
        orderedCount++;
      }
    }

    return orderedCount > elements.length / 2;
  }

  /**
   * Checks if text has a list marker.
   */
  private hasListMarker(text: string): boolean {
    const trimmed = text.trim();

    // Check for bullet markers
    if (BULLET_MARKERS.some((marker) => trimmed.startsWith(marker))) {
      return true;
    }

    // Check for numbered markers
    if (NUMBERED_PATTERN.test(trimmed)) {
      return true;
    }

    // Check for dash marker (common in PDFs)
    if (trimmed.startsWith('- ') && trimmed.length > 2) {
      return true;
    }

    return false;
  }

  /**
   * Strips the list marker from text.
   */
  private stripListMarker(text: string): string {
    const trimmed = text.trim();

    // Remove numbered markers (e.g., "1. ", "2) ")
    const numberedMatch = trimmed.match(NUMBERED_PATTERN);
    if (numberedMatch) {
      return trimmed.substring(numberedMatch[0].length);
    }

    // Remove bullet markers
    for (const marker of BULLET_MARKERS) {
      if (trimmed.startsWith(marker)) {
        return trimmed.substring(marker.length).trim();
      }
    }

    // Remove dash marker
    if (trimmed.startsWith('- ')) {
      return trimmed.substring(2).trim();
    }

    return trimmed;
  }
}
