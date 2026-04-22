import { describe, it, expect } from 'vitest';
import { TextElement } from '../../src/models/TextElement';
import {
  DetectorRegistry,
  createStandardRegistry,
  ITableDetector,
  DetectionConfig,
  DEFAULT_DETECTION_CONFIG,
} from '../../src/core/table-detection';
import { LatticeDetector } from '../../src/core/table-detection/LatticeDetector';
import { StreamDetector } from '../../src/core/table-detection/StreamDetector';
import { TableTransformer } from '../../src/transformers/TableTransformer';

// Helper to create test text elements
function createTextElements(data: string[][]): TextElement[] {
  const elements: TextElement[] = [];
  const rowHeight = 20;
  const colWidth = 80;

  for (let row = 0; row < data.length; row++) {
    for (let col = 0; col < data[row].length; col++) {
      elements.push({
        text: data[row][col],
        x: col * colWidth + 50,
        y: 600 - row * rowHeight,
        width: colWidth - 10,
        height: 15,
        fontSize: 12,
        fontName: 'Helvetica',
        isBold: row === 0,
        isItalic: false,
        isStrike: false,
        isUnderline: false,
        pageIndex: 0,
      });
    }
  }

  return elements;
}

describe('Table Detection System', () => {
  describe('DetectorRegistry', () => {
    it('should create standard registry with all detectors', () => {
      const registry = createStandardRegistry();
      const detectors = registry.getDetectorNames();

      expect(detectors).toContain('Lattice');
      expect(detectors).toContain('Stream');
      expect(detectors).toContain('RXYCut');
      expect(detectors).toContain('SCA');
      expect(detectors).toContain('GraphBased');
      expect(detectors.length).toBe(9);
    });

    it('should allow detector registration', () => {
      const registry = new DetectorRegistry();

      const mockDetector: ITableDetector = {
        getName: () => 'Mock',
        getCategory: () => 'vector',
        getDefaultWeight: () => 0.5,
        detect: () => [],
        getConfidence: () => 0.5,
      };

      registry.register(mockDetector);
      expect(registry.getDetectorNames()).toContain('Mock');
    });

    it('should allow detector unregistration', () => {
      const registry = createStandardRegistry();
      const removed = registry.unregister('Entropy');

      expect(removed).toBe(true);
      expect(registry.getDetectorNames()).not.toContain('Entropy');
    });

    it('should update detector weights', () => {
      const registry = createStandardRegistry();
      registry.updateWeights([{ name: 'Lattice', weight: 0.9, enabled: true }]);

      const weights = registry.getWeights();
      const latticeWeight = weights.find(w => w.name === 'Lattice');

      expect(latticeWeight?.weight).toBe(0.9);
    });

    it('should disable detectors', () => {
      const registry = createStandardRegistry();
      registry.updateWeights([{ name: 'Stream', weight: 0, enabled: false }]);

      const weights = registry.getWeights();
      const streamWeight = weights.find(w => w.name === 'Stream');

      expect(streamWeight?.enabled).toBe(false);
    });
  });

  describe('LatticeDetector', () => {
    it('should detect simple 2x2 table', () => {
      const detector = new LatticeDetector();

      const elements = createTextElements([
        ['Header1', 'Header2'],
        ['Row1Col1', 'Row1Col2'],
        ['Row2Col1', 'Row2Col2'],
      ]);

      const tables = detector.detect(elements, DEFAULT_DETECTION_CONFIG);
      expect(tables.length).toBeGreaterThan(0);
    });

    it('should return empty for insufficient elements', () => {
      const detector = new LatticeDetector();

      const elements: TextElement[] = [
        {
          text: 'Single',
          x: 50,
          y: 500,
          width: 50,
          height: 15,
          fontSize: 12,
          fontName: 'Helvetica',
          isBold: false,
          isItalic: false,
          isStrike: false,
          isUnderline: false,
          pageIndex: 0,
        },
      ];

      const tables = detector.detect(elements, DEFAULT_DETECTION_CONFIG);
      expect(tables).toHaveLength(0);
    });

    it('should calculate confidence score', () => {
      const detector = new LatticeDetector();

      const elements = createTextElements([
        ['A', 'B', 'C'],
        ['D', 'E', 'F'],
        ['G', 'H', 'I'],
      ]);

      const tables = detector.detect(elements, DEFAULT_DETECTION_CONFIG);
      
      if (tables.length > 0) {
        const confidence = detector.getConfidence(tables[0]);
        expect(confidence).toBeGreaterThanOrEqual(0);
        expect(confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('StreamDetector', () => {
    it('should detect borderless table', () => {
      const detector = new StreamDetector();

      const elements = createTextElements([
        ['Name', 'Age', 'City'],
        ['Alice', '30', 'NYC'],
        ['Bob', '25', 'LA'],
      ]);

      const tables = detector.detect(elements, DEFAULT_DETECTION_CONFIG);
      expect(tables.length).toBeGreaterThan(0);
    });

    it('should return empty for non-tabular data', () => {
      const detector = new StreamDetector();

      // Scattered elements with no alignment
      const elements: TextElement[] = [
        { text: 'A', x: 50, y: 500, width: 20, height: 15, fontSize: 12, fontName: 'Helvetica', isBold: false, isItalic: false, isStrike: false, isUnderline: false, pageIndex: 0 },
        { text: 'B', x: 200, y: 400, width: 20, height: 15, fontSize: 12, fontName: 'Helvetica', isBold: false, isItalic: false, isStrike: false, isUnderline: false, pageIndex: 0 },
        { text: 'C', x: 100, y: 300, width: 20, height: 15, fontSize: 12, fontName: 'Helvetica', isBold: false, isItalic: false, isStrike: false, isUnderline: false, pageIndex: 0 },
      ];

      const tables = detector.detect(elements, DEFAULT_DETECTION_CONFIG);
      expect(tables.length).toBe(0);
    });
  });

  describe('Integration with TableTransformer', () => {
    it('should detect and convert table to markdown', () => {
      const transformer = new TableTransformer();

      const elements = createTextElements([
        ['Product', 'Price', 'Qty'],
        ['Widget', '$10', '100'],
        ['Gadget', '$25', '50'],
      ]);

      const canTransform = transformer.canTransform(elements);
      expect(canTransform).toBe(true);

      const { nodes } = transformer.transform(elements, elements);
      expect(nodes.length).toBeGreaterThan(0);
    });

    it('should handle empty elements', () => {
      const transformer = new TableTransformer();

      const canTransform = transformer.canTransform([]);
      expect(canTransform).toBe(false);
    });
  });
});
