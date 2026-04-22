/**
 * R-XY-Cut Table Detector (Structural Recursive Whitespace Cutting)
 *
 * Recursively slices the page by finding the largest whitespace gaps.
 * Algorithm:
 * 1. Start with bounding box of all elements
 * 2. Project elements onto X axis, find largest horizontal gap
 * 3. If gap is significant, split vertically (cut along X axis)
 * 4. Alternate: next level projects onto Y axis, splits horizontally
 * 5. Recurse until regions are too small or contain too few elements
 * 6. Leaf regions that form grid-like patterns become table candidates
 *
 * SOLID:
 * - SRP: Only handles structural recursive cutting
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
 * A spatial region with its child cuts.
 */
interface XYRegion {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly elements: TextElement[];
  readonly children: XYRegion[];
  readonly depth: number;
}

/**
 * R-XY-Cut detector implementation.
 */
export class RXYCutDetector implements ITableDetector {
  getName(): string {
    return 'RXYCut';
  }

  getCategory(): DetectorCategory {
    return 'structural';
  }

  getDefaultWeight(): number {
    return 0.5;
  }

  detect(elements: ReadonlyArray<TextElement>, config: DetectionConfig): DetectedTable[] {
    if (elements.length < 4) return [];

    const elems = [...elements] as TextElement[];

    // Build root region
    const root = this.buildRegion(elems, 0);
    if (!root) return [];

    // Recursively cut
    const cutRegions = this.recursiveCut(root, config, true);

    // Collect leaf regions and attempt to form tables
    const leaves = this.collectLeaves(cutRegions);
    const tables: DetectedTable[] = [];

    for (const leaf of leaves) {
      const table = this.buildTableFromRegion(leaf, config);
      if (table) {
        tables.push(table);
      }
    }

    // Also try to build a table from the full set if cutting produced no results
    if (tables.length === 0 && elems.length >= config.minRows * config.minCols) {
      const table = this.buildTableFromProjection(elems, config);
      if (table) {
        tables.push(table);
      }
    }

    return tables;
  }

  getConfidence(table: DetectedTable): number {
    const expectedCells = table.rows * table.cols;
    const actualCells = table.cells.length;
    if (actualCells === 0) return 0;

    const completeness = actualCells / expectedCells;
    const sizeFactor = Math.min((table.rows * table.cols) / 20, 0.3);
    const regularityBonus = this.computeRegularity(table) * 0.2;

    return Math.min(completeness * 0.6 + sizeFactor + regularityBonus, 1.0);
  }

  // ─── Recursive Cutting ───────────────────────────────────────────────

  private recursiveCut(
    region: XYRegion,
    config: DetectionConfig,
    cutHorizontalFirst: boolean,
  ): XYRegion {
    if (
      region.elements.length < 4 ||
      region.depth >= 8 ||
      region.x2 - region.x1 < 50 ||
      region.y2 - region.y1 < 30
    ) {
      return region; // Leaf node
    }

    // Determine cut direction
    const cutH = cutHorizontalFirst;
    const gapInfo = this.findLargestGap(region.elements, cutH);

    if (!gapInfo || gapInfo.gapSize < this.getGapThreshold(region, cutH)) {
      return region; // No significant gap, leaf node
    }

    // Split elements into two groups
    const { left, right } = gapInfo;

    const leftRegion = this.buildRegion(left, region.depth + 1);
    const rightRegion = this.buildRegion(right, region.depth + 1);

    if (!leftRegion || !rightRegion) {
      return region;
    }

    // Recurse on children
    const cutLeft = this.recursiveCut(leftRegion, config, !cutH);
    const cutRight = this.recursiveCut(rightRegion, config, !cutH);

    return {
      ...region,
      children: [cutLeft, cutRight],
    };
  }

  private findLargestGap(
    elements: TextElement[],
    cutHorizontal: boolean,
  ): { left: TextElement[]; right: TextElement[]; splitPos: number; gapSize: number } | null {
    if (elements.length < 2) return null;

    // Sort by the relevant axis
    const sorted = [...elements].sort((a, b) => {
      const posA = cutHorizontal ? a.x : a.y;
      const posB = cutHorizontal ? b.x : b.y;
      return posA - posB;
    });

    // Find the largest gap between consecutive element edges
    let bestGap = 0;
    let bestSplitIdx = -1;

    for (let i = 0; i < sorted.length - 1; i++) {
      const currentEdge = cutHorizontal
        ? sorted[i].x + sorted[i].width
        : sorted[i].y + sorted[i].height;
      const nextStart = cutHorizontal ? sorted[i + 1].x : sorted[i + 1].y;

      const gap = nextStart - currentEdge;
      if (gap > bestGap) {
        bestGap = gap;
        bestSplitIdx = i;
      }
    }

    if (bestSplitIdx < 0) return null;

    const splitPos = cutHorizontal
      ? sorted[bestSplitIdx].x + sorted[bestSplitIdx].width + bestGap / 2
      : sorted[bestSplitIdx].y + sorted[bestSplitIdx].height + bestGap / 2;

    return {
      left: sorted.slice(0, bestSplitIdx + 1),
      right: sorted.slice(bestSplitIdx + 1),
      splitPos,
      gapSize: bestGap,
    };
  }

  private getGapThreshold(region: XYRegion, cutHorizontal: boolean): number {
    const span = cutHorizontal ? region.x2 - region.x1 : region.y2 - region.y1;
    return Math.max(span * 0.15, 10);
  }

  // ─── Region Building ─────────────────────────────────────────────────

  private buildRegion(elements: TextElement[], depth: number): XYRegion | null {
    if (elements.length === 0) return null;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    for (const el of elements) {
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + el.width);
      maxY = Math.max(maxY, el.y + el.height);
    }

    return {
      x1: minX,
      y1: minY,
      x2: maxX,
      y2: maxY,
      elements,
      children: [],
      depth,
    };
  }

  private collectLeaves(region: XYRegion): XYRegion[] {
    if (region.children.length === 0) {
      return [region];
    }
    return region.children.flatMap((child) => this.collectLeaves(child));
  }

  // ─── Table Construction from Regions ─────────────────────────────────

  private buildTableFromRegion(region: XYRegion, config: DetectionConfig): DetectedTable | null {
    if (region.elements.length < config.minRows * config.minCols) {
      return null;
    }

    // Try to arrange into a grid via projection
    return this.buildTableFromProjection(region.elements, config);
  }

  private buildTableFromProjection(
    elements: TextElement[],
    config: DetectionConfig,
  ): DetectedTable | null {
    const rows = this.groupElementsByY(elements, config.tolerance);

    if (rows.length < config.minRows) return null;

    // Find consistent column positions across rows
    const colPositions = this.findConsistentColumns(rows, config.tolerance, config.minCols);

    if (colPositions.length < config.minCols) return null;

    // Build cells
    const cells: TableCell[] = [];
    let hasAnyContent = false;

    for (let r = 0; r < rows.length; r++) {
      const rowY = rows[r][0]?.y ?? 0;
      const nextRowY = r < rows.length - 1 ? (rows[r + 1][0]?.y ?? 0) : rowY - 20;

      for (let c = 0; c < colPositions.length; c++) {
        const x1 = colPositions[c];
        const x2 = c < colPositions.length - 1 ? colPositions[c + 1] : x1 + 50;

        // Check if any element falls in this cell
        const cellElements = rows[r].filter(
          (el) => el.x >= x1 - config.tolerance && el.x < x2 + config.tolerance,
        );

        if (cellElements.length > 0) {
          hasAnyContent = true;
        }

        cells.push({
          rowIndex: r,
          colIndex: c,
          x1,
          y1: rowY,
          x2,
          y2: nextRowY,
          content:
            cellElements
              .map((e) => e.text)
              .join(' ')
              .trim() || undefined,
        });
      }
    }

    if (!hasAnyContent) return null;

    const x1 = Math.min(...colPositions);
    const x2 = colPositions[colPositions.length - 1] + 50;
    const yPositions = rows.map((r) => r[0]?.y ?? 0);
    const y1 = Math.max(...yPositions);
    const y2 = Math.min(...yPositions) - 20;

    return {
      id: `rxy-cut-${Date.now()}`,
      detectorName: this.getName(),
      x1,
      y1,
      x2,
      y2,
      rows: rows.length,
      cols: colPositions.length,
      cells,
      hasHeader: rows.length >= 2,
      confidence: 0,
    };
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

    // Sort each row by X
    for (const row of rows) {
      row.sort((a, b) => a.x - b.x);
    }

    return rows;
  }

  private findConsistentColumns(
    rows: TextElement[][],
    tolerance: number,
    minCols: number,
  ): number[] {
    // Collect all X positions
    const allXPositions = rows.flatMap((row) => row.map((el) => el.x));
    if (allXPositions.length === 0) return [];

    // Cluster X positions
    const clusters = this.clusterPositions(allXPositions, tolerance);

    // Keep only clusters that appear in enough rows
    const minRowCount = Math.max(2, Math.ceil(rows.length * 0.4));
    const consistent = clusters.filter((clusterCenter) => {
      let rowCount = 0;
      for (const row of rows) {
        if (row.some((el) => Math.abs(el.x - clusterCenter) <= tolerance * 3)) {
          rowCount++;
        }
      }
      return rowCount >= minRowCount;
    });

    consistent.sort((a, b) => a - b);
    return consistent.length >= minCols ? consistent : [];
  }

  private clusterPositions(positions: number[], tolerance: number): number[] {
    if (positions.length === 0) return [];

    const sorted = [...positions].sort((a, b) => a - b);
    const clusters: number[] = [];
    let clusterSum = sorted[0];
    let clusterCount = 1;

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] <= tolerance * 2) {
        clusterSum += sorted[i];
        clusterCount++;
      } else {
        clusters.push(clusterSum / clusterCount);
        clusterSum = sorted[i];
        clusterCount = 1;
      }
    }
    clusters.push(clusterSum / clusterCount);

    return clusters;
  }

  private computeRegularity(table: DetectedTable): number {
    if (table.cells.length === 0) return 0;

    // Measure regularity of cell widths and heights
    const widths = table.cells.map((c) => c.x2 - c.x1);
    const heights = table.cells.map((c) => Math.abs(c.y2 - c.y1));

    const avgWidth = widths.reduce((a, b) => a + b, 0) / widths.length;
    const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;

    if (avgWidth === 0 || avgHeight === 0) return 0;

    const widthVariance =
      widths.reduce((sum, w) => sum + Math.pow((w - avgWidth) / avgWidth, 2), 0) / widths.length;
    const heightVariance =
      heights.reduce((sum, h) => sum + Math.pow((h - avgHeight) / avgHeight, 2), 0) /
      heights.length;

    // Lower variance = higher regularity
    return Math.max(0, 1 - (widthVariance + heightVariance) / 2);
  }
}
