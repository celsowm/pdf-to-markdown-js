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
import { ITableDetector, DetectedTable, DetectionConfig, DetectorCategory } from './TableTypes';
import { TextElement } from '../../models/TextElement';
/**
 * Lattice detector implementation.
 */
export declare class LatticeDetector implements ITableDetector {
    getName(): string;
    getCategory(): DetectorCategory;
    getDefaultWeight(): number;
    detect(elements: ReadonlyArray<TextElement>, config: DetectionConfig): DetectedTable[];
    getConfidence(table: DetectedTable): number;
    /**
     * Groups text elements by Y position (rows).
     */
    private groupByYPosition;
    /**
     * Finds common column X positions across rows.
     */
    private findCommonColumnPositions;
    /**
     * Clusters numeric values within tolerance.
     */
    private clusterValues;
    /**
     * Builds a DetectedTable from rows and column positions.
     */
    private buildTable;
}
//# sourceMappingURL=LatticeDetector.d.ts.map