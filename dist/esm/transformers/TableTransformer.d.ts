/**
 * Table Transformer
 *
 * Orchestrates table detection using multiple detector techniques.
 * Users can configure weights to favor specific detection methods.
 *
 * SOLID:
 * - OCP: New detectors can be added via registry
 * - DIP: Depends on ITableDetector abstraction
 * - SRP: Only orchestrates detection, doesn't implement algorithms
 */
import { TextElement } from '../models/TextElement';
import { MarkdownNode } from '../models/MarkdownNode';
import { MarkdownTransformer } from './MarkdownTransformer';
import { DetectorRegistry, DetectorRegistryConfig } from '../core/table-detection';
/**
 * Configuration for table transformation.
 */
export interface TableTransformerConfig {
    /**
     * Detector registry configuration (weights, thresholds).
     */
    readonly registry?: Partial<DetectorRegistryConfig>;
    /**
     * Detection tolerance.
     */
    readonly tolerance?: number;
    /**
     * Whether to auto-detect headers.
     */
    readonly autoDetectHeader?: boolean;
    /**
     * Minimum confidence threshold (0-1).
     */
    readonly minConfidence?: number;
}
/**
 * Transformer that detects and converts tables to Markdown.
 *
 * Uses a registry of detection techniques:
 * - **Lattice**: Vector-based line detection (bordered tables)
 * - **Stream**: Whitespace projection profiles (borderless tables)
 * - **R-XY-Cut**: Recursive structural slicing
 * - **Anchor Zoning**: Landmark-based keyword detection
 * - **SCA**: Sparse Columnar Alignment histograms
 * - **Graph-Based**: Relational nearest-neighbor
 * - **Morphology**: Shape-based box dilation
 * - **Visual Signature**: Template matching
 * - **Entropy**: Signal processing for table regions
 */
export declare class TableTransformer implements MarkdownTransformer {
    private readonly registry;
    private readonly config;
    constructor(config?: TableTransformerConfig);
    getPriority(): number;
    canTransform(elements: TextElement[]): boolean;
    transform(elements: TextElement[], _allElements: TextElement[]): MarkdownNode[];
    /**
     * Gets the detector registry for advanced configuration.
     */
    getRegistry(): DetectorRegistry;
    /**
     * Converts detected tables to Markdown nodes.
     */
    private convertTablesToMarkdown;
    /**
     * Builds a Markdown table node from a detected table.
     */
    private buildMarkdownTable;
    /**
     * Assigns text elements to table cells based on position.
     */
    private assignElementsToCells;
    /**
     * Finds which cell contains a text element.
     */
    private findElementCell;
}
//# sourceMappingURL=TableTransformer.d.ts.map