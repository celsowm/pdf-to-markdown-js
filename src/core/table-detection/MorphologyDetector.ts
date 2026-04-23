/**
 * Morphology-Based Table Detector (Shape Bounding Box Dilation)
 *
 * Dilates (stretches) text bounding boxes by tolerance, merges overlapping
 * boxes into visual "blobs", then analyzes blob shapes. Table regions form
 * rectangular clusters which are split back into cell-sized regions.
 *
 * Best for: chaotic layouts where text blocks are fragmented.
 *
 * Algorithm:
 * 1. Dilate each text element's bounding box by tolerance
 * 2. Merge overlapping dilated boxes into connected components (blobs)
 * 3. Analyze blob shape: table regions form rectangular clusters
 * 4. Split large blobs back into cell-sized regions using internal gaps
 * 5. Validate rectangularity and grid regularity
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

interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface Blob {
  boxes: BoundingBox[];
  mergedBox: BoundingBox;
}

export class MorphologyDetector implements ITableDetector {
  getName(): string {
    return 'Morphology';
  }

  getCategory(): DetectorCategory {
    return 'shape';
  }

  getDefaultWeight(): number {
    return 0.3;
  }

  detect(elements: ReadonlyArray<TextElement>, config: DetectionConfig, _lines?: ReadonlyArray<LineSegment>, _fillRegions?: ReadonlyArray<FillRegion>): DetectedTable[] {
    if (elements.length < config.minRows * config.minCols) {
      return [];
    }

    // Step 1: Dilate bounding boxes
    const dilatedBoxes = elements.map((el) => this.dilateBox(el, config.tolerance));

    // Step 2: Merge overlapping boxes into blobs
    const blobs = this.mergeOverlappingBoxes(dilatedBoxes);

    // Step 3: Filter blobs that look like tables
    const tableBlobs = blobs.filter((blob) => this.isTableLike(blob, config));

    if (tableBlobs.length === 0) {
      return [];
    }

    // Step 4: Convert blobs to DetectedTable objects
    const tables: DetectedTable[] = [];
    for (const blob of tableBlobs) {
      const table = this.buildTableFromBlob(blob, elements, config);
      if (table) {
        tables.push(table);
      }
    }

    return tables;
  }

  getConfidence(table: DetectedTable): number {
    // Confidence based on rectangularity and cell coverage
    const blobArea = (table.x2 - table.x1) * (table.y2 - table.y1);
    if (blobArea === 0) return 0;

    const cellArea = table.cells.reduce(
      (sum, cell) => sum + (cell.x2 - cell.x1) * (cell.y2 - cell.y1),
      0,
    );

    const coverageScore = Math.min(cellArea / blobArea, 1.0) * 0.4;
    const gridScore = Math.min((table.rows * table.cols) / 20, 0.4);
    const minDimensionScore = table.rows >= 2 && table.cols >= 2 ? 0.2 : 0;

    return Math.min(coverageScore + gridScore + minDimensionScore, 1.0);
  }

  /**
   * Dilates a text element's bounding box by the tolerance amount.
   */
  private dilateBox(element: TextElement, tolerance: number): BoundingBox {
    return {
      x1: element.x - tolerance,
      y1: element.y - tolerance,
      x2: element.x + element.width + tolerance,
      y2: element.y + element.height + tolerance,
    };
  }

  /**
   * Checks if two bounding boxes overlap.
   */
  private boxesOverlap(a: BoundingBox, b: BoundingBox): boolean {
    return !(a.x2 < b.x1 || b.x2 < a.x1 || a.y2 < b.y1 || b.y2 < a.y1);
  }

  /**
   * Merges two bounding boxes into their union.
   */
  private mergeBoxes(a: BoundingBox, b: BoundingBox): BoundingBox {
    return {
      x1: Math.min(a.x1, b.x1),
      y1: Math.min(a.y1, b.y1),
      x2: Math.max(a.x2, b.x2),
      y2: Math.max(a.y2, b.y2),
    };
  }

  /**
   * Merges overlapping boxes into connected components (blobs)
   * using a union-find approach.
   */
  private mergeOverlappingBoxes(boxes: BoundingBox[]): Blob[] {
    if (boxes.length === 0) return [];

    // Union-Find data structure
    const parent: number[] = boxes.map((_, i) => i);
    const find = (x: number): number => {
      if (parent[x] !== x) {
        parent[x] = find(parent[x]); // Path compression
      }
      return parent[x];
    };
    const union = (a: number, b: number): void => {
      parent[find(a)] = find(b);
    };

    // Find all overlapping pairs and union them
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        if (this.boxesOverlap(boxes[i], boxes[j])) {
          union(i, j);
        }
      }
    }

    // Group boxes by their root
    const groups = new Map<number, number[]>();
    for (let i = 0; i < boxes.length; i++) {
      const root = find(i);
      if (!groups.has(root)) {
        groups.set(root, []);
      }
      groups.get(root)!.push(i);
    }

    // Build blobs from groups
    const blobs: Blob[] = [];
    for (const indices of groups.values()) {
      const groupBoxes = indices.map((i) => boxes[i]);
      const mergedBox = groupBoxes.reduce((acc, box) => this.mergeBoxes(acc, box));
      blobs.push({ boxes: groupBoxes, mergedBox });
    }

    return blobs;
  }

  /**
   * Determines if a blob looks like a table based on shape analysis.
   */
  private isTableLike(blob: Blob, config: DetectionConfig): boolean {
    const { mergedBox } = blob;
    const width = mergedBox.x2 - mergedBox.x1;
    const height = mergedBox.y2 - mergedBox.y1;

    // Filter out tiny blobs (likely just text lines)
    const minWidth = config.tolerance * config.minCols * 3;
    const minHeight = config.tolerance * config.minRows * 3;
    if (width < minWidth || height < minHeight) {
      return false;
    }

    // Filter out blobs that are too tall and narrow (likely paragraphs)
    const aspectRatio = height / width;
    if (aspectRatio > 5) {
      return false; // Too tall and narrow
    }

    // Table-like blobs should have multiple elements
    if (blob.boxes.length < config.minRows * config.minCols) {
      return false;
    }

    // Check for internal structure: count distinct X and Y clusters
    const xPositions = blob.boxes.flatMap((b) => [b.x1, b.x2]);
    const yPositions = blob.boxes.flatMap((b) => [b.y1, b.y2]);

    const distinctX = this.countClusters(xPositions, config.tolerance);
    const distinctY = this.countClusters(yPositions, config.tolerance);

    // Table should have multiple distinct row and column boundaries
    return distinctX >= config.minCols + 1 && distinctY >= config.minRows + 1;
  }

  /**
   * Counts the number of clusters in a set of values within tolerance.
   */
  private countClusters(values: number[], tolerance: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    let clusters = 1;

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] > tolerance * 2) {
        clusters++;
      }
    }

    return clusters;
  }

  /**
   * Builds a DetectedTable from a blob by analyzing internal structure.
   */
  private buildTableFromBlob(
    blob: Blob,
    elements: ReadonlyArray<TextElement>,
    config: DetectionConfig,
  ): DetectedTable | null {
    const { mergedBox } = blob;

    // Find elements inside the blob
    const containedElements = elements.filter(
      (el) =>
        el.x >= mergedBox.x1 &&
        el.x + el.width <= mergedBox.x2 &&
        el.y >= mergedBox.y1 &&
        el.y + el.height <= mergedBox.y2,
    );

    if (containedElements.length === 0) return null;

    // Detect row boundaries by clustering Y positions
    const rowGroups = this.clusterElements(containedElements, (el) => el.y, config.tolerance);

    // Detect column boundaries by clustering X positions
    const colGroups = this.clusterElements(containedElements, (el) => el.x, config.tolerance);

    const rows = rowGroups.length;
    const cols = colGroups.length;

    if (rows < config.minRows || cols < config.minCols) {
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
          // Empty cell: estimate from grid
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
    const firstRowElements = containedElements.filter((el) => rowGroups[0].includes(el));
    const avgFontSize =
      containedElements.reduce((s, el) => s + el.fontSize, 0) / containedElements.length;
    const hasHeader =
      firstRowElements.length > 0 &&
      (firstRowElements.some((el) => el.isBold) ||
        firstRowElements.some((el) => el.fontSize > avgFontSize * 1.1));

    return {
      id: `morph-${Date.now()}`,
      detectorName: this.getName(),
      x1: mergedBox.x1,
      y1: mergedBox.y1,
      x2: mergedBox.x2,
      y2: mergedBox.y2,
      rows,
      cols,
      cells,
      hasHeader,
      confidence: 0,
    };
  }

  /**
   * Clusters elements by a projection function within tolerance.
   */
  private clusterElements(
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
