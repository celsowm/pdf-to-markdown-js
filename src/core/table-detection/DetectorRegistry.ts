/**
 * Detector Registry
 *
 * Manages table detectors with configurable weights.
 * Follows SOLID:
 * - OCP: New detectors can be added without modifying registry
 * - DIP: Depends on ITableDetector abstraction
 * - SRP: Only manages detector lifecycle
 */

import {
  ITableDetector,
  DetectedTable,
  DetectionConfig,
  DEFAULT_DETECTION_CONFIG,
  DetectorWeight,
  DetectorRegistryConfig,
  DEFAULT_REGISTRY_CONFIG,
} from './TableTypes';
import { TextElement } from '../../models/TextElement';

// Import all detectors
import { LatticeDetector } from './LatticeDetector';
import { StreamDetector } from './StreamDetector';
import { RXYCutDetector } from './RXYCutDetector';
import { AnchorZoningDetector } from './AnchorZoningDetector';
import { SCADetector } from './SCADetector';
import { GraphBasedDetector } from './GraphBasedDetector';
import { MorphologyDetector } from './MorphologyDetector';
import { VisualSignatureDetector } from './VisualSignatureDetector';
import { EntropyDetector } from './EntropyDetector';

/**
 * Registry that manages table detectors and their execution.
 */
export class DetectorRegistry {
  private readonly detectors: Map<string, ITableDetector> = new Map();
  private readonly config: DetectorRegistryConfig;

  constructor(config?: Partial<DetectorRegistryConfig>) {
    this.config = { ...DEFAULT_REGISTRY_CONFIG, ...config };
  }

  /**
   * Registers a detector.
   */
  register(detector: ITableDetector): void {
    this.detectors.set(detector.getName(), detector);
  }

  /**
   * Unregisters a detector by name.
   */
  unregister(name: string): boolean {
    return this.detectors.delete(name);
  }

  /**
   * Gets a detector by name.
   */
  get(name: string): ITableDetector | undefined {
    return this.detectors.get(name);
  }

  /**
   * Gets all registered detector names.
   */
  getDetectorNames(): string[] {
    return Array.from(this.detectors.keys());
  }

  /**
   * Runs all enabled detectors and merges results.
   * Results are sorted by confidence (highest first).
   */
  detectAll(
    elements: ReadonlyArray<TextElement>,
    config: DetectionConfig = DEFAULT_DETECTION_CONFIG,
  ): DetectedTable[] {
    const allTables: DetectedTable[] = [];

    for (const weight of this.config.weights) {
      if (!weight.enabled) continue;

      const detector = this.detectors.get(weight.name);
      if (!detector) continue;

      try {
        const tables = detector.detect(elements, config);

        // Calculate confidence for each table
        for (const table of tables) {
          const rawConfidence = detector.getConfidence(table);
          const weightedConfidence = rawConfidence * weight.weight;

          // Create new table with updated confidence
          allTables.push({
            ...table,
            confidence: weightedConfidence,
          });
        }
      } catch (error) {
        console.warn(`Detector ${weight.name} failed:`, error);
      }
    }

    // Sort by confidence (highest first)
    allTables.sort((a, b) => b.confidence - a.confidence);

    // Filter by minimum confidence
    const filtered = allTables.filter((t) => t.confidence >= this.config.minConfidence);

    // Limit to max tables
    return filtered.slice(0, this.config.maxTables);
  }

  /**
   * Runs a specific detector by name.
   */
  detectWith(
    name: string,
    elements: ReadonlyArray<TextElement>,
    config: DetectionConfig = DEFAULT_DETECTION_CONFIG,
  ): DetectedTable[] {
    const detector = this.detectors.get(name);
    if (!detector) {
      throw new Error(`Detector ${name} not found`);
    }

    const tables = detector.detect(elements, config);
    const weight = this.config.weights.find((w) => w.name === name);
    const weightValue = weight?.weight ?? 1.0;

    return tables.map((table) => ({
      ...table,
      confidence: detector.getConfidence(table) * weightValue,
    }));
  }

  /**
   * Updates detector weights.
   */
  updateWeights(weights: DetectorWeight[]): void {
    for (const weight of weights) {
      const existing = this.config.weights.find((w) => w.name === weight.name);
      if (existing) {
        existing.weight = weight.weight;
        existing.enabled = weight.enabled;
      } else {
        this.config.weights.push(weight);
      }
    }
  }

  /**
   * Gets current detector weights.
   */
  getWeights(): DetectorWeight[] {
    return [...this.config.weights];
  }
}

/**
 * Creates a registry with all standard detectors registered.
 */
export function createStandardRegistry(config?: Partial<DetectorRegistryConfig>): DetectorRegistry {
  const registry = new DetectorRegistry(config);

  // Register all detectors
  registry.register(new LatticeDetector());
  registry.register(new StreamDetector());
  registry.register(new RXYCutDetector());
  registry.register(new AnchorZoningDetector());
  registry.register(new SCADetector());
  registry.register(new GraphBasedDetector());
  registry.register(new MorphologyDetector());
  registry.register(new VisualSignatureDetector());
  registry.register(new EntropyDetector());

  return registry;
}
