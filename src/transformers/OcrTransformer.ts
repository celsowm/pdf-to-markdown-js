import type { TextElement } from '../models/TextElement';
import type { Page } from '../models/Page';
import { createParagraphNode, createTextNode } from '../models/MarkdownNode';
import type { MarkdownTransformer, TransformationResult } from './MarkdownTransformer';
import type { OcrProvider } from '../utils/ImageExtractor';
import { convertLatexTablesToMarkdown, cleanNougatOutput } from '../utils/OcrUtils';

/**
 * Transformer that uses an external OCR provider to extract Markdown.
 * This is useful for complex layouts, tables, or non-text PDFs.
 */
export class OcrTransformer implements MarkdownTransformer {
  private readonly provider: OcrProvider;
  private readonly useForPages: boolean;

  constructor(provider: OcrProvider, useForPages = false) {
    this.provider = provider;
    this.useForPages = useForPages;
  }

  getPriority(): number {
    // If used for pages, it should have high priority to take over the whole page
    // If only for specific regions (not yet implemented in orchestrator), lower priority
    return this.useForPages ? 150 : 5;
  }

  canTransform(_elements: TextElement[]): boolean {
    // If useForPages is true, we always want to try OCR if elements exist
    // Or even if they don't (scanned PDF)!
    return this.useForPages;
  }

  async transform(elements: TextElement[], page: Page): Promise<TransformationResult> {
    if (!this.useForPages) {
      return { nodes: [], consumedElements: [] };
    }

    try {
      // Process the whole page region
      const rawMarkdown = await this.provider.processRegion(page.pageIndex, {
        x1: 0,
        y1: 0,
        x2: page.width,
        y2: page.height,
      });

      // Clean up and convert LaTeX tables (standard for Nougat)
      let processedMarkdown = cleanNougatOutput(rawMarkdown);
      processedMarkdown = convertLatexTablesToMarkdown(processedMarkdown);

      // Convert the string result into Markdown nodes
      // For now, we wrap the whole thing in a single "raw" node or split by lines
      // Since MarkdownNode structure is simple, we'll create a paragraph with the text
      const node = createParagraphNode([createTextNode(processedMarkdown)]);

      return {
        nodes: [node],
        consumedElements: elements, // Consume all elements as we took over the page
        positions: [page.height],   // Top of the page
      };
    } catch (e) {
      console.error('OCR transformation failed', e);
      return { nodes: [], consumedElements: [] };
    }
  }
}
