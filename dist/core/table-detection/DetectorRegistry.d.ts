/**
 * Detector Registry
 *
 * Manages table detectors with configurable weights.
 * Follows SOLID:
 * - OCP: New detectors can be added without modifying registry
 * - DIP: Depends on ITableDetector abstraction
 * - SRP: Only manages detector lifecycle
 */
import { ITableDetector, DetectedTable, DetectionConfig, DetectorWeight, DetectorRegistryConfig } from './TableTypes';
import { TextElement } from '../../models/TextElement';
/**
 * Registry that manages table detectors and their execution.
 */
export declare class DetectorRegistry {
    private readonly detectors;
    private readonly config;
    constructor(config?: Partial<DetectorRegistryConfig>);
    /**
     * Registers a detector.
     */
    register(detector: ITableDetector): void;
    /**
     * Unregisters a detector by name.
     */
    unregister(name: string): boolean;
    /**
     * Gets a detector by name.
     */
    get(name: string): ITableDetector | undefined;
    /**
     * Gets all registered detector names.
     */
    getDetectorNames(): string[];
    /**
     * Runs all enabled detectors and merges results.
     * Results are sorted by confidence (highest first).
     */
    detectAll(elements: ReadonlyArray<TextElement>, config?: DetectionConfig): DetectedTable[];
    /**
     * Runs a specific detector by name.
     */
    detectWith(name: string, elements: ReadonlyArray<TextElement>, config?: DetectionConfig): DetectedTable[];
    /**
     * Updates detector weights.
     */
    updateWeights(weights: DetectorWeight[]): void;
    /**
     * Gets current detector weights.
     */
    getWeights(): DetectorWeight[];
}
/**
 * Creates a registry with all standard detectors registered.
 */
export declare function createStandardRegistry(config?: Partial<DetectorRegistryConfig>): DetectorRegistry;
//# sourceMappingURL=DetectorRegistry.d.ts.map