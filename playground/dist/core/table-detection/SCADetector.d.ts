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
import { ITableDetector, DetectedTable, DetectionConfig, DetectorCategory } from './TableTypes';
import { TextElement } from '../../models/TextElement';
/**
 * SCA Detector implementation.
 */
export declare class SCADetector implements ITableDetector {
    getName(): string;
    getCategory(): DetectorCategory;
    getDefaultWeight(): number;
    detect(elements: ReadonlyArray<TextElement>, config: DetectionConfig): DetectedTable[];
    getConfidence(table: DetectedTable): number;
    private buildHistogram;
    private findSpikes;
    private findSpikesRelaxed;
    private mergeNearbySpikes;
    private selectBestColumns;
    private buildTableFromColumns;
    private groupElementsByY;
    private countUniqueRows;
    private estimateRowCount;
    private detectHeader;
}
//# sourceMappingURL=SCADetector.d.ts.map