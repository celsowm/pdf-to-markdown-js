/**
 * Stream Table Detector (Whitespace-Based)
 *
 * Analyzes "gutters" via horizontal and vertical projection profiles.
 * Best for: Borderless tables with clean, aligned columns (e.g., Excel exports).
 *
 * Algorithm:
 * 1. Create vertical projection profile (histogram of text at each X)
 * 2. Find "gutters" (empty vertical spaces) → these define columns
 * 3. Create horizontal projection profile
 * 4. Find gaps → these define rows
 * 5. Intersect columns and rows to form table grid
 */

import {
  ITableDetector,
  DetectedTable,
  TableCell,
  DetectionConfig,
  DetectorCategory,
} from './TableTypes';
import { TextElement } from '../../models/TextElement';

export class StreamDetector implements ITableDetector {
  getName(): string {
    return 'Stream';
  }

  getCategory(): DetectorCategory {
    return 'whitespace';
  }

  getDefaultWeight(): number {
    return 0.6;
  }

  detect(elements: ReadonlyArray<TextElement>, config: DetectionConfig): DetectedTable[] {
    if (elements.length < 4) return [];

    // Step 1: Find column boundaries via vertical projection
    const colBoundaries = this.findColumnBoundaries(elements, config.tolerance);

    if (colBoundaries.length < config.minCols + 1) {
      return [];
    }

    // Step 2: Find row boundaries via horizontal projection
    const rowBoundaries = this.findRowBoundaries(elements, config.tolerance);

    if (rowBoundaries.length < config.minRows + 1) {
      return [];
    }

    // Step 3: Build table from grid
    const table = this.buildGridTable(elements, colBoundaries, rowBoundaries, config);
    return table ? [table] : [];
  }

  getConfidence(table: DetectedTable): number {
    const alignmentScore = Math.min(table.cols / 10, 0.5);
    const sizeScore = Math.min((table.rows * table.cols) / 30, 0.5);
    return alignmentScore + sizeScore;
  }

  /**
   * Finds vertical gaps (gutters) that define columns.
   */
  private findColumnBoundaries(elements: ReadonlyArray<TextElement>, tolerance: number): number[] {
    // Group elements by X position
    const xPositions = elements.map((el) => el.x);

    // Cluster X positions
    const xClusters = this.clusterValues(xPositions, tolerance * 5);

    if (xClusters.length < 2) {
      return [];
    }

    // Column boundaries are between clusters
    const boundaries: number[] = [xClusters[0]];
    for (let i = 1; i < xClusters.length; i++) {
      // Add boundary midway between clusters
      boundaries.push((xClusters[i - 1] + xClusters[i]) / 2);
    }
    boundaries.push(xClusters[xClusters.length - 1]);

    return boundaries;
  }

  /**
   * Finds horizontal gaps that define rows.
   */
  private findRowBoundaries(elements: ReadonlyArray<TextElement>, tolerance: number): number[] {
    // Group elements by Y position
    const yPositions = elements.map((el) => el.y);

    // Cluster Y positions
    const yClusters = this.clusterValues(yPositions, tolerance * 5);

    if (yClusters.length < 2) {
      return [];
    }

    // Row boundaries are between clusters
    const boundaries: number[] = [yClusters[0]];
    for (let i = 1; i < yClusters.length; i++) {
      // Add boundary midway between clusters
      boundaries.push((yClusters[i - 1] + yClusters[i]) / 2);
    }
    boundaries.push(yClusters[yClusters.length - 1]);

    return boundaries;
  }

  /**
   * Clusters numeric values that are close together.
   * Returns the center of each cluster.
   */
  private clusterValues(values: number[], tolerance: number): number[] {
    if (values.length === 0) return [];

    const sorted = [...new Set(values)].sort((a, b) => a - b);
    const clusters: number[][] = [[sorted[0]]];

    for (let i = 1; i < sorted.length; i++) {
      const lastCluster = clusters[clusters.length - 1];
      const clusterCenter = lastCluster.reduce((a, b) => a + b, 0) / lastCluster.length;

      if (Math.abs(sorted[i] - clusterCenter) < tolerance) {
        lastCluster.push(sorted[i]);
      } else {
        clusters.push([sorted[i]]);
      }
    }

    // Return center of each cluster
    return clusters.map((cluster) => cluster.reduce((a, b) => a + b, 0) / cluster.length);
  }

  /**
   * Builds table from column and row boundaries.
   */
  private buildGridTable(
    _elements: ReadonlyArray<TextElement>,
    colBoundaries: number[],
    rowBoundaries: number[],
    config: DetectionConfig,
  ): DetectedTable | null {
    const rows = rowBoundaries.length - 1;
    const cols = colBoundaries.length - 1;

    if (rows < config.minRows || cols < config.minCols) {
      return null;
    }

    const cells: TableCell[] = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x1 = colBoundaries[col];
        const x2 = colBoundaries[col + 1];
        const y1 = rowBoundaries[row];
        const y2 = rowBoundaries[row + 1];

        cells.push({
          rowIndex: row,
          colIndex: col,
          x1,
          y1,
          x2,
          y2,
        });
      }
    }

    return {
      id: `stream-${Date.now()}`,
      detectorName: this.getName(),
      x1: colBoundaries[0],
      y1: rowBoundaries[0],
      x2: colBoundaries[cols],
      y2: rowBoundaries[rows],
      rows,
      cols,
      cells,
      hasHeader: rows >= 2,
      confidence: 0,
    };
  }
}
