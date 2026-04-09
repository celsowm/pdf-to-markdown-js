/**
 * Graph-Based Table Detector (Relational Nearest-Neighbor)
 *
 * Treats each text block as a node in a graph. Connects nodes that are
 * nearest neighbors (right neighbor = same row, below neighbor = same column).
 * Finds subgraphs that form grid-like structures.
 *
 * Best for: key-value pairs and tables with irregular spacing.
 *
 * Algorithm:
 * 1. Build a directed graph where each text element is a node
 * 2. For each node, find its right neighbor (same Y, nearest X to the right)
 *    and below neighbor (same X, nearest Y below)
 * 3. Find connected subgraphs where nodes have consistent right/below links
 * 4. A grid exists when nodes form a rectangular lattice of connections
 * 5. Extract table boundaries from the bounding box of each grid subgraph
 */
import { ITableDetector, DetectedTable, DetectionConfig, DetectorCategory } from './TableTypes';
import { TextElement } from '../../models/TextElement';
export declare class GraphBasedDetector implements ITableDetector {
    getName(): string;
    getCategory(): DetectorCategory;
    getDefaultWeight(): number;
    detect(elements: ReadonlyArray<TextElement>, config: DetectionConfig): DetectedTable[];
    getConfidence(table: DetectedTable): number;
    /**
     * Builds a directed graph from text elements.
     * Each node has at most one right neighbor and one below neighbor.
     */
    private buildGraph;
    /**
     * Finds clusters of nodes that form grid-like structures.
     * A grid is detected when nodes have consistent right/below connections
     * forming a rectangular pattern.
     */
    private findGridClusters;
    /**
     * Grows a grid cluster from a seed node by following right and below links.
     */
    private growGridFromSeed;
    /**
     * Builds a DetectedTable from a grid cluster.
     */
    private buildTableFromCluster;
    /**
     * Clusters elements by a coordinate (x or y) within tolerance.
     */
    private clusterByCoordinate;
}
//# sourceMappingURL=GraphBasedDetector.d.ts.map