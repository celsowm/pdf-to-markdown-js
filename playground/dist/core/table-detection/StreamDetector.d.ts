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
import { ITableDetector, DetectedTable, DetectionConfig, DetectorCategory } from './TableTypes';
import { TextElement } from '../../models/TextElement';
export declare class StreamDetector implements ITableDetector {
    getName(): string;
    getCategory(): DetectorCategory;
    getDefaultWeight(): number;
    detect(elements: ReadonlyArray<TextElement>, config: DetectionConfig): DetectedTable[];
    getConfidence(table: DetectedTable): number;
    /**
     * Finds vertical gaps (gutters) that define columns.
     */
    private findColumnBoundaries;
    /**
     * Finds horizontal gaps that define rows.
     */
    private findRowBoundaries;
    /**
     * Clusters numeric values that are close together.
     * Returns the center of each cluster.
     */
    private clusterValues;
    /**
     * Builds table from column and row boundaries.
     */
    private buildGridTable;
}
//# sourceMappingURL=StreamDetector.d.ts.map