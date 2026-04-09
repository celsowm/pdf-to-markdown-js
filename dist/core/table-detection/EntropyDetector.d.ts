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
import { ITableDetector, DetectedTable, DetectionConfig, DetectorCategory } from './TableTypes';
import { TextElement } from '../../models/TextElement';
export declare class EntropyDetector implements ITableDetector {
    getName(): string;
    getCategory(): DetectorCategory;
    getDefaultWeight(): number;
    detect(elements: ReadonlyArray<TextElement>, config: DetectionConfig): DetectedTable[];
    getConfidence(table: DetectedTable): number;
    /**
     * Builds a binary signal from text elements.
     * Divides the page into horizontal scanlines; each scanline is 1 if
     * it contains text, 0 if it's whitespace.
     */
    private buildBinarySignal;
    /**
     * Computes entropy profile using a sliding window.
     * Entropy measures the alternation rate between text and whitespace.
     */
    private computeEntropyProfile;
    /**
     * Calculates Shannon entropy of a binary signal.
     * Higher entropy = more alternation between 0 and 1.
     */
    private calculateShannonEntropy;
    /**
     * Finds regions of high entropy that likely contain tables.
     */
    private findHighEntropyRegions;
    /**
     * Merges adjacent or overlapping entropy segments.
     */
    private mergeAdjacentSegments;
    /**
     * Builds a DetectedTable from an entropy-detected region.
     */
    private buildTableFromRegion;
    /**
     * Clusters elements by a projection function within tolerance.
     */
    private clusterByCoordinate;
}
//# sourceMappingURL=EntropyDetector.d.ts.map