/**
 * Shared types for table detection system.
 * Following SOLID: Interface Segregation + Dependency Inversion
 */

import type { TextElement } from '../../models/TextElement';
import type { LineSegment, FillRegion } from '../core/TextExtractor';


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
export const DEFAULT_DETECTION_CONFIG: DetectionConfig = {
  tolerance: 3,
  pageWidth: 612,
  pageHeight: 792,
  minRows: 2,
  minCols: 2,
};

/**
 * Detector category for classification.
 */
export type DetectorCategory =
  | 'vector' // Lattice
  | 'whitespace' // Stream
  | 'structural' // R-XY-Cut
  | 'landmark' // Anchor Zoning
  | 'statistical' // SCA
  | 'relational' // Graph-Based
  | 'shape' // Morphology
  | 'template' // Visual Signature
  | 'signal'; // Entropy

/**
 * Interface for table detectors (DIP + ISP).
 * Each detector implements one technique following SRP.
 */
export interface ITableDetector {
  /**
   * Detects tables in text elements and optional lines/fill regions.
   */
  detect(
    elements: ReadonlyArray<TextElement>,
    config: DetectionConfig,
    lines?: ReadonlyArray<LineSegment>,
    fillRegions?: ReadonlyArray<FillRegion>,
  ): DetectedTable[];

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
export const DEFAULT_REGISTRY_CONFIG: DetectorRegistryConfig = {
  weights: [
    { name: 'Lattice', weight: 0.6, enabled: true },
    { name: 'Stream', weight: 0.2, enabled: true }, // Reduced weight further after tuning
    { name: 'RXYCut', weight: 0.5, enabled: true },
    { name: 'AnchorZoning', weight: 0.5, enabled: true },
    { name: 'SCA', weight: 0.9, enabled: true }, // Increased weight after tuning
    { name: 'GraphBased', weight: 0.4, enabled: true },
    { name: 'Background', weight: 0.7, enabled: true },
    { name: 'Morphology', weight: 0.3, enabled: false }, // Expensive
    { name: 'VisualSignature', weight: 0.9, enabled: false }, // Needs templates
    { name: 'Entropy', weight: 0.3, enabled: true },
  ],
  minConfidence: 0.4,
  maxTables: 10,
};
