import { TextElement } from '../models/TextElement';
import { MarkdownNode } from '../models/MarkdownNode';

/**
 * Interface for transformers that convert TextElement arrays to MarkdownNode arrays.
 * Follows the Strategy pattern - each transformer handles a specific type of content.
 */
export interface MarkdownTransformer {
  /**
   * Transforms an array of TextElement into MarkdownNode array.
   * @param elements The text elements to transform
   * @param allElements All text elements on the page (for context)
   * @returns Array of Markdown nodes
   */
  transform(elements: TextElement[], allElements: TextElement[]): MarkdownNode[];

  /**
   * Checks if this transformer can handle the given elements.
   * @param elements The text elements to check
   * @returns True if this transformer can handle these elements
   */
  canTransform(elements: TextElement[]): boolean;

  /**
   * Returns the priority of this transformer (higher = processed first).
   */
  getPriority(): number;
}
