/**
 * Detector Registry
 *
 * Manages table detectors with configurable weights.
 * Follows SOLID:
 * - OCP: New detectors can be added without modifying registry
 * - DIP: Depends on ITableDetector abstraction
 * - SRP: Only manages detector lifecycle
 */
import { DEFAULT_DETECTION_CONFIG, DEFAULT_REGISTRY_CONFIG, } from './TableTypes';
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
    constructor(config) {
        this.detectors = new Map();
        this.config = { ...DEFAULT_REGISTRY_CONFIG, ...config };
    }
    /**
     * Registers a detector.
     */
    register(detector) {
        this.detectors.set(detector.getName(), detector);
    }
    /**
     * Unregisters a detector by name.
     */
    unregister(name) {
        return this.detectors.delete(name);
    }
    /**
     * Gets a detector by name.
     */
    get(name) {
        return this.detectors.get(name);
    }
    /**
     * Gets all registered detector names.
     */
    getDetectorNames() {
        return Array.from(this.detectors.keys());
    }
    /**
     * Runs all enabled detectors and merges results.
     * Results are sorted by confidence (highest first).
     */
    detectAll(elements, config = DEFAULT_DETECTION_CONFIG) {
        const allTables = [];
        for (const weight of this.config.weights) {
            if (!weight.enabled)
                continue;
            const detector = this.detectors.get(weight.name);
            if (!detector)
                continue;
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
            }
            catch (error) {
                console.warn(`Detector ${weight.name} failed:`, error);
            }
        }
        // Sort by confidence (highest first)
        allTables.sort((a, b) => b.confidence - a.confidence);
        // Filter by minimum confidence
        const filtered = allTables.filter(t => t.confidence >= this.config.minConfidence);
        // Limit to max tables
        return filtered.slice(0, this.config.maxTables);
    }
    /**
     * Runs a specific detector by name.
     */
    detectWith(name, elements, config = DEFAULT_DETECTION_CONFIG) {
        const detector = this.detectors.get(name);
        if (!detector) {
            throw new Error(`Detector ${name} not found`);
        }
        const tables = detector.detect(elements, config);
        const weight = this.config.weights.find(w => w.name === name);
        const weightValue = weight?.weight ?? 1.0;
        return tables.map(table => ({
            ...table,
            confidence: detector.getConfidence(table) * weightValue,
        }));
    }
    /**
     * Updates detector weights.
     */
    updateWeights(weights) {
        for (const weight of weights) {
            const existing = this.config.weights.find(w => w.name === weight.name);
            if (existing) {
                existing.weight = weight.weight;
                existing.enabled = weight.enabled;
            }
            else {
                this.config.weights.push(weight);
            }
        }
    }
    /**
     * Gets current detector weights.
     */
    getWeights() {
        return [...this.config.weights];
    }
}
/**
 * Creates a registry with all standard detectors registered.
 */
export function createStandardRegistry(config) {
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
