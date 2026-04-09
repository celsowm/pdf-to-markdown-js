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
import { ITableDetector, DetectedTable, DetectionConfig, DetectorCategory } from './TableTypes';
import { TextElement } from '../../models/TextElement';
export declare class MorphologyDetector implements ITableDetector {
    getName(): string;
    getCategory(): DetectorCategory;
    getDefaultWeight(): number;
    detect(elements: ReadonlyArray<TextElement>, config: DetectionConfig): DetectedTable[];
    getConfidence(table: DetectedTable): number;
    /**
     * Dilates a text element's bounding box by the tolerance amount.
     */
    private dilateBox;
    /**
     * Checks if two bounding boxes overlap.
     */
    private boxesOverlap;
    /**
     * Merges two bounding boxes into their union.
     */
    private mergeBoxes;
    /**
     * Merges overlapping boxes into connected components (blobs)
     * using a union-find approach.
     */
    private mergeOverlappingBoxes;
    /**
     * Determines if a blob looks like a table based on shape analysis.
     */
    private isTableLike;
    /**
     * Counts the number of clusters in a set of values within tolerance.
     */
    private countClusters;
    /**
     * Builds a DetectedTable from a blob by analyzing internal structure.
     */
    private buildTableFromBlob;
    /**
     * Clusters elements by a projection function within tolerance.
     */
    private clusterElements;
}
//# sourceMappingURL=MorphologyDetector.d.ts.map