"use strict";
/**
 * Detector Registry
 *
 * Manages table detectors with configurable weights.
 * Follows SOLID:
 * - OCP: New detectors can be added without modifying registry
 * - DIP: Depends on ITableDetector abstraction
 * - SRP: Only manages detector lifecycle
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DetectorRegistry = void 0;
exports.createStandardRegistry = createStandardRegistry;
const TableTypes_1 = require("./TableTypes");
// Import all detectors
const LatticeDetector_1 = require("./LatticeDetector");
const StreamDetector_1 = require("./StreamDetector");
const RXYCutDetector_1 = require("./RXYCutDetector");
const AnchorZoningDetector_1 = require("./AnchorZoningDetector");
const SCADetector_1 = require("./SCADetector");
const GraphBasedDetector_1 = require("./GraphBasedDetector");
const MorphologyDetector_1 = require("./MorphologyDetector");
const VisualSignatureDetector_1 = require("./VisualSignatureDetector");
const EntropyDetector_1 = require("./EntropyDetector");
/**
 * Registry that manages table detectors and their execution.
 */
class DetectorRegistry {
    constructor(config) {
        this.detectors = new Map();
        this.config = { ...TableTypes_1.DEFAULT_REGISTRY_CONFIG, ...config };
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
    detectAll(elements, config = TableTypes_1.DEFAULT_DETECTION_CONFIG) {
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
    detectWith(name, elements, config = TableTypes_1.DEFAULT_DETECTION_CONFIG) {
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
exports.DetectorRegistry = DetectorRegistry;
/**
 * Creates a registry with all standard detectors registered.
 */
function createStandardRegistry(config) {
    const registry = new DetectorRegistry(config);
    // Register all detectors
    registry.register(new LatticeDetector_1.LatticeDetector());
    registry.register(new StreamDetector_1.StreamDetector());
    registry.register(new RXYCutDetector_1.RXYCutDetector());
    registry.register(new AnchorZoningDetector_1.AnchorZoningDetector());
    registry.register(new SCADetector_1.SCADetector());
    registry.register(new GraphBasedDetector_1.GraphBasedDetector());
    registry.register(new MorphologyDetector_1.MorphologyDetector());
    registry.register(new VisualSignatureDetector_1.VisualSignatureDetector());
    registry.register(new EntropyDetector_1.EntropyDetector());
    return registry;
}
//# sourceMappingURL=DetectorRegistry.js.map