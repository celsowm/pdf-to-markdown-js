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
import { ITableDetector, DetectedTable, DetectionConfig, DetectorCategory } from './TableTypes';
import { TextElement } from '../../models/TextElement';
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
export declare const DEFAULT_VISUAL_SIGNATURE_CONFIG: VisualSignatureConfig;
export declare class VisualSignatureDetector implements ITableDetector {
    private readonly config;
    constructor(config?: Partial<VisualSignatureConfig>);
    getName(): string;
    getCategory(): DetectorCategory;
    getDefaultWeight(): number;
    detect(elements: ReadonlyArray<TextElement>, config: DetectionConfig): DetectedTable[];
    getConfidence(table: DetectedTable): number;
    /**
     * Generates a low-resolution bitmask from text elements.
     * Each cell is 1 if it contains text, 0 otherwise.
     */
    private generateBitmask;
    /**
     * Computes match score between a generated bitmask and a template.
     * Uses normalized overlap (Jaccard-like similarity adapted for templates).
     */
    private computeMatchScore;
    /**
     * Resamples a template bitmask to match the detector grid size.
     */
    private resampleTemplate;
    /**
     * Extracts a table from a matched template region.
     */
    private extractTableFromTemplate;
    /**
     * Clusters elements by a projection function within tolerance.
     */
    private clusterByCoordinate;
}
//# sourceMappingURL=VisualSignatureDetector.d.ts.map