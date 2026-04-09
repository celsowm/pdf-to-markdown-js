import { describe, it, expect } from 'vitest';
import { ObjectParser, PdfObject } from '../../src/core/ObjectParser';

describe('ObjectParser', () => {
  describe('parse numbers', () => {
    it('should parse integer numbers', () => {
      const result = ObjectParser.parseContent('42');

      expect(result.type).toBe('number');
      expect((result as any).value).toBe(42);
    });

    it('should parse real numbers', () => {
      const result = ObjectParser.parseContent('3.14');

      expect(result.type).toBe('number');
      expect((result as any).value).toBeCloseTo(3.14);
    });
  });

  describe('parse strings', () => {
    it('should parse parenthesized strings', () => {
      const result = ObjectParser.parseContent('(Hello World)');

      expect(result.type).toBe('string');
      expect((result as any).value).toBe('Hello World');
    });
  });

  describe('parse names', () => {
    it('should parse names', () => {
      const result = ObjectParser.parseContent('/Font1');

      expect(result.type).toBe('name');
      expect((result as any).value).toBe('Font1');
    });
  });

  describe('parse keywords', () => {
    it('should parse null keyword', () => {
      const result = ObjectParser.parseContent('null');

      expect(result.type).toBe('null');
    });

    it('should parse true keyword', () => {
      const result = ObjectParser.parseContent('true');

      expect(result.type).toBe('boolean');
      expect((result as any).value).toBe(true);
    });

    it('should parse false keyword', () => {
      const result = ObjectParser.parseContent('false');

      expect(result.type).toBe('boolean');
      expect((result as any).value).toBe(false);
    });
  });

  describe('parse arrays', () => {
    it('should parse simple arrays', () => {
      const result = ObjectParser.parseContent('[1 2 3]');

      expect(result.type).toBe('array');
      const elements = (result as any).elements;
      expect(elements).toHaveLength(3);
      expect(elements[0].type).toBe('number');
      expect(elements[0].value).toBe(1);
    });

    it('should parse arrays with mixed types', () => {
      const result = ObjectParser.parseContent('[1 /Name (String)]');

      expect(result.type).toBe('array');
      const elements = (result as any).elements;
      expect(elements).toHaveLength(3);
      expect(elements[0].type).toBe('number');
      expect(elements[1].type).toBe('name');
      expect(elements[2].type).toBe('string');
    });
  });

  describe('parse dictionaries', () => {
    it('should parse simple dictionaries', () => {
      const result = ObjectParser.parseContent('<< /Type /Page >>');

      expect(result.type).toBe('dictionary');
      const entries = (result as any).entries;
      expect(entries.has('Type')).toBe(true);
      expect(entries.get('Type').type).toBe('name');
      expect(entries.get('Type').value).toBe('Page');
    });

    it('should parse dictionaries with multiple entries', () => {
      const result = ObjectParser.parseContent('<< /Type /Page /Count 1 >>');

      expect(result.type).toBe('dictionary');
      const entries = (result as any).entries;
      expect(entries.has('Type')).toBe(true);
      expect(entries.has('Count')).toBe(true);
      expect(entries.get('Count').type).toBe('number');
      expect(entries.get('Count').value).toBe(1);
    });
  });

  describe('parse indirect references', () => {
    it('should parse indirect references', () => {
      const result = ObjectParser.parseContent('5 0 R');

      expect(result.type).toBe('reference');
      expect((result as any).objNum).toBe(5);
      expect((result as any).genNum).toBe(0);
    });
  });

  describe('parse complex structures', () => {
    it('should parse nested structures', () => {
      const content = '<< /Kids [1 0 R 2 0 R] /Count 2 >>';
      const result = ObjectParser.parseContent(content);

      expect(result.type).toBe('dictionary');
      const entries = (result as any).entries;
      expect(entries.has('Kids')).toBe(true);
      expect(entries.get('Kids').type).toBe('array');
      expect(entries.get('Kids').elements).toHaveLength(2);
    });
  });
});
