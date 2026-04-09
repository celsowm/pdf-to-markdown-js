import { TextElement } from '../models/TextElement';
import {
  MarkdownNode,
  createTextNode,
  InlineFormatting,
} from '../models/MarkdownNode';
import { MarkdownTransformer } from './MarkdownTransformer';

/**
 * Transformer that detects and applies inline formatting (bold, italic, strike).
 * Analyzes font properties to determine the appropriate markdown formatting.
 */
export class InlineFormatterTransformer implements MarkdownTransformer {
  getPriority(): number {
    return 50; // Medium priority - applies to individual text elements
  }

  canTransform(elements: TextElement[]): boolean {
    // Can transform any non-empty text elements
    return elements.length > 0;
  }

  transform(
    elements: TextElement[],
    _allElements: TextElement[]
  ): MarkdownNode[] {
    const nodes: MarkdownNode[] = [];

    for (const element of elements) {
      const formatting = this.detectFormatting(element);
      const textNode = createTextNode(element.text.trim(), formatting);
      nodes.push(textNode);
    }

    return nodes;
  }

  /**
   * Detects inline formatting based on text element properties.
   */
  private detectFormatting(element: TextElement): InlineFormatting {
    const bold = element.isBold;
    const italic = element.isItalic;
    const strike = this.isStrikeThrough(element);

    return {
      bold,
      italic,
      strike,
      code: false,
    };
  }

  /**
   * Checks if the text element has strike-through formatting.
   */
  private isStrikeThrough(element: TextElement): boolean {
    const fontName = element.fontName.toLowerCase();
    return (
      fontName.includes('strikethrough') ||
      fontName.includes('line-through') ||
      fontName.includes('strike') ||
      fontName.includes('linethrough') ||
      element.isStrike
    );
  }
}
