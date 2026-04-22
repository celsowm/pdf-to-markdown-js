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
  DetectionConfig,
  DetectorCategory,
} from './TableTypes';
import type { TextElement } from '../../models/TextElement';
import type { LineSegment } from '../TextExtractor';
import type { LineSegment } from '../TextExtractor';
import { TableUtils } from './TableUtils';

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

  detect(
    elements: ReadonlyArray<TextElement>,
    config: DetectionConfig,
    lines?: ReadonlyArray<LineSegment>,
  ): DetectedTable[] {
    if (elements.length < config.minRows * config.minCols) {
      return [];
    }

    // Try vector-based detection first if lines are available
    if (lines && lines.length > 0) {
      const vectorTables = this.detectByVectors(elements, lines, config);
      if (vectorTables.length > 0) return vectorTables;
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

      // Build column boundaries
      const flatElems = rows.flat();
      const colBoundaries = TableUtils.findGutters(flatElems, config.tolerance);

      // Build table
      const table = TableUtils.buildTableFromGrid(
        `lattice-${Date.now()}-${tables.length}`,
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
    if (table.cols < 2) return 0;
    
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
    const clusters = TableUtils.clusterValueRanges(allXPositions, tolerance);

    // Find clusters that appear in most rows
    const consistentClusters = clusters.filter((cluster) => {
      const rowsWithCluster = rows.filter((row) =>
        row.some((el) => Math.abs(el.x - cluster.center) <= tolerance * 2),
      );
      return rowsWithCluster.length >= Math.ceil(rows.length * 0.5);
    });

    return consistentClusters.map(c => c.center);
  }

  /**
   * Detects tables by intersecting horizontal and vertical line segments.
   */
  private detectByVectors(
    elements: ReadonlyArray<TextElement>,
    lines: ReadonlyArray<LineSegment>,
    config: DetectionConfig,
  ): DetectedTable[] {
    const hLines = lines.filter(l => l.isHorizontal);
    const vLines = lines.filter(l => l.isVertical);

    if (hLines.length < 2 || vLines.length < 2) return [];

    // Find intersections (potential cell corners)
    const xPoints = new Set<number>();
    const yPoints = new Set<number>();

    for (const h of hLines) {
      yPoints.add(h.y1);
      xPoints.add(h.x1);
      xPoints.add(h.x2);
    }
    for (const v of vLines) {
      xPoints.add(v.x1);
      yPoints.add(v.y1);
      yPoints.add(v.y2);
    }

    // Cluster points that are very close
    const xClusters = TableUtils.clusterValueRanges(Array.from(xPoints), config.tolerance);
    const yClusters = TableUtils.clusterValueRanges(Array.from(yPoints), config.tolerance);

    if (xClusters.length < 2 || yClusters.length < 2) return [];

    const colBoundaries = xClusters.map(c => c.center).sort((a, b) => a - b);
    // const rowBoundaries = yClusters.map(c => c.center).sort((a, b) => b - a);

    // Build the table using the grid formed by these lines
    const table = TableUtils.buildTableFromGrid(
      `lattice-v2-${Date.now()}`,
      this.getName(),
      this.groupByYPosition(elements, config.tolerance),
      colBoundaries,
      config
    );

    return table ? [table] : [];
  }
}
