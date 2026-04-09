import { describe, it, expect } from 'vitest';
import { MarkdownWriter } from '../../src/utils/MarkdownWriter';
import {
  createTextNode,
  createHeadingNode,
  createParagraphNode,
  createDocumentNode,
  DEFAULT_FORMATTING,
} from '../../src/models/MarkdownNode';

describe('MarkdownWriter', () => {
  const writer = new MarkdownWriter();

  describe('write text nodes', () => {
    it('should write plain text without formatting', () => {
      const node = createTextNode('Hello World');
      const result = writer.write(node);

      expect(result).toBe('Hello World');
    });

    it('should render bold text with ** markers', () => {
      const node = createTextNode('Bold Text', { ...DEFAULT_FORMATTING, bold: true });
      const result = writer.write(node);

      expect(result).toBe('**Bold Text**');
    });

    it('should render italic text with * markers', () => {
      const node = createTextNode('Italic Text', { ...DEFAULT_FORMATTING, italic: true });
      const result = writer.write(node);

      expect(result).toBe('*Italic Text*');
    });

    it('should render strikethrough text with ~~ markers', () => {
      const node = createTextNode('Strike Text', { ...DEFAULT_FORMATTING, strike: true });
      const result = writer.write(node);

      expect(result).toBe('~~Strike Text~~');
    });

    it('should render bold and italic text together', () => {
      const node = createTextNode('Bold Italic', {
        ...DEFAULT_FORMATTING,
        bold: true,
        italic: true,
      });
      const result = writer.write(node);

      expect(result).toBe('***Bold Italic***');
    });

    it('should render bold, italic, and strike together', () => {
      const node = createTextNode('All Formats', {
        ...DEFAULT_FORMATTING,
        bold: true,
        italic: true,
        strike: true,
      });
      const result = writer.write(node);

      expect(result).toBe('~~***All Formats***~~');
    });

    it('should render code with backticks', () => {
      const node = createTextNode('code', { ...DEFAULT_FORMATTING, code: true });
      const result = writer.write(node);

      expect(result).toBe('`code`');
    });
  });

  describe('write heading nodes', () => {
    it('should render h1 with #', () => {
      const node = createHeadingNode(1, 'Title');
      const result = writer.write(node);

      expect(result).toBe('# Title\n\n');
    });

    it('should render h2 with ##', () => {
      const node = createHeadingNode(2, 'Subtitle');
      const result = writer.write(node);

      expect(result).toBe('## Subtitle\n\n');
    });

    it('should render h3 with ###', () => {
      const node = createHeadingNode(3, 'Section');
      const result = writer.write(node);

      expect(result).toBe('### Section\n\n');
    });
  });

  describe('write paragraph nodes', () => {
    it('should render paragraph with trailing newlines', () => {
      const node = createParagraphNode([createTextNode('A paragraph')]);
      const result = writer.write(node);

      expect(result).toBe('A paragraph\n\n');
    });

    it('should render paragraph with mixed formatting', () => {
      const normalText = createTextNode('Normal ');
      const boldText = createTextNode('bold', { ...DEFAULT_FORMATTING, bold: true });
      const moreText = createTextNode(' text');

      const node = createParagraphNode([normalText, boldText, moreText]);
      const result = writer.write(node);

      // Text nodes are joined with spaces
      expect(result).toBe('Normal  **bold**  text\n\n');
    });
  });

  describe('write complete document', () => {
    it('should render a simple document with headings and paragraphs', () => {
      const doc = createDocumentNode([
        createHeadingNode(1, 'Title'),
        createParagraphNode([createTextNode('First paragraph')]),
        createHeadingNode(2, 'Section'),
        createParagraphNode([createTextNode('Second paragraph')]),
      ]);

      const result = writer.write(doc);

      expect(result).toContain('# Title');
      expect(result).toContain('First paragraph');
      expect(result).toContain('## Section');
      expect(result).toContain('Second paragraph');
    });
  });
});
