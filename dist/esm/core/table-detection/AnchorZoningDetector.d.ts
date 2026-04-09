/**
 * Anchor Zoning Table Detector (Landmark-Based)
 *
 * Searches for common anchor keywords and defines zones around them.
 * Algorithm:
 * 1. Scan for anchor keywords (Total, Name, Date, Amount, etc.)
 * 2. When found, define a search zone around the keyword
 * 3. Look for aligned text elements within the zone
 * 4. If enough aligned elements found, build a table
 * Best for: Fixed-form documents like invoices, receipts, forms
 *
 * SOLID:
 * - SRP: Only handles landmark-based detection
 * - OCP: Implements ITableDetector, can be replaced
 * - LSP: Interchangeable with other detectors
 * - DIP: Depends on ITableDetector abstraction
 */
import { ITableDetector, DetectedTable, DetectionConfig, DetectorCategory } from './TableTypes';
import { TextElement } from '../../models/TextElement';
/**
 * Anchor Zoning detector implementation.
 */
export declare class AnchorZoningDetector implements ITableDetector {
    getName(): string;
    getCategory(): DetectorCategory;
    getDefaultWeight(): number;
    detect(elements: ReadonlyArray<TextElement>, config: DetectionConfig): DetectedTable[];
    getConfidence(table: DetectedTable): number;
    private findAnchors;
    private buildZones;
    private clusterAnchors;
    private isAnchorElement;
    private buildTableFromZone;
    private findColumnsFromZone;
    private buildGlobalAnchorTable;
    private groupElementsByY;
    private clusterPositions;
    private constructTable;
    private detectHeader;
}
//# sourceMappingURL=AnchorZoningDetector.d.ts.map