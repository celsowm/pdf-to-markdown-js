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

import type {
  ITableDetector,
  DetectedTable,
  DetectionConfig,
  DetectorCategory,
} from './TableTypes';
import type { TextElement } from '../../models/TextElement';
import type { LineSegment, FillRegion } from '../TextExtractor';
import { TableUtils } from './TableUtils';

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

  detect(
    elements: ReadonlyArray<TextElement>,
    config: DetectionConfig,
    _lines?: ReadonlyArray<LineSegment>,
  ): DetectedTable[] {
    if (elements.length < 4) return [];

    // Group elements into potential rows first to avoid mixing tables
    const allRows = TableUtils.groupElementsByY([...elements], config.tolerance);
    
    // Partition rows into table candidates
    const candidates = this.partitionRows(allRows, config.tolerance);
    const tables: DetectedTable[] = [];

    for (const candidateElements of candidates) {
      if (candidateElements.length < config.minRows) continue;

      const flatElements = candidateElements.flat();
      
      // Step 1: Find column boundaries via vertical projection
      const colBoundaries = this.findColumnBoundaries(flatElements, config.tolerance);

      if (colBoundaries.length < config.minCols + 1) {
        continue;
      }

      // Step 2: Build table from grid
      const table = TableUtils.buildTableFromGrid(
        `stream-${Date.now()}-${tables.length}`,
        this.getName(),
        candidateElements,
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
    
    // Score based on number of columns and rows
    const columnScore = Math.min(table.cols / 8, 0.4);
    const rowScore = Math.min(table.rows / 15, 0.4);
    
    // Bonus for more than 2 columns (most text-only false positives are 2 columns)
    const columnBonus = table.cols > 2 ? 0.2 : 0;
    
    // Penalty for very few rows
    const rowPenalty = table.rows < 3 ? 0.4 : 0;
    
    return Math.max(0, columnScore + rowScore + columnBonus - rowPenalty);
  }

  /**
   * Finds vertical gaps (gutters) that define columns.
   */
  private findColumnBoundaries(elements: ReadonlyArray<TextElement>, tolerance: number): number[] {
    return TableUtils.findGutters([...elements], tolerance);
  }

  private partitionRows(rows: TextElement[][], tolerance: number): TextElement[][][] {
    if (rows.length === 0) return [];

    const candidates: TextElement[][][] = [];
    let current: TextElement[][] = [rows[0]];

    for (let i = 1; i < rows.length; i++) {
      const prevY = rows[i-1][0].y;
      const currY = rows[i][0].y;
      const gap = Math.abs(prevY - currY);

      if (gap > tolerance * 10) {
        candidates.push(current);
        current = [rows[i]];
      } else {
        current.push(rows[i]);
      }
    }
    candidates.push(current);
    return candidates;
  }
}
