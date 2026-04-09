import { describe, it, expect } from 'vitest';
import { Tokenizer, TokenType } from '../../src/core/Tokenizer';

describe('Tokenizer', () => {
  describe('tokenize simple numbers', () => {
    it('should tokenize integer numbers', () => {
      const tokenizer = new Tokenizer('123');
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe(123);
    });

    it('should tokenize real numbers', () => {
      const tokenizer = new Tokenizer('123.45');
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe(123.45);
    });

    it('should tokenize negative numbers', () => {
      const tokenizer = new Tokenizer('-42');
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe(-42);
    });
  });

  describe('tokenize strings', () => {
    it('should tokenize parenthesized strings', () => {
      const tokenizer = new Tokenizer('(Hello World)');
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].value).toBe('Hello World');
    });

    it('should handle escaped characters', () => {
      const tokenizer = new Tokenizer('(Hello\\nWorld)');
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].value).toBe('Hello\nWorld');
    });
  });

  describe('tokenize hex strings', () => {
    it('should tokenize hexadecimal strings', () => {
      const tokenizer = new Tokenizer('<48656C6C6F>');
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.HEX_STRING);
      expect(tokens[0].value).toBe('48656C6C6F');
    });
  });

  describe('tokenize names', () => {
    it('should tokenize names starting with /', () => {
      const tokenizer = new Tokenizer('/Font1');
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.NAME);
      expect(tokens[0].value).toBe('Font1');
    });
  });

  describe('tokenize dictionaries', () => {
    it('should tokenize dictionary start and end', () => {
      const tokenizer = new Tokenizer('<< >>');
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TokenType.DICT_START);
      expect(tokens[1].type).toBe(TokenType.DICT_END);
    });
  });

  describe('tokenize arrays', () => {
    it('should tokenize array start and end', () => {
      const tokenizer = new Tokenizer('[ ]');
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TokenType.ARRAY_START);
      expect(tokens[1].type).toBe(TokenType.ARRAY_END);
    });
  });

  describe('tokenize keywords', () => {
    it('should tokenize stream keyword', () => {
      const tokenizer = new Tokenizer('stream');
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.STREAM);
    });

    it('should tokenize endstream keyword', () => {
      const tokenizer = new Tokenizer('endstream');
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.ENDSTREAM);
    });

    it('should tokenize obj keyword', () => {
      const tokenizer = new Tokenizer('obj');
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.OBJ);
    });

    it('should tokenize endobj keyword', () => {
      const tokenizer = new Tokenizer('endobj');
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.ENDLOBJ);
    });

    it('should tokenize null keyword', () => {
      const tokenizer = new Tokenizer('null');
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.KEYWORD);
      expect(tokens[0].value).toBe('null');
    });

    it('should tokenize true keyword', () => {
      const tokenizer = new Tokenizer('true');
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.KEYWORD);
      expect(tokens[0].value).toBe('true');
    });

    it('should tokenize false keyword', () => {
      const tokenizer = new Tokenizer('false');
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.KEYWORD);
      expect(tokens[0].value).toBe('false');
    });
  });

  describe('tokenize comments', () => {
    it('should tokenize comments starting with %', () => {
      const tokenizer = new Tokenizer('% This is a comment');
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.COMMENT);
      expect(tokens[0].value).toBe(' This is a comment');
    });
  });

  describe('tokenize mixed content', () => {
    it('should tokenize mixed PDF content', () => {
      const tokenizer = new Tokenizer('1 0 obj << /Type /Page >> endobj');
      const tokens = tokenizer.tokenize();

      expect(tokens.length).toBeGreaterThan(0);
      
      const numbers = tokens.filter((t) => t.type === TokenType.NUMBER);
      expect(numbers).toHaveLength(2);
      
      const names = tokens.filter((t) => t.type === TokenType.NAME);
      expect(names).toHaveLength(2);
      
      const dictTokens = tokens.filter(
        (t) => t.type === TokenType.DICT_START || t.type === TokenType.DICT_END
      );
      expect(dictTokens).toHaveLength(2);
    });
  });
});
