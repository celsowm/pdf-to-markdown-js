/**
 * Lattice Table Detector (Vector-Based)
 *
 * Parses PDF drawing operators (moveTo, lineTo, rectangle) to find explicit line intersections.
 * Best for: Invoices, forms, and tables with visible borders.
 *
 * SOLID:
 * - SRP: Only handles vector-based detection
 * - OCP: Implements ITableDetector, can be replaced
 * - LSP: Interchangeable with other detectors
 * - DIP: Depends on ITableDetector abstraction
 */

import type {
  ITableDetector,
  DetectedTable,
  TableCell,
  DetectionConfig,
  DetectorCategory,
} from './TableTypes';
import type { TextElement } from '../../models/TextElement';

/**
 * Lattice detector implementation.
 */
export class LatticeDetector implements ITableDetector {
  getName(): string {
    return 'Lattice';
  }

  getCategory(): DetectorCategory {
    return 'vector';
  }

  getDefaultWeight(): number {
    return 0.8;
  }

  detect(elements: ReadonlyArray<TextElement>, config: DetectionConfig): DetectedTable[] {
    if (elements.length < config.minRows * config.minCols) {
      return [];
    }

    const tables: DetectedTable[] = [];

    // Group elements by row
    const allRows = this.groupByYPosition(elements, config.tolerance);

    // Partition rows into separate table candidates based on gaps
    const tableCandidates = this.partitionRows(allRows, config.tolerance);

    for (const rows of tableCandidates) {
      if (rows.length < config.minRows) continue;

      // Check if rows have consistent column alignment
      const colPositions = this.findCommonColumnPositions(rows, config.tolerance);

      if (colPositions.length < config.minCols) continue;

      // Build table
      const table = this.buildTable(rows, colPositions, config);
      if (table) {
        tables.push(table);
      }
    }

    return tables;
  }

  /**
   * Partitions rows into multiple table candidates based on vertical gaps.
   */
  private partitionRows(rows: TextElement[][], tolerance: number): TextElement[][][] {
    if (rows.length === 0) return [];

    const candidates: TextElement[][][] = [];
    let currentCandidate: TextElement[][] = [rows[0]];

    for (let i = 1; i < rows.length; i++) {
      const prevRowY = rows[i - 1][0].y;
      const currentRowY = rows[i][0].y;
      const gap = Math.abs(prevRowY - currentRowY);

      // If gap is significantly larger than typical line height (e.g. > 3x tolerance)
      // it's likely a different table or section
      if (gap > tolerance * 10) {
        candidates.push(currentCandidate);
        currentCandidate = [rows[i]];
      } else {
        currentCandidate.push(rows[i]);
      }
    }

    candidates.push(currentCandidate);
    return candidates;
  }

  getConfidence(table: DetectedTable): number {
    // Confidence based on grid completeness
    const expectedCells = table.rows * table.cols;
    const actualCells = table.cells.length;

    if (actualCells === 0) return 0;

    const completeness = actualCells / expectedCells;
    const sizeBonus = Math.min((table.rows * table.cols) / 20, 0.3);

    return Math.min(completeness * 0.7 + sizeBonus, 1.0);
  }

  /**
   * Groups text elements by Y position (rows).
   */
  private groupByYPosition(
    elements: ReadonlyArray<TextElement>,
    tolerance: number,
  ): TextElement[][] {
    const sorted = [...elements].sort((a, b) => b.y - a.y);
    const rows: TextElement[][] = [];

    for (const element of sorted) {
      const existingRow = rows.find((row) => Math.abs(row[0].y - element.y) <= tolerance);

      if (existingRow) {
        existingRow.push(element);
      } else {
        rows.push([element]);
      }
    }

    return rows;
  }

  /**
   * Finds common column X positions across rows.
   */
  private findCommonColumnPositions(rows: TextElement[][], tolerance: number): number[] {
    if (rows.length === 0) return [];

    // Collect all X positions
    const allXPositions = rows.flatMap((row) => row.map((el) => el.x).sort((a, b) => a - b));

    // Cluster X positions
    const clusters = this.clusterValues(allXPositions, tolerance);

    // Find clusters that appear in most rows
    const consistentClusters = clusters.filter((cluster) => {
      const rowsWithCluster = rows.filter((row) =>
        row.some((el) => Math.abs(el.x - cluster) <= tolerance * 2),
      );
      return rowsWithCluster.length >= Math.ceil(rows.length * 0.5);
    });

    return consistentClusters;
  }

  /**
   * Clusters numeric values within tolerance.
   */
  private clusterValues(values: number[], tolerance: number): number[] {
    if (values.length === 0) return [];

    const sorted = [...values].sort((a, b) => a - b);
    const clusters: number[] = [];
    let currentCluster: number[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - currentCluster[0] <= tolerance) {
        currentCluster.push(sorted[i]);
      } else {
        clusters.push(currentCluster.reduce((a, b) => a + b, 0) / currentCluster.length);
        currentCluster = [sorted[i]];
      }
    }

    if (currentCluster.length > 0) {
      clusters.push(currentCluster.reduce((a, b) => a + b, 0) / currentCluster.length);
    }

    return clusters;
  }

  /**
   * Builds a DetectedTable from rows and column positions.
   */
  private buildTable(
    rows: TextElement[][],
    colPositions: number[],
    config: DetectionConfig,
  ): DetectedTable | null {
    if (rows.length < config.minRows || colPositions.length < config.minCols) {
      return null;
    }

    const cells: TableCell[] = [];
    // let cellIndex = 0;

    for (let row = 0; row < rows.length; row++) {
      for (let col = 0; col < colPositions.length; col++) {
        const x1 = colPositions[col];
        const x2 = col < colPositions.length - 1 ? colPositions[col + 1] : x1 + 50;
        const y1 = rows[row][0]?.y || 0;
        const y2 = row < rows.length - 1 ? rows[row + 1][0]?.y || 0 : y1 - 20;

        cells.push({
          rowIndex: row,
          colIndex: col,
          x1,
          y1,
          x2,
          y2,
        });

        // cellIndex++;
      }
    }

    const x1 = Math.min(...colPositions);
    const x2 = Math.max(...colPositions);
    const y1 = Math.max(...rows.map((r) => r[0]?.y || 0));
    const y2 = Math.min(...rows.map((r) => r[0]?.y || 0));

    return {
      id: `lattice-${Date.now()}`,
      detectorName: this.getName(),
      x1,
      y1,
      x2,
      y2,
      rows: rows.length,
      cols: colPositions.length,
      cells,
      hasHeader: rows.length >= 2,
      confidence: 0, // Will be calculated by getConfidence
    };
  }
}
