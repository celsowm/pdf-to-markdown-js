/**
 * Detector Registry
 *
 * Manages table detectors with configurable weights.
 * Follows SOLID:
 * - OCP: New detectors can be added without modifying registry
 * - DIP: Depends on ITableDetector abstraction
 * - SRP: Only manages detector lifecycle
 */

import type {
  ITableDetector,
  DetectedTable,
  DetectionConfig,
  DetectorWeight,
  DetectorRegistryConfig} from './TableTypes';
import {
  DEFAULT_DETECTION_CONFIG,
  DEFAULT_REGISTRY_CONFIG,
} from './TableTypes';
import type { TextElement } from '../../models/TextElement';

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
          if (rawConfidence <= 0) continue;
          
          const weightedConfidence = rawConfidence * weight.weight;
          if (weightedConfidence < this.config.minConfidence) continue;

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

    // Deduplicate overlapping tables
    const deduplicated = this.mergeOverlappingTables(allTables);

    // Filter by minimum confidence
    const filtered = deduplicated.filter((t) => t.confidence >= this.config.minConfidence);

    // Limit to max tables
    return filtered.slice(0, this.config.maxTables);
  }

  /**
   * Merges or removes overlapping tables to prevent duplicates.
   */
  private mergeOverlappingTables(tables: DetectedTable[]): DetectedTable[] {
    if (tables.length <= 1) return tables;

    const result: DetectedTable[] = [];
    const used = new Set<number>();

    for (let i = 0; i < tables.length; i++) {
      if (used.has(i)) continue;

      const base = tables[i];
      result.push(base);
      used.add(i);

      for (let j = i + 1; j < tables.length; j++) {
        if (used.has(j)) continue;

        if (this.tablesOverlapSignificantly(base, tables[j])) {
          used.add(j);
        }
      }
    }

    return result;
  }

  /**
   * Checks if two tables overlap significantly.
   */
  private tablesOverlapSignificantly(a: DetectedTable, b: DetectedTable): boolean {
    const xOverlap = Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1));
    const yOverlap = Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y2, b.y2)); // PDF Y inverted (y1 > y2)

    const overlapArea = xOverlap * yOverlap;
    const aArea = (a.x2 - a.x1) * (a.y1 - a.y2);
    const bArea = (b.x2 - b.x1) * (b.y1 - b.y2);

    const minArea = Math.min(aArea, bArea);
    if (minArea === 0) return false;

    // If more than 70% of the smaller table is covered by the larger one, they are likely duplicates
    return overlapArea / minArea > 0.7;
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
