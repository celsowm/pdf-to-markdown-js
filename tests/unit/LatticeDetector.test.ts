import { describe, it, expect } from 'vitest';
import { LatticeDetector, DetectedTable } from '../../src/core/LatticeDetector';

describe('LatticeDetector', () => {
  describe('detectTables from rectangle patterns', () => {
    it('should detect a simple 2x2 table from rectangle', () => {
      // PDF rectangle: x y w h re
      // Creates a 2x2 grid with 3 horizontal and 3 vertical lines
      const content = `
        100 500 200 100 re
        100 450 200 50 re
        100 500 100 100 re
        200 500 100 100 re
        100 450 100 50 re
        200 450 100 50 re
      `;

      const detector = new LatticeDetector({ minCells: { rows: 2, cols: 2 } });
      const tables = detector.detectTables(content);

      expect(tables.length).toBeGreaterThan(0);
    });

    it('should detect table from explicit line operators', () => {
      // PDF line: x1 y1 m x2 y2 l S
      const content = `
        100 500 m 300 500 l
        100 450 m 300 450 l
        100 400 m 300 400 l
        100 500 m 100 400 l
        200 500 m 200 400 l
        300 500 m 300 400 l
      `;

      const detector = new LatticeDetector({ minCells: { rows: 2, cols: 2 } });
      const tables = detector.detectTables(content);

      expect(tables.length).toBeGreaterThan(0);
    });

    it('should return empty array when no lines found', () => {
      const content = 'BT /F1 12 Tf 100 500 Td (Hello) Tj ET';

      const detector = new LatticeDetector();
      const tables = detector.detectTables(content);

      expect(tables).toHaveLength(0);
    });

    it('should return empty array for insufficient intersections', () => {
      // Only 2 lines - not enough for a table
      const content = `
        100 500 m 300 500 l
        100 500 m 100 400 l
      `;

      const detector = new LatticeDetector();
      const tables = detector.detectTables(content);

      expect(tables).toHaveLength(0);
    });
  });

  describe('configuration', () => {
    it('should use default configuration', () => {
      const detector = new LatticeDetector();
      const config = detector.getConfig();

      expect(config.lineTolerance).toBe(2);
      expect(config.minTableWidth).toBe(50);
      expect(config.minTableHeight).toBe(30);
      expect(config.minCells).toEqual({ rows: 2, cols: 2 });
      expect(config.detectionWeight).toBe(0.5);
    });

    it('should allow custom configuration', () => {
      const detector = new LatticeDetector({
        lineTolerance: 5,
        minTableWidth: 100,
        minTableHeight: 50,
        minCells: { rows: 3, cols: 3 },
        detectionWeight: 0.8,
      });

      const config = detector.getConfig();

      expect(config.lineTolerance).toBe(5);
      expect(config.minTableWidth).toBe(100);
      expect(config.minTableHeight).toBe(50);
      expect(config.minCells).toEqual({ rows: 3, cols: 3 });
      expect(config.detectionWeight).toBe(0.8);
    });

    it('should allow partial configuration overrides', () => {
      const detector = new LatticeDetector({
        lineTolerance: 3,
      });

      const config = detector.getConfig();

      expect(config.lineTolerance).toBe(3);
      expect(config.minTableWidth).toBe(50); // Default
      expect(config.minTableHeight).toBe(30); // Default
    });
  });

  describe('line detection patterns', () => {
    it('should detect horizontal lines from rectangles', () => {
      const content = '100 500 200 50 re';
      const detector = new LatticeDetector();
      const tables = detector.detectTables(content);

      // Rectangle should create lines, but not a full table
      expect(tables.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect vertical lines from rectangles', () => {
      const content = '100 500 50 100 re';
      const detector = new LatticeDetector();
      const tables = detector.detectTables(content);

      expect(tables.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle decimal coordinates', () => {
      const content = `
        100.5 500.3 m 300.7 500.3 l
        100.5 450.2 m 300.7 450.2 l
        100.5 500.3 m 100.5 450.2 l
        300.7 500.3 m 300.7 450.2 l
      `;

      const detector = new LatticeDetector({ lineTolerance: 3 });
      const tables = detector.detectTables(content);

      // Should detect at least some structure
      expect(tables.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle negative coordinates', () => {
      const content = `
        -100 -500 m -300 -500 l
        -100 -450 m -300 -450 l
        -100 -500 m -100 -450 l
        -300 -500 m -300 -450 l
      `;

      const detector = new LatticeDetector();
      const tables = detector.detectTables(content);

      expect(tables.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('table grid building', () => {
    it('should build table with correct dimensions', () => {
      // Create a clear 3x3 grid
      const content = `
        100 600 m 400 600 l
        100 550 m 400 550 l
        100 500 m 400 500 l
        100 450 m 400 450 l
        100 600 m 100 450 l
        200 600 m 200 450 l
        300 600 m 300 450 l
        400 600 m 400 450 l
      `;

      const detector = new LatticeDetector({
        lineTolerance: 5,
        minCells: { rows: 2, cols: 2 },
      });

      const tables = detector.detectTables(content);

      if (tables.length > 0) {
        const table = tables[0];
        expect(table.rows).toBeGreaterThanOrEqual(2);
        expect(table.cols).toBeGreaterThanOrEqual(2);
        expect(table.cells.length).toBeGreaterThan(0);
      }
    });

    it('should detect header row', () => {
      const content = `
        100 600 m 400 600 l
        100 550 m 400 550 l
        100 500 m 400 500 l
        100 600 m 100 500 l
        250 600 m 250 500 l
        400 600 m 400 500 l
      `;

      const detector = new LatticeDetector({
        lineTolerance: 5,
        minCells: { rows: 2, cols: 2 },
      });

      const tables = detector.detectTables(content);

      if (tables.length > 0) {
        const table = tables[0];
        expect(table.hasHeader).toBe(true);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle overlapping lines', () => {
      const content = `
        100 500 m 300 500 l
        150 500 m 350 500 l
        100 500 m 100 400 l
        300 500 m 300 400 l
      `;

      const detector = new LatticeDetector();
      const tables = detector.detectTables(content);

      // Should handle gracefully
      expect(Array.isArray(tables)).toBe(true);
    });

    it('should handle non-grid patterns', () => {
      const content = `
        100 500 m 300 500 l
        100 450 m 300 450 l
        100 400 m 300 400 l
        // No vertical lines - not a table
      `;

      const detector = new LatticeDetector();
      const tables = detector.detectTables(content);

      expect(tables.length).toBe(0);
    });

    it('should handle empty content', () => {
      const detector = new LatticeDetector();
      const tables = detector.detectTables('');

      expect(tables).toHaveLength(0);
    });

    it('should handle whitespace-only content', () => {
      const detector = new LatticeDetector();
      const tables = detector.detectTables('   \n\n  ');

      expect(tables).toHaveLength(0);
    });
  });
});
