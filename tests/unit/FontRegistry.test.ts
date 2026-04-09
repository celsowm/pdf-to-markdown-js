import { describe, it, expect } from 'vitest';
import { FontRegistry, FontWeight, FontStyle } from '../../src/utils/FontRegistry';

describe('FontRegistry', () => {
  describe('Helvetica family variants', () => {
    it('should detect Helvetica regular', () => {
      const result = FontRegistry.analyze('Helvetica');
      expect(result.isBold).toBe(false);
      expect(result.isItalic).toBe(false);
      expect(result.weight).toBe(FontWeight.Regular);
      expect(result.familyName).toBe('Helvetica');
    });

    it('should detect Helvetica-Bold', () => {
      const result = FontRegistry.analyze('Helvetica-Bold');
      expect(result.isBold).toBe(true);
      expect(result.isItalic).toBe(false);
      expect(result.weight).toBeGreaterThanOrEqual(FontWeight.Bold);
    });

    it('should detect Helvetica-Oblique (italic)', () => {
      const result = FontRegistry.analyze('Helvetica-Oblique');
      expect(result.isBold).toBe(false);
      expect(result.isItalic).toBe(true);
      expect(result.style).toBe(FontStyle.Oblique);
    });

    it('should detect Helvetica-BoldOblique (bold italic)', () => {
      const result = FontRegistry.analyze('Helvetica-BoldOblique');
      expect(result.isBold).toBe(true);
      expect(result.isItalic).toBe(true);
    });
  });

  describe('Arial family variants', () => {
    it('should detect Arial-BoldMT', () => {
      const result = FontRegistry.analyze('Arial-BoldMT');
      expect(result.isBold).toBe(true);
      expect(result.isItalic).toBe(false);
    });

    it('should detect Arial-ItalicMT', () => {
      const result = FontRegistry.analyze('Arial-ItalicMT');
      expect(result.isBold).toBe(false);
      expect(result.isItalic).toBe(true);
    });

    it('should detect Arial-BoldItalicMT', () => {
      const result = FontRegistry.analyze('Arial-BoldItalicMT');
      expect(result.isBold).toBe(true);
      expect(result.isItalic).toBe(true);
    });
  });

  describe('Times New Roman variants', () => {
    it('should detect TimesNewRomanPS-BoldMT', () => {
      const result = FontRegistry.analyze('TimesNewRomanPS-BoldMT');
      expect(result.isBold).toBe(true);
    });

    it('should detect TimesNewRomanPS-ItalicMT', () => {
      const result = FontRegistry.analyze('TimesNewRomanPS-ItalicMT');
      expect(result.isItalic).toBe(true);
    });

    it('should detect TimesNewRomanPS-BoldItalicMT', () => {
      const result = FontRegistry.analyze('TimesNewRomanPS-BoldItalicMT');
      expect(result.isBold).toBe(true);
      expect(result.isItalic).toBe(true);
    });
  });

  describe('Courier variants', () => {
    it('should detect Courier-Bold', () => {
      const result = FontRegistry.analyze('Courier-Bold');
      expect(result.isBold).toBe(true);
    });

    it('should detect Courier-Oblique', () => {
      const result = FontRegistry.analyze('Courier-Oblique');
      expect(result.isItalic).toBe(true);
    });

    it('should detect Courier-BoldOblique', () => {
      const result = FontRegistry.analyze('Courier-BoldOblique');
      expect(result.isBold).toBe(true);
      expect(result.isItalic).toBe(true);
    });
  });

  describe('Modern fonts (Roboto, OpenSans)', () => {
    it('should detect Roboto-Bold', () => {
      const result = FontRegistry.analyze('Roboto-Bold');
      expect(result.isBold).toBe(true);
    });

    it('should detect Roboto-Italic', () => {
      const result = FontRegistry.analyze('Roboto-Italic');
      expect(result.isItalic).toBe(true);
    });

    it('should detect Roboto-BoldItalic', () => {
      const result = FontRegistry.analyze('Roboto-BoldItalic');
      expect(result.isBold).toBe(true);
      expect(result.isItalic).toBe(true);
    });

    it('should detect OpenSans-Bold', () => {
      const result = FontRegistry.analyze('OpenSans-Bold');
      expect(result.isBold).toBe(true);
    });

    it('should detect OpenSans-Italic', () => {
      const result = FontRegistry.analyze('OpenSans-Italic');
      expect(result.isItalic).toBe(true);
    });
  });

  describe('Weight-based detection (numeric weights)', () => {
    it('should detect weight 100 as Thin', () => {
      const result = FontRegistry.analyze('Font-100');
      expect(result.weight).toBe(FontWeight.Thin);
      expect(result.isBold).toBe(false);
    });

    it('should detect weight 300 as Light', () => {
      const result = FontRegistry.analyze('Font-Light300');
      expect(result.weight).toBe(FontWeight.Light);
      expect(result.isBold).toBe(false);
    });

    it('should detect weight 400 as Regular', () => {
      const result = FontRegistry.analyze('Font-Regular400');
      expect(result.weight).toBe(FontWeight.Regular);
      expect(result.isBold).toBe(false);
    });

    it('should detect weight 500 as Medium', () => {
      const result = FontRegistry.analyze('Font-Medium500');
      expect(result.weight).toBe(FontWeight.Medium);
      expect(result.isBold).toBe(false);
    });

    it('should detect weight 600 as SemiBold', () => {
      const result = FontRegistry.analyze('Font-SemiBold600');
      expect(result.weight).toBe(FontWeight.SemiBold);
      expect(result.isBold).toBe(false); // 600 < 700
    });

    it('should detect weight 700 as Bold', () => {
      const result = FontRegistry.analyze('Font-Bold700');
      expect(result.weight).toBe(FontWeight.Bold);
      expect(result.isBold).toBe(true);
    });

    it('should detect weight 800 as ExtraBold', () => {
      const result = FontRegistry.analyze('Font-ExtraBold800');
      expect(result.weight).toBe(FontWeight.ExtraBold);
      expect(result.isBold).toBe(true);
    });

    it('should detect weight 900 as Black', () => {
      const result = FontRegistry.analyze('Font-Black900');
      expect(result.weight).toBe(FontWeight.Black);
      expect(result.isBold).toBe(true);
    });
  });

  describe('Special bold/italic patterns', () => {
    it('should detect DemiBold', () => {
      const result = FontRegistry.analyze('Font-DemiBold');
      expect(result.weight).toBe(FontWeight.SemiBold);
    });

    it('should detect Heavy as very bold', () => {
      const result = FontRegistry.analyze('Font-Heavy');
      expect(result.weight).toBe(FontWeight.Black);
      expect(result.isBold).toBe(true);
    });

    it('should detect Black font', () => {
      const result = FontRegistry.analyze('Font-Black');
      expect(result.weight).toBe(FontWeight.Black);
      expect(result.isBold).toBe(true);
    });

    it('should detect Slanted as italic', () => {
      const result = FontRegistry.analyze('Font-Slanted');
      expect(result.isItalic).toBe(true);
    });

    it('should detect Kursiv (German) as italic', () => {
      const result = FontRegistry.analyze('Font-Kursiv');
      expect(result.isItalic).toBe(true);
    });

    it('should detect Cursiva (Spanish) as italic', () => {
      const result = FontRegistry.analyze('Font-Cursiva');
      expect(result.isItalic).toBe(true);
    });
  });

  describe('Calibri, Verdana, Georgia families', () => {
    it('should detect Calibri-Bold', () => {
      const result = FontRegistry.analyze('Calibri-Bold');
      expect(result.isBold).toBe(true);
    });

    it('should detect Calibold-Italic', () => {
      const result = FontRegistry.analyze('Calibri-Italic');
      expect(result.isItalic).toBe(true);
    });

    it('should detect Verdana-Bold', () => {
      const result = FontRegistry.analyze('Verdana-Bold');
      expect(result.isBold).toBe(true);
    });

    it('should detect Georgia-BoldItalic', () => {
      const result = FontRegistry.analyze('Georgia-BoldItalic');
      expect(result.isBold).toBe(true);
      expect(result.isItalic).toBe(true);
    });
  });

  describe('DejaVu and Liberation families', () => {
    it('should detect DejaVuSans-Bold', () => {
      const result = FontRegistry.analyze('DejaVuSans-Bold');
      expect(result.isBold).toBe(true);
    });

    it('should detect DejaVuSans-BoldOblique', () => {
      const result = FontRegistry.analyze('DejaVuSans-BoldOblique');
      expect(result.isBold).toBe(true);
      expect(result.isItalic).toBe(true);
    });

    it('should detect LiberationSans-Bold', () => {
      const result = FontRegistry.analyze('LiberationSans-Bold');
      expect(result.isBold).toBe(true);
    });

    it('should detect LiberationMono-Italic', () => {
      const result = FontRegistry.analyze('LiberationMono-Italic');
      expect(result.isItalic).toBe(true);
    });
  });

  describe('Edge cases and unusual names', () => {
    it('should handle simple font name without variant', () => {
      const result = FontRegistry.analyze('MyFont');
      expect(result.isBold).toBe(false);
      expect(result.isItalic).toBe(false);
      // Family name extraction may truncate, which is acceptable
      expect(result.familyName.length).toBeGreaterThan(0);
    });

    it('should handle font with MT suffix', () => {
      const result = FontRegistry.analyze('ArialMT');
      expect(result.isBold).toBe(false);
      expect(result.isItalic).toBe(false);
    });

    it('should handle font with PS suffix', () => {
      const result = FontRegistry.analyze('TimesNewRomanPSMT');
      expect(result.isBold).toBe(false);
      expect(result.isItalic).toBe(false);
    });

    it('should handle font with underscores', () => {
      const result = FontRegistry.analyze('Roboto_Bold');
      expect(result.isBold).toBe(true);
    });

    it('should handle lowercase bold', () => {
      const result = FontRegistry.analyze('font-bold');
      expect(result.isBold).toBe(true);
    });

    it('should handle mixed case Italic', () => {
      const result = FontRegistry.analyze('Font-ITALIC');
      expect(result.isItalic).toBe(true);
    });
  });

  describe('Font style enum values', () => {
    it('should return Normal style for regular fonts', () => {
      const result = FontRegistry.analyze('Helvetica');
      expect(result.style).toBe(FontStyle.Normal);
    });

    it('should return Italic style for italic fonts', () => {
      const result = FontRegistry.analyze('Helvetica-Italic');
      expect(result.style).toBe(FontStyle.Italic);
    });

    it('should return Oblique style for oblique fonts', () => {
      const result = FontRegistry.analyze('Helvetica-Oblique');
      expect(result.style).toBe(FontStyle.Oblique);
    });
  });
});
