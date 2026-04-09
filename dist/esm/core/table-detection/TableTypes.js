/**
 * Shared types for table detection system.
 * Following SOLID: Interface Segregation + Dependency Inversion
 */
/**
 * Default detection configuration.
 */
export const DEFAULT_DETECTION_CONFIG = {
    tolerance: 3,
    pageWidth: 612,
    pageHeight: 792,
    minRows: 2,
    minCols: 2,
};
/**
 * Default detector registry configuration.
 */
export const DEFAULT_REGISTRY_CONFIG = {
    weights: [
        { name: 'Lattice', weight: 0.8, enabled: true },
        { name: 'Stream', weight: 0.6, enabled: true },
        { name: 'RXYCut', weight: 0.5, enabled: true },
        { name: 'AnchorZoning', weight: 0.4, enabled: false }, // Domain-specific
        { name: 'SCA', weight: 0.5, enabled: true },
        { name: 'GraphBased', weight: 0.4, enabled: true },
        { name: 'Morphology', weight: 0.3, enabled: false }, // Expensive
        { name: 'VisualSignature', weight: 0.9, enabled: false }, // Needs templates
        { name: 'Entropy', weight: 0.3, enabled: true },
    ],
    minConfidence: 0.4,
    maxTables: 10,
};
