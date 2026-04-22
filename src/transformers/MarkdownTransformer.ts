import type { TextElement } from '../models/TextElement';
import type { Page } from '../models/Page';
import type { MarkdownNode } from '../models/MarkdownNode';
import type { Page } from '../models/Page';

export interface TransformationResult {
  readonly nodes: MarkdownNode[];
  readonly consumedElements: TextElement[];
  readonly positions?: number[]; // Y coordinate for each node
}

/**
 * Interface for transformers that convert TextElement arrays to MarkdownNode arrays.
 * Follows the Strategy pattern - each transformer handles a specific type of content.
 */
export interface MarkdownTransformer {
  /**
   * Transforms an array of TextElement into MarkdownNode array.
   * @param elements The text elements to transform (those not yet consumed)
   * @param page The full page context
   * @returns Transformation result including nodes and consumed elements
   */
  transform(elements: TextElement[], page: Page): TransformationResult;

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
