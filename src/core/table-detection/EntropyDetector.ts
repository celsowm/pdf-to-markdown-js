/**
 * Entropy-Based Table Detector (Signal Processing for Text/Whitespace Alternation)
 *
 * Scans the page with a sliding window, counting alternations between
 * "text present" and "whitespace" in each window. High entropy = frequent
 * alternation = likely table region. Low entropy = mostly text or whitespace.
 *
 * Best for: processing varied document types where tables need to be located first.
 *
 * Algorithm:
 * 1. Create a binary signal: for each scanline, 1 = text present, 0 = whitespace
 * 2. Apply sliding window across the signal
 * 3. Compute entropy (alternation rate) within each window
 * 4. Identify high-entropy regions as table candidates
 * 5. Merge adjacent high-entropy regions into table bounding boxes
 * 6. Extract grid structure within detected regions
 */

import {
  ITableDetector,
  DetectedTable,
  TableCell,
  DetectionConfig,
  DetectorCategory,
} from './TableTypes';
import { TextElement } from '../../models/TextElement';

interface EntropyRegion {
  readonly yStart: number;
  readonly yEnd: number;
  readonly avgEntropy: number;
  readonly elements: TextElement[];
}

export class EntropyDetector implements ITableDetector {
  getName(): string {
    return 'Entropy';
  }

  getCategory(): DetectorCategory {
    return 'signal';
  }

  getDefaultWeight(): number {
    return 0.3;
  }

  detect(elements: ReadonlyArray<TextElement>, config: DetectionConfig): DetectedTable[] {
    if (elements.length < config.minRows * config.minCols) {
      return [];
    }

    // Step 1: Build binary signal from scanlines
    const { signal } = this.buildBinarySignal(elements, config);

    // Step 2: Compute entropy with sliding window
    const entropyProfile = this.computeEntropyProfile(signal, config);

    // Step 3: Find high-entropy regions
    const highEntropyRegions = this.findHighEntropyRegions(entropyProfile, elements, config);

    if (highEntropyRegions.length === 0) {
      return [];
    }

    // Step 4: Build tables from regions
    const tables: DetectedTable[] = [];
    for (const region of highEntropyRegions) {
      const table = this.buildTableFromRegion(region, config);
      if (table) {
        tables.push(table);
      }
    }

    return tables;
  }

  getConfidence(table: DetectedTable): number {
    // Confidence based on entropy strength and grid quality
    const cellDensity = table.cells.length / (table.rows * table.cols);
    const gridScore = cellDensity * 0.5;
    const sizeScore = Math.min((table.rows * table.cols) / 10, 0.5);
    return Math.min(gridScore + sizeScore, 1.0);
  }

  /**
   * Builds a binary signal from text elements.
   * Divides the page into horizontal scanlines; each scanline is 1 if
   * it contains text, 0 if it's whitespace.
   */
  private buildBinarySignal(
    elements: ReadonlyArray<TextElement>,
    config: DetectionConfig,
  ): { signal: number[]; lineHeight: number; totalLines: number } {
    // Determine scanline height based on average text height
    const avgHeight = elements.reduce((sum, el) => sum + el.height, 0) / elements.length;
    const lineHeight = Math.max(avgHeight * 0.5, config.tolerance);
    const totalLines = Math.ceil(config.pageHeight / lineHeight);

    const signal = new Array(totalLines).fill(0);

    // Mark lines that contain text
    for (const el of elements) {
      const topLine = Math.floor(el.y / lineHeight);
      const bottomLine = Math.floor((el.y + el.height) / lineHeight);

      for (let line = topLine; line <= bottomLine && line < totalLines; line++) {
        if (line >= 0) {
          signal[line] = 1;
        }
      }
    }

    return { signal, lineHeight, totalLines };
  }

  /**
   * Computes entropy profile using a sliding window.
   * Entropy measures the alternation rate between text and whitespace.
   */
  private computeEntropyProfile(
    signal: number[],
    config: DetectionConfig,
  ): { entropies: number[]; windowSize: number } {
    // Window size: enough to capture several row cycles of a table
    const windowSize = Math.max(Math.ceil(config.pageHeight / (config.tolerance * 10)), 5);

    const entropies: number[] = [];

    for (let i = 0; i < signal.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(signal.length, i + Math.floor(windowSize / 2));
      const window = signal.slice(start, end);

      entropies.push(this.calculateShannonEntropy(window));
    }

    return { entropies, windowSize };
  }

  /**
   * Calculates Shannon entropy of a binary signal.
   * Higher entropy = more alternation between 0 and 1.
   */
  private calculateShannonEntropy(signal: number[]): number {
    if (signal.length === 0) return 0;

    const ones = signal.filter((v) => v === 1).length;
    const zeros = signal.length - ones;

    const p1 = ones / signal.length;
    const p0 = zeros / signal.length;

    let entropy = 0;
    if (p1 > 0) {
      entropy -= p1 * Math.log2(p1);
    }
    if (p0 > 0) {
      entropy -= p0 * Math.log2(p0);
    }

    // Normalize to 0-1 range (max entropy for binary is 1.0)
    return entropy;
  }

  /**
   * Finds regions of high entropy that likely contain tables.
   */
  private findHighEntropyRegions(
    entropyProfile: { entropies: number[]; windowSize: number },
    elements: ReadonlyArray<TextElement>,
    config: DetectionConfig,
  ): EntropyRegion[] {
    const { entropies, windowSize } = entropyProfile;

    if (entropies.length === 0) return [];

    // Compute entropy threshold: regions above the mean + std deviation
    const meanEntropy = entropies.reduce((sum, e) => sum + e, 0) / entropies.length;
    const variance =
      entropies.reduce((sum, e) => sum + (e - meanEntropy) ** 2, 0) / entropies.length;
    const stdDev = Math.sqrt(variance);
    const threshold = meanEntropy + stdDev * 0.3;

    // Find contiguous high-entropy segments
    const segments: { start: number; end: number; avgEntropy: number }[] = [];
    let inSegment = false;
    let segmentStart = 0;
    let segmentSum = 0;
    let segmentCount = 0;

    for (let i = 0; i < entropies.length; i++) {
      if (entropies[i] >= threshold) {
        if (!inSegment) {
          inSegment = true;
          segmentStart = i;
          segmentSum = 0;
          segmentCount = 0;
        }
        segmentSum += entropies[i];
        segmentCount++;
      } else {
        if (inSegment && segmentCount > 0) {
          segments.push({
            start: segmentStart,
            end: i - 1,
            avgEntropy: segmentSum / segmentCount,
          });
        }
        inSegment = false;
      }
    }

    // Close last segment
    if (inSegment && segmentCount > 0) {
      segments.push({
        start: segmentStart,
        end: entropies.length - 1,
        avgEntropy: segmentSum / segmentCount,
      });
    }

    // Filter segments that are too small to be tables
    const lineHeight =
      elements.length > 0
        ? elements.reduce((s, el) => s + el.height, 0) / elements.length
        : config.tolerance;
    const minLines = config.minRows;

    const validSegments = segments.filter((seg) => seg.end - seg.start >= minLines);

    if (validSegments.length === 0) return [];

    // Merge adjacent segments (tables might have slight entropy dips)
    const mergedSegments = this.mergeAdjacentSegments(validSegments, windowSize);

    // Convert segments to EntropyRegions
    const regions: EntropyRegion[] = [];
    for (const seg of mergedSegments) {
      const yStart = seg.start * lineHeight;
      const yEnd = seg.end * lineHeight;

      // Find elements within this Y range
      const regionElements = elements.filter((el) => el.y + el.height >= yStart && el.y <= yEnd);

      if (regionElements.length >= config.minRows * config.minCols) {
        regions.push({
          yStart,
          yEnd,
          avgEntropy: seg.avgEntropy,
          elements: regionElements,
        });
      }
    }

    return regions;
  }

  /**
   * Merges adjacent or overlapping entropy segments.
   */
  private mergeAdjacentSegments(
    segments: { start: number; end: number; avgEntropy: number }[],
    windowSize: number,
  ): { start: number; end: number; avgEntropy: number }[] {
    if (segments.length === 0) return [];

    const merged = [{ ...segments[0] }];

    for (let i = 1; i < segments.length; i++) {
      const last = merged[merged.length - 1];
      const gap = segments[i].start - last.end;

      // Merge if segments are close enough (within 1 window size)
      if (gap <= windowSize * 2) {
        last.end = Math.max(last.end, segments[i].end);
        last.avgEntropy = (last.avgEntropy + segments[i].avgEntropy) / 2;
      } else {
        merged.push({ ...segments[i] });
      }
    }

    return merged;
  }

  /**
   * Builds a DetectedTable from an entropy-detected region.
   */
  private buildTableFromRegion(
    region: EntropyRegion,
    config: DetectionConfig,
  ): DetectedTable | null {
    const elements = region.elements;

    if (elements.length < config.minRows * config.minCols) {
      return null;
    }

    // Compute bounding box
    const x1 = Math.min(...elements.map((el) => el.x));
    const y1 = region.yStart;
    const x2 = Math.max(...elements.map((el) => el.x + el.width));
    const y2 = region.yEnd;

    // Detect row and column structure
    const rowGroups = this.clusterByCoordinate(elements, (el) => el.y, config.tolerance);
    const colGroups = this.clusterByCoordinate(elements, (el) => el.x, config.tolerance);

    const rows = rowGroups.length;
    const cols = colGroups.length;

    if (rows < config.minRows || cols < config.minCols) {
      return null;
    }

    // Build cells
    const cells: TableCell[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cellElements = elements.filter(
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
          // Empty cell: estimate position
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
    const firstRowEls = elements.filter((el) => rowGroups[0].includes(el));
    const avgFontSize = elements.reduce((s, el) => s + el.fontSize, 0) / elements.length;
    const hasHeader =
      firstRowEls.length > 0 &&
      (firstRowEls.some((el) => el.isBold) ||
        firstRowEls.some((el) => el.fontSize > avgFontSize * 1.1));

    return {
      id: `entropy-${Date.now()}`,
      detectorName: this.getName(),
      x1,
      y1,
      x2,
      y2,
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
