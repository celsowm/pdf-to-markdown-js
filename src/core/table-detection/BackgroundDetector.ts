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
 * Background Table Detector
 * 
 * Uses filled background regions (rectangles) to identify table structures.
 * Signals:
 * 1. Zebra striping (alternating background colors for rows)
 * 2. Colored header rows
 * 3. Sidebars or highlighted columns
 */
export class BackgroundDetector implements ITableDetector {
  getName(): string {
    return 'Background';
  }

  getCategory(): DetectorCategory {
    return 'signal';
  }

  getDefaultWeight(): number {
    return 0.7;
  }

  detect(
    elements: ReadonlyArray<TextElement>,
    config: DetectionConfig,
    _lines?: ReadonlyArray<LineSegment>,
    fillRegions?: ReadonlyArray<FillRegion>,
  ): DetectedTable[] {
    if (!fillRegions || fillRegions.length === 0) return [];

    // Step 1: Filter regions that could be table rows/headers (wide and short)
    const candidates = fillRegions.filter(r => r.width > 100 && r.height < 50);
    if (candidates.length === 0) return [];

    // Step 2: Group regions by vertical alignment (potential rows in same table)
    const bands = this.clusterBands(candidates, config.tolerance);
    const tables: DetectedTable[] = [];

    for (const band of bands) {
      if (band.length < 1) continue;

      // Check for zebra striping or header highlight
      // Identify elements inside these regions
      const elementsInBands = elements.filter(el => 
        band.some(r => 
          el.x >= r.x - config.tolerance && 
          el.x + el.width <= r.x + r.width + config.tolerance &&
          el.y <= r.y + r.height + config.tolerance &&
          el.y - el.height >= r.y - config.tolerance
        )
      );

      if (elementsInBands.length < 4) continue;

      // Use gutters to find columns within these background bands
      const colBoundaries = TableUtils.findGutters(elementsInBands, config.tolerance);
      if (colBoundaries.length < 3) continue; // Need at least 2 columns

      // Build rows for the grid
      const rows = this.groupElementsByY(elementsInBands, config.tolerance);

      const table = TableUtils.buildTableFromGrid(
        `background-${Date.now()}-${tables.length}`,
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
    // High confidence if we found background regions perfectly matching text
    return 0.8;
  }

  private clusterBands(regions: FillRegion[], _tolerance: number): FillRegion[][] {
    const sorted = [...regions].sort((a, b) => b.y - a.y);
    const clusters: FillRegion[][] = [];
    
    for (const reg of sorted) {
      // Find a cluster where this region is vertically close to others
      // "Close" means the gap between this region and last in cluster is reasonable
      let found = false;
      for (const cluster of clusters) {
        const last = cluster[cluster.length - 1];
        const gap = Math.abs(last.y - reg.y);
        
        // If it's part of a sequence of similar width rectangles
        if (gap < 40 && Math.abs(last.width - reg.width) < 50) {
          cluster.push(reg);
          found = true;
          break;
        }
      }
      if (!found) {
        clusters.push([reg]);
      }
    }
    
    return clusters;
  }

  private groupElementsByY(elements: TextElement[], tolerance: number): TextElement[][] {
    const sorted = [...elements].sort((a, b) => b.y - a.y);
    const rows: TextElement[][] = [];

    for (const el of sorted) {
      let placed = false;
      for (const row of rows) {
        if (Math.abs(row[0].y - el.y) <= tolerance * 2) {
          row.push(el);
          placed = true;
          break;
        }
      }
      if (!placed) {
        rows.push([el]);
      }
    }

    for (const row of rows) {
      row.sort((a, b) => a.x - b.x);
    }

    return rows;
  }
}
