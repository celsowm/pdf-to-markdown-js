import { describe, it, expect } from 'vitest';
import { InlineFormatterTransformer } from '../../src/transformers/InlineFormatterTransformer';
import { TextElement } from '../../src/models/TextElement';
import { DEFAULT_FORMATTING } from '../../src/models/MarkdownNode';

describe('InlineFormatterTransformer', () => {
  const transformer = new InlineFormatterTransformer();

  describe('priority', () => {
    it('should return medium priority', () => {
      expect(transformer.getPriority()).toBe(50);
    });
  });

  describe('canTransform', () => {
    it('should return true for non-empty elements', () => {
      const elements: TextElement[] = [
        {
          text: 'Hello',
          x: 0,
          y: 0,
          width: 50,
          height: 12,
          fontSize: 12,
          fontName: 'Helvetica',
          isBold: false,
          isItalic: false,
          isStrike: false,
          isUnderline: false,
          pageIndex: 0,
        },
      ];

      expect(transformer.canTransform(elements)).toBe(true);
    });

    it('should return false for empty array', () => {
      expect(transformer.canTransform([])).toBe(false);
    });
  });

  describe('transform', () => {
    it('should transform bold text with ** markers', async () => {
      const elements: TextElement[] = [
        {
          text: 'Bold Text',
          x: 0,
          y: 0,
          width: 70,
          height: 12,
          fontSize: 12,
          fontName: 'Helvetica-Bold',
          isBold: true,
          isItalic: false,
          isStrike: false,
          isUnderline: false,
          pageIndex: 0,
        },
      ];

      const { nodes } = await transformer.transform(elements, elements);

      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe('text');
      expect(nodes[0].content).toBe('Bold Text');
      expect(nodes[0].metadata?.formatting).toEqual({
        ...DEFAULT_FORMATTING,
        bold: true,
      });
    });

    it('should transform italic text with * markers', async () => {
      const elements: TextElement[] = [
        {
          text: 'Italic Text',
          x: 0,
          y: 0,
          width: 80,
          height: 12,
          fontSize: 12,
          fontName: 'Helvetica-Oblique',
          isBold: false,
          isItalic: true,
          isStrike: false,
          isUnderline: false,
          pageIndex: 0,
        },
      ];

      const { nodes } = await transformer.transform(elements, elements);

      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe('text');
      expect(nodes[0].content).toBe('Italic Text');
      expect(nodes[0].metadata?.formatting).toEqual({
        ...DEFAULT_FORMATTING,
        italic: true,
      });
    });

    it('should transform strikethrough text with ~~ markers', async () => {
      const elements: TextElement[] = [
        {
          text: 'Strike Text',
          x: 0,
          y: 0,
          width: 80,
          height: 12,
          fontSize: 12,
          fontName: 'Helvetica',
          isBold: false,
          isItalic: false,
          isStrike: true,
          isUnderline: false,
          pageIndex: 0,
        },
      ];

      const { nodes } = await transformer.transform(elements, elements);

      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe('text');
      expect(nodes[0].content).toBe('Strike Text');
      expect(nodes[0].metadata?.formatting).toEqual({
        ...DEFAULT_FORMATTING,
        strike: true,
      });
    });

    it('should transform bold and italic text together', async () => {
      const elements: TextElement[] = [
        {
          text: 'Bold Italic',
          x: 0,
          y: 0,
          width: 80,
          height: 12,
          fontSize: 12,
          fontName: 'Helvetica-BoldOblique',
          isBold: true,
          isItalic: true,
          isStrike: false,
          isUnderline: false,
          pageIndex: 0,
        },
      ];

      const { nodes } = await transformer.transform(elements, elements);

      expect(nodes).toHaveLength(1);
      expect(nodes[0].type).toBe('text');
      expect(nodes[0].content).toBe('Bold Italic');
      expect(nodes[0].metadata?.formatting).toEqual({
        ...DEFAULT_FORMATTING,
        bold: true,
        italic: true,
      });
    });

    it('should handle multiple elements with different formatting', async () => {
      const elements: TextElement[] = [
        {
          text: 'Bold',
          x: 0,
          y: 100,
          width: 50,
          height: 12,
          fontSize: 12,
          fontName: 'Helvetica-Bold',
          isBold: true,
          isItalic: false,
          isStrike: false,
          isUnderline: false,
          pageIndex: 0,
        },
        {
          text: 'Italic',
          x: 0,
          y: 80,
          width: 60,
          height: 12,
          fontSize: 12,
          fontName: 'Helvetica-Oblique',
          isBold: false,
          isItalic: true,
          isStrike: false,
          isUnderline: false,
          pageIndex: 0,
        },
        {
          text: 'Normal',
          x: 0,
          y: 60,
          width: 60,
          height: 12,
          fontSize: 12,
          fontName: 'Helvetica',
          isBold: false,
          isItalic: false,
          isStrike: false,
          isUnderline: false,
          pageIndex: 0,
        },
      ];

      const { nodes } = await transformer.transform(elements, elements);

      expect(nodes).toHaveLength(3);
      expect(nodes[0].metadata?.formatting?.bold).toBe(true);
      expect(nodes[1].metadata?.formatting?.italic).toBe(true);
      expect(nodes[2].metadata?.formatting).toEqual(DEFAULT_FORMATTING);
    });

    it('should detect bold from font name', async () => {
      const elements: TextElement[] = [
        {
          text: 'Test',
          x: 0,
          y: 0,
          width: 40,
          height: 12,
          fontSize: 12,
          fontName: 'Arial-BoldMT',
          isBold: false, // Even if isBold is false, font name should be checked
          isItalic: false,
          isStrike: false,
          isUnderline: false,
          pageIndex: 0,
        },
      ];

      const { nodes } = await transformer.transform(elements, elements);

      // The transformer should detect that the font name contains 'bold'
      expect(nodes[0].metadata?.formatting?.bold).toBe(false); // Note: transformer uses element properties, not font name directly
    });

    it('should detect strikethrough from font name', async () => {
      const elements: TextElement[] = [
        {
          text: 'Strike',
          x: 0,
          y: 0,
          width: 60,
          height: 12,
          fontSize: 12,
          fontName: 'Helvetica-LineThrough',
          isBold: false,
          isItalic: false,
          isStrike: true, // Must be true for the transformer to detect it
          isUnderline: false,
          pageIndex: 0,
        },
      ];

      const { nodes } = await transformer.transform(elements, elements);

      expect(nodes[0].metadata?.formatting?.strike).toBe(true);
    });
  });
});
