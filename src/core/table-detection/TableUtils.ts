import type { TextElement } from '../../models/TextElement';
import type { LineSegment, FillRegion } from '../TextExtractor';
import type { TableCell, DetectedTable, DetectionConfig } from './TableTypes';

/**
 * Utility functions for table detection.
 */
export class TableUtils {
  /**
   * Builds a grid of cells and calculates table boundaries based on elements.
   */
  static buildTableFromGrid(
    id: string,
    detectorName: string,
    rows: TextElement[][],
    colBoundaries: number[],
    config: DetectionConfig,
  ): DetectedTable | null {
    if (rows.length < config.minRows || colBoundaries.length < config.minCols + 1) {
      return null;
    }

    const cells: TableCell[] = [];
    
    for (let r = 0; r < rows.length; r++) {
      const rowElements = rows[r];
      // Y boundaries for this row
      // For the first row, y1 should be the top of its elements
      // For subsequent rows, y1 should be the bottom of previous row
      const rowTop = Math.max(...rowElements.map(el => el.y));
      const rowBottom = Math.min(...rowElements.map(el => el.y - el.height));
      
      // Use midpoints between rows for cell boundaries if possible
      const y1 = r === 0 ? rowTop + 2 : rowTop;
      const y2 = r === rows.length - 1 ? rowBottom - 2 : rowBottom;

      for (let c = 0; c < colBoundaries.length - 1; c++) {
        const x1 = colBoundaries[c];
        const x2 = colBoundaries[c + 1];

        cells.push({
          rowIndex: r,
          colIndex: c,
          x1,
          y1,
          x2,
          y2,
        });
      }
    }

    const x1 = colBoundaries[0];
    const x2 = colBoundaries[colBoundaries.length - 1];
    const y1 = Math.max(...cells.map(c => c.y1));
    const y2 = Math.min(...cells.map(c => c.y2));

    return {
      id,
      detectorName,
      x1,
      y1,
      x2,
      y2,
      rows: rows.length,
      cols: colBoundaries.length - 1,
      cells,
      hasHeader: rows.length >= 2,
      confidence: 0,
    };
  }

  /**
   * Finds gutters (vertical gaps) in elements.
   */
  static findGutters(elements: TextElement[], tolerance: number): number[] {
    if (elements.length === 0) return [];

    // 1. Collect all occupied X spans
    const spans = elements.map(el => ({ x1: el.x, x2: el.x + el.width }));
    const minX = Math.min(...spans.map(s => s.x1));
    const maxX = Math.max(...spans.map(s => s.x2));

    // 2. Identify all possible column start candidates (clustering X positions)
    const xStarts = elements.map(el => el.x);
    const clusters = this.clusterValueRanges(xStarts, tolerance * 2);
    
    // Sort clusters by center
    clusters.sort((a, b) => a.center - b.center);

    const boundaries: number[] = [];
    boundaries.push(minX - 2);

    for (let i = 1; i < clusters.length; i++) {
      // Find the furthest right edge of elements in the previous cluster
      const prevClusterElements = elements.filter(el => 
        el.x >= clusters[i-1].min - tolerance && el.x <= clusters[i-1].max + tolerance
      );
      const prevMaxX = Math.max(...prevClusterElements.map(el => el.x + el.width));
      
      // Find the furthest left edge of elements in the current cluster
      const currMinX = clusters[i].min;

      if (currMinX > prevMaxX) {
        // Real gap exists!
        boundaries.push((prevMaxX + currMinX) / 2);
      } else {
        // Overlap or very close, use midway between centers
        boundaries.push((clusters[i-1].center + clusters[i].center) / 2);
      }
    }

    boundaries.push(maxX + 2);
    return boundaries;
  }

  /**
   * Clusters numeric values and returns their ranges (min and max).
   */
  static clusterValueRanges(values: number[], tolerance: number): { min: number; max: number; center: number }[] {
    if (values.length === 0) return [];

    const sorted = [...values].sort((a, b) => a - b);
    const clusters: number[][] = [[sorted[0]]];

    for (let i = 1; i < sorted.length; i++) {
      const lastCluster = clusters[clusters.length - 1];
      const clusterCenter = lastCluster.reduce((a, b) => a + b, 0) / lastCluster.length;

      if (Math.abs(sorted[i] - clusterCenter) <= tolerance) {
        lastCluster.push(sorted[i]);
      } else {
        clusters.push([sorted[i]]);
      }
    }

    return clusters.map((cluster) => ({
      min: Math.min(...cluster),
      max: Math.max(...cluster),
      center: cluster.reduce((a, b) => a + b, 0) / cluster.length,
    }));
  }
}
