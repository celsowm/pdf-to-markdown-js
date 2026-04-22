import type { TextElement } from '../models/TextElement';
import type { Page } from '../models/Page';
import type { MarkdownNode } from '../models/MarkdownNode';
import { createHeadingNode } from '../models/MarkdownNode';
import type { MarkdownTransformer, TransformationResult } from './MarkdownTransformer';

/**
 * Font size thresholds for heading levels (minimum sizes).
 */
const HEADING_THRESHOLDS = {
  h1: 22,
  h2: 18,
  h3: 16,
  h4: 14,
  h5: 13,
  h6: 12,
};

/**
 * Transformer that detects headings based on font size and weight.
 */
export class HeadingTransformer implements MarkdownTransformer {
  getPriority(): number {
    return 100; // Highest priority - headings should be detected first
  }

  canTransform(elements: TextElement[]): boolean {
    if (elements.length === 0) {
      return false;
    }

    // Check if any element has a font size that qualifies as a heading
    return elements.some((el) => el.fontSize >= HEADING_THRESHOLDS.h6 || el.isBold);
  }

  transform(elements: TextElement[], page: Page): TransformationResult {
    const nodes: MarkdownNode[] = [];
    const consumedElements: TextElement[] = [];
    const positions: number[] = [];
    const medianFontSize = this.getMedianFontSize([...page.textElements]);

    for (const element of elements) {
      const headingLevel = this.detectHeadingLevel(element, medianFontSize);

      if (headingLevel) {
        nodes.push(createHeadingNode(headingLevel, element.text.trim()));
        consumedElements.push(element);
        positions.push(element.y);
      }
    }

    return { nodes, consumedElements, positions };
  }

  /**
   * Detects the heading level based on font size and weight.
   */
  private detectHeadingLevel(
    element: TextElement,
    medianFontSize: number,
  ): 1 | 2 | 3 | 4 | 5 | 6 | null {
    const { fontSize, isBold } = element;

    // If font size is significantly larger than median, it's likely a heading
    const ratio = fontSize / medianFontSize;

    // Must be at least slightly larger than median OR bold and larger than median
    if (ratio <= 1.0 && !isBold) {
      return null;
    }

    if (fontSize >= HEADING_THRESHOLDS.h1 || (isBold && ratio > 2)) {
      return 1;
    } else if (fontSize >= HEADING_THRESHOLDS.h2 || (isBold && ratio > 1.7)) {
      return 2;
    } else if (fontSize >= HEADING_THRESHOLDS.h3 || (isBold && ratio > 1.4)) {
      return 3;
    } else if (fontSize >= HEADING_THRESHOLDS.h4 || (isBold && ratio > 1.2)) {
      return 4;
    } else if (fontSize >= HEADING_THRESHOLDS.h5 || (isBold && ratio > 1.1)) {
      return 5;
    } else if (fontSize >= HEADING_THRESHOLDS.h6 || (isBold && ratio > 1.05)) {
      return 6;
    }

    return null;
  }

  /**
   * Calculates the median font size from all elements.
   */
  private getMedianFontSize(elements: TextElement[]): number {
    if (elements.length === 0) {
      return 12; // Default
    }

    const sorted = [...elements].sort((a, b) => a.fontSize - b.fontSize);
    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1].fontSize + sorted[middle].fontSize) / 2;
    }

    return sorted[middle].fontSize;
  }
}
