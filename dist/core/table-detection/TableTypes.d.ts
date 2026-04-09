/**
 * Shared types for table detection system.
 * Following SOLID: Interface Segregation + Dependency Inversion
 */
import { TextElement } from '../../models/TextElement';
/**
 * Represents a cell in a detected table.
 */
export interface TableCell {
    readonly rowIndex: number;
    readonly colIndex: number;
    readonly x1: number;
    readonly y1: number;
    readonly x2: number;
    readonly y2: number;
    readonly content?: string;
}
/**
 * Represents a detected table with metadata.
 */
export interface DetectedTable {
    readonly id: string;
    readonly detectorName: string;
    readonly x1: number;
    readonly y1: number;
    readonly x2: number;
    readonly y2: number;
    readonly rows: number;
    readonly cols: number;
    readonly cells: TableCell[];
    readonly hasHeader: boolean;
    readonly confidence: number;
}
/**
 * Configuration for table detection.
 */
export interface DetectionConfig {
    /**
     * Tolerance for alignment detection (in user space units).
     */
    readonly tolerance: number;
    /**
     * Page dimensions.
     */
    readonly pageWidth: number;
    readonly pageHeight: number;
    /**
     * Minimum table size.
     */
    readonly minRows: number;
    readonly minCols: number;
}
/**
 * Default detection configuration.
 */
export declare const DEFAULT_DETECTION_CONFIG: DetectionConfig;
/**
 * Detector category for classification.
 */
export type DetectorCategory = 'vector' | 'whitespace' | 'structural' | 'landmark' | 'statistical' | 'relational' | 'shape' | 'template' | 'signal';
/**
 * Interface for table detectors (DIP + ISP).
 * Each detector implements one technique following SRP.
 */
export interface ITableDetector {
    /**
     * Detects tables in text elements.
     */
    detect(elements: ReadonlyArray<TextElement>, config: DetectionConfig): DetectedTable[];
    /**
     * Returns the detector name.
     */
    getName(): string;
    /**
     * Returns the detector category.
     */
    getCategory(): DetectorCategory;
    /**
     * Calculates confidence score for a detected table (0-1).
     */
    getConfidence(table: DetectedTable): number;
    /**
     * Returns the default weight for this detector.
     */
    getDefaultWeight(): number;
}
/**
 * Detector weight configuration.
 */
export interface DetectorWeight {
    name: string;
    weight: number;
    enabled: boolean;
}
/**
 * Registry configuration.
 */
export interface DetectorRegistryConfig {
    readonly weights: DetectorWeight[];
    readonly minConfidence: number;
    readonly maxTables: number;
}
/**
 * Default detector registry configuration.
 */
export declare const DEFAULT_REGISTRY_CONFIG: DetectorRegistryConfig;
//# sourceMappingURL=TableTypes.d.ts.map