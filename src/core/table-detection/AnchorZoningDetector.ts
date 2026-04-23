import type {
  ITableDetector,
  DetectedTable,
  DetectionConfig,
  DetectorCategory,
} from './TableTypes';
import type { TextElement } from '../../models/TextElement';
import type { LineSegment, FillRegion } from '../TextExtractor';
import { TableUtils } from './TableUtils';

/**
 * Represents an anchor keyword match.
 */
interface AnchorMatch {
  readonly element: TextElement;
  readonly keyword: string;
}

/**
 * Default anchor keywords commonly found in tables/forms.
 */
const DEFAULT_ANCHOR_KEYWORDS = [
  'total', 'subtotal', 'tax', 'description', 'price', 'quantity', 'qty', 'amount', 'date', 'item', 'index', 'id', 'no', '#'
];

/**
 * Anchor Zoning detector implementation.
 */
export class AnchorZoningDetector implements ITableDetector {
  getName(): string {
    return 'AnchorZoning';
  }

  getCategory(): DetectorCategory {
    return 'landmark';
  }

  getDefaultWeight(): number {
    return 0.5;
  }

  detect(
    elements: ReadonlyArray<TextElement>,
    config: DetectionConfig,
    _lines?: ReadonlyArray<LineSegment>,
    _fillRegions?: ReadonlyArray<FillRegion>,
  ): DetectedTable[] {
    if (elements.length < 3) return [];

    const elems = [...elements];
    const anchors = this.findAnchors(elems);

    if (anchors.length === 0) return [];

    const clusters = this.clusterAnchors(anchors, config.tolerance * 10);
    const tables: DetectedTable[] = [];

    for (const cluster of clusters) {
      if (cluster.length < 2) continue;

      // Group elements into rows based on these anchors
      const clusterElements = cluster.map(a => a.element);
      
      // Find all elements vertically aligned with this cluster
      const minY = Math.min(...clusterElements.map(el => el.y - el.height)) - 100;
      const maxY = Math.max(...clusterElements.map(el => el.y)) + 100;
      
      const zoneElements = elems.filter(el => el.y >= minY && el.y <= maxY);
      if (zoneElements.length < 4) continue;

      const rows = TableUtils.groupElementsByY(zoneElements, config.tolerance);
      const colBoundaries = TableUtils.findGutters(zoneElements, config.tolerance);

      if (colBoundaries.length < 3) continue;

      const table = TableUtils.buildTableFromGrid(
        `anchor-${Date.now()}-${tables.length}`,
        this.getName(),
        rows,
        colBoundaries,
        config
      );

      if (table) {
        tables.push(table);
      }
    }

    return tables;
  }

  getConfidence(table: DetectedTable): number {
    if (table.cols < 2) return 0;
    // Landmarks give high confidence
    return 0.85;
  }

  private findAnchors(elements: TextElement[]): AnchorMatch[] {
    const matches: AnchorMatch[] = [];
    for (const el of elements) {
      const normalizedText = el.text.trim().toLowerCase();
      for (const keyword of DEFAULT_ANCHOR_KEYWORDS) {
        if (normalizedText === keyword || normalizedText.includes(keyword)) {
          matches.push({ element: el, keyword });
          break;
        }
      }
    }
    return matches;
  }

  private clusterAnchors(anchors: AnchorMatch[], tolerance: number): AnchorMatch[][] {
    const clusters: AnchorMatch[][] = [];
    const sorted = [...anchors].sort((a, b) => b.element.y - a.element.y);

    for (const anchor of sorted) {
      let found = false;
      for (const cluster of clusters) {
        if (cluster.some(a => Math.abs(a.element.y - anchor.element.y) < tolerance)) {
          cluster.push(anchor);
          found = true;
          break;
        }
      }
      if (!found) clusters.push([anchor]);
    }
    return clusters;
  }
}
