/**
 * SCA (Sparse Columnar Alignment) Table Detector (Statistical)
 *
 * Uses histogram analysis of text block centers to find column alignment patterns.
 * Algorithm:
 * 1. Compute X positions of all text element centers/edges
 * 2. Build a histogram of these positions
 * 3. Find "spikes" where many text edges align (column candidates)
 * 4. Calculate column alignment score for each candidate spike
 * 5. If alignment score exceeds threshold, build table from aligned elements
 * Handles "jagged" tables where some cells are empty (sparse alignment)
 *
 * SOLID:
 * - SRP: Only handles statistical column alignment detection
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
import type { LineSegment, FillRegion } from '../TextExtractor';
import { TableUtils } from './TableUtils';

/**
 * Represents a histogram bin with its properties.
 */
interface HistBin {
  readonly center: number;
  readonly count: number;
  readonly elements: TextElement[];
}

/**
 * Represents a detected column spike.
 */
interface ColumnSpike {
  readonly xPosition: number;
  readonly alignmentScore: number;
  readonly rowCount: number;
  readonly elements: TextElement[];
}

/**
 * SCA Detector implementation.
 */
export class SCADetector implements ITableDetector {
  getName(): string {
    return 'SCA';
  }

  getCategory(): DetectorCategory {
    return 'statistical';
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
    if (elements.length < 4) return [];

    const elems = [...elements] as TextElement[];
    const tables: DetectedTable[] = [];

    // Step 1: Build histogram of text positions
    const histogram = this.buildHistogram(elems, config);

    if (histogram.length === 0) return [];

    // Step 2: Find spikes (positions with significant alignment)
    const spikes = this.findSpikes(histogram, elems, config);

    if (spikes.length < config.minCols) return [];

    // Step 3: Group spikes into column sets and attempt table construction
    const columnCandidates = this.selectBestColumns(spikes, config);

    for (const columns of columnCandidates) {
      const table = this.buildTableFromColumns(elems, columns, config);
      if (table) {
        tables.push(table);
      }
    }

    return tables;
  }

  getConfidence(table: DetectedTable): number {
    if (table.cols < 2) return 0;
    
    const expectedCells = table.rows * table.cols;
    const filledCells = table.cells.filter((c) => c.content && c.content.trim().length > 0).length;

    if (filledCells === 0) return 0;

    const fillRate = filledCells / expectedCells;
    const columnScore = Math.min(table.cols / 10, 0.4);
    
    // Penalty for 2 columns (common in normal text paragraphs with indentation or signatures)
    const columnPenalty = table.cols === 2 ? 0.3 : 0;
    
    // Penalty for very few rows
    const rowPenalty = table.rows < 3 ? 0.4 : 0;

    return Math.max(0, fillRate * 0.3 + columnScore - columnPenalty - rowPenalty + 0.1);
  }

  // ─── Histogram Building ──────────────────────────────────────────────

  private buildHistogram(elements: TextElement[], config: DetectionConfig): HistBin[] {
    if (elements.length === 0) return [];

    const binSize = config.tolerance * 1.5;
    const binMap = new Map<number, TextElement[]>();

    for (const el of elements) {
      // Consider both left edge and center for robustness
      const positions = [
        { pos: el.x, weight: 0.6 },
        { pos: el.x + el.width / 2, weight: 0.4 },
      ];

      for (const { pos } of positions) {
        const binKey = Math.round(pos / binSize) * binSize;
        const existing = binMap.get(binKey) || [];
        existing.push(el);
        binMap.set(binKey, existing);
      }
    }

    // Convert to bins
    const bins: HistBin[] = [];
    for (const [center, els] of binMap.entries()) {
      bins.push({
        center,
        count: els.length,
        elements: els,
      });
    }

    // Sort by position
    bins.sort((a, b) => a.center - b.center);

    return bins;
  }

  // ─── Spike Detection ─────────────────────────────────────────────────

  private findSpikes(
    histogram: HistBin[],
    elements: TextElement[],
    config: DetectionConfig,
  ): ColumnSpike[] {
    if (histogram.length === 0) return [];

    // Calculate statistics
    const counts = histogram.map((b) => b.count);
    const meanCount = counts.reduce((a, b) => a + b, 0) / counts.length;
    const stdDev = Math.sqrt(
      counts.reduce((sum, c) => sum + Math.pow(c - meanCount, 2), 0) / counts.length,
    );

    // Threshold: mean + 1 std deviation
    const spikeThreshold = meanCount + stdDev * 1.0;
    const estimatedRows = this.estimateRowCount(elements);
    const minRowCount = Math.max(2, Math.ceil(estimatedRows * 0.3));

    const spikes: ColumnSpike[] = [];

    for (const bin of histogram) {
      if (bin.count < spikeThreshold) continue;

      const uniqueRows = this.countUniqueRows(bin.elements, config.tolerance);
      const coverageScore = estimatedRows > 0 ? uniqueRows / estimatedRows : 0;

      const score = (bin.count / spikeThreshold) * 0.5 + coverageScore * 0.5;

      if (score >= 0.25 && uniqueRows >= minRowCount) {
        spikes.push({
          xPosition: bin.center,
          alignmentScore: score,
          rowCount: uniqueRows,
          elements: bin.elements,
        });
      }
    }

    // Merge nearby spikes
    return this.mergeNearbySpikes(spikes, config.tolerance * 2);
  }

  private mergeNearbySpikes(spikes: ColumnSpike[], tolerance: number): ColumnSpike[] {
    if (spikes.length === 0) return [];

    const sorted = [...spikes].sort((a, b) => a.xPosition - b.xPosition);
    const merged: ColumnSpike[] = [];
    let current = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      if (Math.abs(sorted[i].xPosition - current.xPosition) <= tolerance) {
        if (sorted[i].alignmentScore > current.alignmentScore) {
          current = sorted[i];
        } else {
          const allElements = [...new Set([...current.elements, ...sorted[i].elements])];
          current = {
            ...current,
            elements: allElements,
            rowCount: current.rowCount + sorted[i].rowCount,
          };
        }
      } else {
        merged.push(current);
        current = sorted[i];
      }
    }
    merged.push(current);

    return merged;
  }

  // ─── Column Selection ────────────────────────────────────────────────

  private selectBestColumns(spikes: ColumnSpike[], config: DetectionConfig): number[][] {
    if (spikes.length < config.minCols) return [];

    const sorted = [...spikes].sort((a, b) => b.alignmentScore - a.alignmentScore);
    const selected: number[] = [];
    const minSpacing = config.tolerance * 4;

    for (const spike of sorted) {
      const tooClose = selected.some((pos) => Math.abs(pos - spike.xPosition) < minSpacing);
      if (!tooClose) {
        selected.push(spike.xPosition);
      }
    }

    selected.sort((a, b) => a - b);
    return selected.length >= config.minCols ? [selected] : [];
  }

  // ─── Table Building ──────────────────────────────────────────────────

  private buildTableFromColumns(
    elements: TextElement[],
    colPositions: number[],
    config: DetectionConfig,
  ): DetectedTable | null {
    if (colPositions.length < config.minCols) return null;

    const rows = this.groupElementsByY(elements, config.tolerance);
    if (rows.length < config.minRows) return null;

    const colBoundaries: number[] = [];
    const minX = Math.min(...elements.map(el => el.x));
    const maxX = Math.max(...elements.map(el => el.x + el.width));

    colBoundaries.push(minX - 2);
    for (let i = 1; i < colPositions.length; i++) {
      colBoundaries.push((colPositions[i-1] + colPositions[i]) / 2);
    }
    colBoundaries.push(maxX + 2);

    return TableUtils.buildTableFromGrid(
      `sca-${Date.now()}`,
      this.getName(),
      rows,
      colBoundaries,
      config
    );
  }

  // ─── Utility Methods ─────────────────────────────────────────────────

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

  private countUniqueRows(elements: TextElement[], tolerance: number): number {
    const yPositions = new Set<number>();
    for (const el of elements) {
      const quantizedY = Math.round(el.y / (tolerance * 2)) * (tolerance * 2);
      yPositions.add(quantizedY);
    }
    return yPositions.size;
  }

  private estimateRowCount(elements: TextElement[]): number {
    if (elements.length === 0) return 0;
    
    // Simple estimation
    const uniqueY = new Set(elements.map(el => Math.round(el.y / 10) * 10)).size;
    return Math.max(1, uniqueY);
  }
}
