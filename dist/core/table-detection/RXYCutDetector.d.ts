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
import { ITableDetector, DetectedTable, DetectionConfig, DetectorCategory } from './TableTypes';
import { TextElement } from '../../models/TextElement';
/**
 * R-XY-Cut detector implementation.
 */
export declare class RXYCutDetector implements ITableDetector {
    getName(): string;
    getCategory(): DetectorCategory;
    getDefaultWeight(): number;
    detect(elements: ReadonlyArray<TextElement>, config: DetectionConfig): DetectedTable[];
    getConfidence(table: DetectedTable): number;
    private recursiveCut;
    private findLargestGap;
    private getGapThreshold;
    private buildRegion;
    private collectLeaves;
    private buildTableFromRegion;
    private buildTableFromProjection;
    private groupElementsByY;
    private findConsistentColumns;
    private clusterPositions;
    private computeRegularity;
}
//# sourceMappingURL=RXYCutDetector.d.ts.map