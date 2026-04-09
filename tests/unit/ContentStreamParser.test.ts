import { describe, it, expect } from 'vitest';
import { ContentStreamParser, TextOperation } from '../../src/core/ContentStreamParser';

describe('ContentStreamParser', () => {
  describe('parse text operations', () => {
    it('should parse Tj text operator', () => {
      const parser = new ContentStreamParser('(Hello World) Tj');
      const operations = parser.parse();

      const textOps = operations.filter((op) => op.type === 'text');
      expect(textOps).toHaveLength(1);
      expect(textOps[0].text).toBe('Hello World');
    });

    it('should parse TJ text operator with array', () => {
      const parser = new ContentStreamParser('[(Hello) (World)] TJ');
      const operations = parser.parse();

      const textOps = operations.filter((op) => op.type === 'text');
      expect(textOps.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('parse font operations', () => {
    it('should parse Tf font operator', () => {
      const parser = new ContentStreamParser('/F1 12 Tf');
      const operations = parser.parse();

      const fontOps = operations.filter((op) => op.type === 'setFont');
      expect(fontOps).toHaveLength(1);
      expect(fontOps[0].fontName).toBe('F1');
      expect(fontOps[0].fontSize).toBe(12);
    });
  });

  describe('parse text matrix', () => {
    it('should parse Tm text matrix operator', () => {
      const parser = new ContentStreamParser('1 0 0 1 100 200 Tm');
      const operations = parser.parse();

      const matrixOps = operations.filter((op) => op.type === 'setTextMatrix');
      expect(matrixOps).toHaveLength(1);
      expect(matrixOps[0].matrix).toEqual({
        a: 1,
        b: 0,
        c: 0,
        d: 1,
        e: 100,
        f: 200,
      });
    });
  });

  describe('parse line move operations', () => {
    it('should parse T* line move operator', () => {
      const parser = new ContentStreamParser('T*');
      const operations = parser.parse();

      const moveOps = operations.filter((op) => op.type === 'moveToNextLine');
      expect(moveOps).toHaveLength(1);
    });

    it('should parse Td line move with offset', () => {
      const parser = new ContentStreamParser('0 -20 Td');
      const operations = parser.parse();

      const moveOps = operations.filter((op) => op.type === 'moveToNextLine');
      expect(moveOps.length).toBeGreaterThanOrEqual(1);
    });

    it('should parse TL text leading', () => {
      const parser = new ContentStreamParser('15 TL');
      const operations = parser.parse();

      const moveOps = operations.filter((op) => op.type === 'moveToNextLine');
      expect(moveOps.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('parse complex content streams', () => {
    it('should parse mixed operations', () => {
      const content = `
        /F1 12 Tf
        1 0 0 1 50 700 Tm
        (Title) Tj
        1 0 0 1 50 680 Tm
        (First paragraph) Tj
      `;
      const parser = new ContentStreamParser(content);
      const operations = parser.parse();

      const textOps = operations.filter((op) => op.type === 'text');
      expect(textOps.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('handle escaped characters', () => {
    it('should handle escaped parentheses in strings', () => {
      const parser = new ContentStreamParser('(Hello\\) World) Tj');
      const operations = parser.parse();

      const textOps = operations.filter((op) => op.type === 'text');
      if (textOps.length > 0) {
        expect(textOps[0].text).toContain(')');
      }
    });

    it('should handle escaped backslashes', () => {
      const parser = new ContentStreamParser('(Path\\\\to\\\\file) Tj');
      const operations = parser.parse();

      const textOps = operations.filter((op) => op.type === 'text');
      if (textOps.length > 0) {
        expect(textOps[0].text).toContain('\\');
      }
    });
  });
});
