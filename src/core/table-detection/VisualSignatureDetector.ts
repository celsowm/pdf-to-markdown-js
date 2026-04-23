/**
 * Visual Signature Table Detector (Template Matching by Bitmask)
 *
 * Generates a low-resolution bitmask of the page, marks cells where text
 * exists, and compares against predefined templates. Match score = overlap
 * percentage. If match > threshold, extracts table at template coordinates.
 *
 * Best for: known document formats (invoices, receipts, forms).
 *
 * Algorithm:
 * 1. Generate bitmask: divide page into grid (e.g., 50x70 cells)
 * 2. Mark cells where text exists (1 = text, 0 = empty)
 * 3. Compare bitmask against predefined templates using XOR overlap
 * 4. If match score > threshold, extract table at template-defined region
 * 5. Support user-defined templates via config
 */

import type {
  ITableDetector,
  DetectedTable,
  TableCell,
  DetectionConfig,
  DetectorCategory,
} from './TableTypes';
import type { TextElement } from '../../models/TextElement';
import type { LineSegment, FillRegion } from '../TextExtractor';

/**
 * Predefined table template with expected bitmask and extraction region.
 */
export interface TableTemplate {
  /** Template name for identification. */
  readonly name: string;
  /** Low-resolution bitmask (1 = text expected, 0 = empty expected). */
  readonly bitmask: number[][];
  /** Grid dimensions of the bitmask. */
  readonly gridWidth: number;
  readonly gridHeight: number;
  /** Table extraction region as fraction of page dimensions [x1, y1, x2, y2]. */
  readonly tableRegion: [number, number, number, number];
  /** Expected minimum rows and cols in the table. */
  readonly minRows: number;
  readonly minCols: number;
}

/**
 * Configuration for VisualSignatureDetector.
 */
export interface VisualSignatureConfig {
  /** Grid resolution for bitmask generation. */
  readonly gridWidth: number;
  readonly gridHeight: number;
  /** Minimum match score (0-1) to consider a template match. */
  readonly matchThreshold: number;
  /** Custom templates to match against. */
  readonly templates?: TableTemplate[];
}

/** Default visual signature configuration. */
export const DEFAULT_VISUAL_SIGNATURE_CONFIG: VisualSignatureConfig = {
  gridWidth: 50,
  gridHeight: 70,
  matchThreshold: 0.6,
  templates: [],
};

/**
 * Built-in template for a standard invoice layout.
 * Table region is typically in the lower-middle portion of the page.
 */
const INVOICE_TEMPLATE: TableTemplate = {
  name: 'invoice',
  gridWidth: 50,
  gridHeight: 70,
  // Simplified invoice bitmask: header top, table in middle, totals at bottom
  bitmask: ((): number[][] => {
    const grid: number[][] = [];
    for (let y = 0; y < 70; y++) {
      const row: number[] = [];
      for (let x = 0; x < 50; x++) {
        // Header region (top 10%): text across the width
        if (y < 7) {
          row.push(x >= 5 && x < 45 ? 1 : 0);
        }
        // Table region (middle 50%): structured columns
        else if (y >= 15 && y < 50) {
          row.push(x % 8 < 6 ? 1 : 0); // Columns with small gaps
        }
        // Totals region (bottom): right-aligned text
        else if (y >= 55 && y < 62) {
          row.push(x >= 30 ? 1 : 0);
        }
        // Empty regions (gaps between sections)
        else {
          row.push(0);
        }
      }
      grid.push(row);
    }
    return grid;
  })(),
  tableRegion: [0.1, 0.22, 0.9, 0.72], // x1, y1, x2, y2 as fraction of page
  minRows: 3,
  minCols: 4,
};

/**
 * Built-in template for a receipt layout.
 * Narrower, single-column table with left-aligned text.
 */
const RECEIPT_TEMPLATE: TableTemplate = {
  name: 'receipt',
  gridWidth: 50,
  gridHeight: 70,
  bitmask: ((): number[][] => {
    const grid: number[][] = [];
    for (let y = 0; y < 70; y++) {
      const row: number[] = [];
      for (let x = 0; x < 50; x++) {
        // Header (top)
        if (y < 5) {
          row.push(x >= 15 && x < 35 ? 1 : 0);
        }
        // Line items (alternating text/gap pattern for item + price)
        else if (y >= 10 && y < 50) {
          row.push((x >= 5 && x < 30) || (x >= 38 && x < 48) ? 1 : 0);
        }
        // Total line
        else if (y >= 52 && y < 57) {
          row.push(x >= 30 ? 1 : 0);
        }
        // Footer
        else if (y >= 60 && y < 65) {
          row.push(x >= 15 && x < 35 ? 1 : 0);
        } else {
          row.push(0);
        }
      }
      grid.push(row);
    }
    return grid;
  })(),
  tableRegion: [0.05, 0.14, 0.95, 0.72],
  minRows: 3,
  minCols: 2,
};

/**
 * Built-in template for a form layout with labeled fields.
 */
const FORM_TEMPLATE: TableTemplate = {
  name: 'form',
  gridWidth: 50,
  gridHeight: 70,
  bitmask: ((): number[][] => {
    const grid: number[][] = [];
    for (let y = 0; y < 70; y++) {
      const row: number[] = [];
      for (let x = 0; x < 50; x++) {
        // Form title
        if (y < 5) {
          row.push(x >= 10 && x < 40 ? 1 : 0);
        }
        // Form fields: label on left, value on right
        else if (y >= 8 && y < 55) {
          // Label column (left) and value column (right)
          row.push((x >= 3 && x < 20) || (x >= 25 && x < 47) ? 1 : 0);
        }
        // Separator line
        else if (y === 56 || y === 57) {
          row.push(x >= 3 && x < 47 ? 1 : 0);
        }
        // Signature area
        else if (y >= 60 && y < 67) {
          row.push((x >= 3 && x < 22) || (x >= 28 && x < 47) ? 1 : 0);
        } else {
          row.push(0);
        }
      }
      grid.push(row);
    }
    return grid;
  })(),
  tableRegion: [0.06, 0.11, 0.94, 0.79],
  minRows: 4,
  minCols: 2,
};

const BUILTIN_TEMPLATES: TableTemplate[] = [INVOICE_TEMPLATE, RECEIPT_TEMPLATE, FORM_TEMPLATE];

export class VisualSignatureDetector implements ITableDetector {
  private readonly config: VisualSignatureConfig;

  constructor(config?: Partial<VisualSignatureConfig>) {
    this.config = { ...DEFAULT_VISUAL_SIGNATURE_CONFIG, ...config };
  }

  getName(): string {
    return 'VisualSignature';
  }

  getCategory(): DetectorCategory {
    return 'template';
  }

  getDefaultWeight(): number {
    return 0.9;
  }

  detect(elements: ReadonlyArray<TextElement>, config: DetectionConfig, _lines?: ReadonlyArray<LineSegment>, _fillRegions?: ReadonlyArray<FillRegion>): DetectedTable[] {
    if (elements.length < 4) {
      return [];
    }

    // Step 1: Generate page bitmask
    const bitmask = this.generateBitmask(elements, config);

    // Step 2: Match against all templates
    const allTemplates = [...BUILTIN_TEMPLATES, ...(this.config.templates || [])];

    const matches: { template: TableTemplate; score: number }[] = [];

    for (const template of allTemplates) {
      const score = this.computeMatchScore(bitmask, template);
      if (score >= this.config.matchThreshold) {
        matches.push({ template, score });
      }
    }

    if (matches.length === 0) {
      return [];
    }

    // Step 3: Extract tables from matched templates
    const tables: DetectedTable[] = [];
    for (const match of matches) {
      const table = this.extractTableFromTemplate(match.template, match.score, elements, config);
      if (table) {
        tables.push(table);
      }
    }

    return tables;
  }

  getConfidence(table: DetectedTable): number {
    // For template-based detection, confidence is largely the match score
    return Math.min(table.confidence, 1.0);
  }

  /**
   * Generates a low-resolution bitmask from text elements.
   * Each cell is 1 if it contains text, 0 otherwise.
   */
  private generateBitmask(
    elements: ReadonlyArray<TextElement>,
    config: DetectionConfig,
  ): number[][] {
    const gw = this.config.gridWidth;
    const gh = this.config.gridHeight;
    const cellW = config.pageWidth / gw;
    const cellH = config.pageHeight / gh;

    // Initialize empty grid
    const grid: number[][] = [];
    for (let y = 0; y < gh; y++) {
      grid[y] = new Array(gw).fill(0);
    }

    // Mark cells containing text
    for (const el of elements) {
      const textCenterX = el.x + el.width / 2;
      const textCenterY = el.y + el.height / 2;

      // Skip elements outside page bounds
      if (
        textCenterX < 0 ||
        textCenterX > config.pageWidth ||
        textCenterY < 0 ||
        textCenterY > config.pageHeight
      ) {
        continue;
      }

      const gridX = Math.min(Math.floor(textCenterX / cellW), gw - 1);
      const gridY = Math.min(Math.floor(textCenterY / cellH), gh - 1);

      if (gridY >= 0 && gridX >= 0) {
        grid[gridY][gridX] = 1;
      }
    }

    return grid;
  }

  /**
   * Computes match score between a generated bitmask and a template.
   * Uses normalized overlap (Jaccard-like similarity adapted for templates).
   */
  private computeMatchScore(actual: number[][], template: TableTemplate): number {
    const gw = this.config.gridWidth;
    const gh = this.config.gridHeight;

    // Resample template to our grid size if needed
    const resampledTemplate = this.resampleTemplate(template, gw, gh);

    let matches = 0;
    let total = 0;

    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const actualVal = actual[y]?.[x] ?? 0;
        const templateVal = resampledTemplate[y]?.[x] ?? 0;

        total++;
        if (actualVal === templateVal) {
          matches++;
        }
      }
    }

    return total > 0 ? matches / total : 0;
  }

  /**
   * Resamples a template bitmask to match the detector grid size.
   */
  private resampleTemplate(
    template: TableTemplate,
    targetWidth: number,
    targetHeight: number,
  ): number[][] {
    // If sizes match, return as-is
    if (template.gridWidth === targetWidth && template.gridHeight === targetHeight) {
      return template.bitmask;
    }

    const resampled: number[][] = [];
    const scaleX = template.gridWidth / targetWidth;
    const scaleY = template.gridHeight / targetHeight;

    for (let y = 0; y < targetHeight; y++) {
      resampled[y] = [];
      for (let x = 0; x < targetWidth; x++) {
        const srcY = Math.min(Math.floor(y * scaleY), template.gridHeight - 1);
        const srcX = Math.min(Math.floor(x * scaleX), template.gridWidth - 1);
        resampled[y][x] = template.bitmask[srcY]?.[srcX] ?? 0;
      }
    }

    return resampled;
  }

  /**
   * Extracts a table from a matched template region.
   */
  private extractTableFromTemplate(
    template: TableTemplate,
    matchScore: number,
    elements: ReadonlyArray<TextElement>,
    config: DetectionConfig,
  ): DetectedTable | null {
    const [rx1, ry1, rx2, ry2] = template.tableRegion;

    const x1 = rx1 * config.pageWidth;
    const y1 = ry1 * config.pageHeight;
    const x2 = rx2 * config.pageWidth;
    const y2 = ry2 * config.pageHeight;

    // Find elements inside the template region
    const containedElements = elements.filter(
      (el) =>
        el.x + el.width / 2 >= x1 &&
        el.x + el.width / 2 <= x2 &&
        el.y + el.height / 2 >= y1 &&
        el.y + el.height / 2 <= y2,
    );

    if (containedElements.length === 0) {
      return null;
    }

    // Detect grid structure within the template region
    const rowGroups = this.clusterByCoordinate(containedElements, (el) => el.y, config.tolerance);
    const colGroups = this.clusterByCoordinate(containedElements, (el) => el.x, config.tolerance);

    const rows = rowGroups.length;
    const cols = colGroups.length;

    if (rows < template.minRows || cols < template.minCols) {
      return null;
    }

    // Build cells
    const cells: TableCell[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cellElements = containedElements.filter(
          (el) => rowGroups[r].includes(el) && colGroups[c].includes(el),
        );

        if (cellElements.length > 0) {
          const cx1 = Math.min(...cellElements.map((el) => el.x));
          const cy1 = Math.min(...cellElements.map((el) => el.y));
          const cx2 = Math.max(...cellElements.map((el) => el.x + el.width));
          const cy2 = Math.max(...cellElements.map((el) => el.y + el.height));

          cells.push({
            rowIndex: r,
            colIndex: c,
            x1: cx1,
            y1: cy1,
            x2: cx2,
            y2: cy2,
            content: cellElements.map((el) => el.text).join(' '),
          });
        } else {
          // Estimate empty cell position
          const rowYAvg = rowGroups[r].reduce((s, el) => s + el.y, 0) / rowGroups[r].length;
          const colXAvg = colGroups[c].reduce((s, el) => s + el.x, 0) / colGroups[c].length;
          const avgH = rowGroups[r].reduce((s, el) => s + el.height, 0) / rowGroups[r].length;
          const avgW = colGroups[c].reduce((s, el) => s + el.width, 0) / colGroups[c].length;

          cells.push({
            rowIndex: r,
            colIndex: c,
            x1: colXAvg,
            y1: rowYAvg,
            x2: colXAvg + avgW,
            y2: rowYAvg + avgH,
          });
        }
      }
    }

    // Detect header
    const firstRowEls = containedElements.filter((el) => rowGroups[0].includes(el));
    const avgFontSize =
      containedElements.reduce((s, el) => s + el.fontSize, 0) / containedElements.length;
    const hasHeader =
      firstRowEls.length > 0 &&
      (firstRowEls.some((el) => el.isBold) ||
        firstRowEls.some((el) => el.fontSize > avgFontSize * 1.1));

    return {
      id: `visual-${template.name}-${Date.now()}`,
      detectorName: this.getName(),
      x1,
      y1,
      x2,
      y2,
      rows,
      cols,
      cells,
      hasHeader,
      confidence: matchScore,
    };
  }

  /**
   * Clusters elements by a projection function within tolerance.
   */
  private clusterByCoordinate(
    elements: ReadonlyArray<TextElement>,
    project: (el: TextElement) => number,
    tolerance: number,
  ): TextElement[][] {
    if (elements.length === 0) return [];

    const sorted = [...elements].sort((a, b) => project(a) - project(b));
    const groups: TextElement[][] = [];
    let currentGroup: TextElement[] = [sorted[0]];
    let currentCenter = project(sorted[0]);

    for (let i = 1; i < sorted.length; i++) {
      const val = project(sorted[i]);
      if (Math.abs(val - currentCenter) <= tolerance) {
        currentGroup.push(sorted[i]);
        currentCenter = currentGroup.reduce((s, el) => s + project(el), 0) / currentGroup.length;
      } else {
        groups.push(currentGroup);
        currentGroup = [sorted[i]];
        currentCenter = val;
      }
    }
    groups.push(currentGroup);

    return groups;
  }
}
