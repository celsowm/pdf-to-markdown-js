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

import {
  ITableDetector,
  DetectedTable,
  TableCell,
  DetectionConfig,
  DetectorCategory,
} from './TableTypes';
import { TextElement } from '../../models/TextElement';

interface GraphNode {
  readonly element: TextElement;
  readonly index: number;
  rightNeighbor: number | null;
  belowNeighbor: number | null;
}

interface GridCluster {
  readonly nodes: number[];
  readonly rows: number;
  readonly cols: number;
}

export class GraphBasedDetector implements ITableDetector {
  getName(): string {
    return 'GraphBased';
  }

  getCategory(): DetectorCategory {
    return 'relational';
  }

  getDefaultWeight(): number {
    return 0.4;
  }

  detect(elements: ReadonlyArray<TextElement>, config: DetectionConfig): DetectedTable[] {
    if (elements.length < config.minRows * config.minCols) {
      return [];
    }

    // Step 1: Build the nearest-neighbor graph
    const nodes = this.buildGraph(elements, config.tolerance);

    // Step 2: Find grid-like clusters
    const clusters = this.findGridClusters(nodes, config);

    if (clusters.length === 0) {
      return [];
    }

    // Step 3: Convert clusters to DetectedTable objects
    const tables: DetectedTable[] = [];
    for (const cluster of clusters) {
      const table = this.buildTableFromCluster(cluster, nodes, config);
      if (table) {
        tables.push(table);
      }
    }

    return tables;
  }

  getConfidence(table: DetectedTable): number {
    // Confidence based on grid regularity
    const cellCount = table.cells.length;
    const expectedCells = table.rows * table.cols;
    const completeness = cellCount / expectedCells;

    // Larger tables with more cells are more likely to be real tables
    const sizeScore = Math.min(expectedCells / 12, 0.5);
    const completenessScore = completeness * 0.5;

    return Math.min(sizeScore + completenessScore, 1.0);
  }

  /**
   * Builds a directed graph from text elements.
   * Each node has at most one right neighbor and one below neighbor.
   */
  private buildGraph(elements: ReadonlyArray<TextElement>, tolerance: number): GraphNode[] {
    const nodes: GraphNode[] = elements.map((el, idx) => ({
      element: el,
      index: idx,
      rightNeighbor: null,
      belowNeighbor: null,
    }));

    // For each node, find right neighbor (same row, nearest X to the right)
    for (let i = 0; i < nodes.length; i++) {
      let bestRight: number | null = null;
      let bestRightDist = Infinity;

      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;

        const sameRow = Math.abs(nodes[i].element.y - nodes[j].element.y) <= tolerance;
        const isRight = nodes[j].element.x > nodes[i].element.x + nodes[i].element.width;

        if (sameRow && isRight) {
          const dist = nodes[j].element.x - (nodes[i].element.x + nodes[i].element.width);
          if (dist < bestRightDist) {
            bestRightDist = dist;
            bestRight = j;
          }
        }
      }

      nodes[i].rightNeighbor = bestRight;
    }

    // For each node, find below neighbor (same column, nearest Y below)
    for (let i = 0; i < nodes.length; i++) {
      let bestBelow: number | null = null;
      let bestBelowDist = Infinity;

      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;

        const sameCol = Math.abs(nodes[i].element.x - nodes[j].element.x) <= tolerance;
        const isBelow = nodes[j].element.y > nodes[i].element.y + nodes[i].element.height;

        if (sameCol && isBelow) {
          const dist = nodes[j].element.y - (nodes[i].element.y + nodes[i].element.height);
          if (dist < bestBelowDist) {
            bestBelowDist = dist;
            bestBelow = j;
          }
        }
      }

      nodes[i].belowNeighbor = bestBelow;
    }

    return nodes;
  }

  /**
   * Finds clusters of nodes that form grid-like structures.
   * A grid is detected when nodes have consistent right/below connections
   * forming a rectangular pattern.
   */
  private findGridClusters(
    nodes: ReadonlyArray<GraphNode>,
    config: DetectionConfig,
  ): GridCluster[] {
    const visited = new Set<number>();
    const clusters: GridCluster[] = [];

    // Find seed nodes: nodes that have both a right and below neighbor
    const seedIndices: number[] = [];
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].rightNeighbor !== null && nodes[i].belowNeighbor !== null) {
        seedIndices.push(i);
      }
    }

    for (const seedIdx of seedIndices) {
      if (visited.has(seedIdx)) continue;

      const cluster = this.growGridFromSeed(seedIdx, nodes, visited, config);
      if (cluster && cluster.rows >= config.minRows && cluster.cols >= config.minCols) {
        clusters.push(cluster);
      }
    }

    return clusters;
  }

  /**
   * Grows a grid cluster from a seed node by following right and below links.
   */
  private growGridFromSeed(
    seedIdx: number,
    nodes: ReadonlyArray<GraphNode>,
    visited: Set<number>,
    config: DetectionConfig,
  ): GridCluster | null {
    // Trace the first row by following right neighbors
    const firstRow: number[] = [];
    let current: number | null = seedIdx;
    while (current !== null && !visited.has(current)) {
      firstRow.push(current);
      current = nodes[current].rightNeighbor;
    }

    if (firstRow.length < config.minCols) {
      return null;
    }

    // Trace columns by following below neighbors from each node in the first row
    const grid: number[][] = [firstRow];

    for (let row = 0; row < 50; row++) {
      // Safety limit
      const nextRow: number[] = [];
      let allNull = true;

      for (const nodeIdx of grid[row]) {
        const below = nodes[nodeIdx].belowNeighbor;
        if (below !== null && !visited.has(below)) {
          nextRow.push(below);
          allNull = false;
        } else {
          nextRow.push(-1); // Placeholder for missing cell
        }
      }

      if (allNull) break;
      grid.push(nextRow);
    }

    // Validate grid: check if columns are consistent
    const validRows: number[][] = [];
    for (const row of grid) {
      const nonPlaceholders = row.filter((idx) => idx >= 0);
      if (nonPlaceholders.length >= config.minCols) {
        validRows.push(row);
      }
    }

    if (validRows.length < config.minRows) {
      return null;
    }

    // Mark nodes as visited
    const nodeIndices = new Set<number>();
    for (const row of validRows) {
      for (const idx of row) {
        if (idx >= 0) {
          visited.add(idx);
          nodeIndices.add(idx);
        }
      }
    }

    return {
      nodes: Array.from(nodeIndices),
      rows: validRows.length,
      cols: validRows[0].filter((idx) => idx >= 0).length,
    };
  }

  /**
   * Builds a DetectedTable from a grid cluster.
   */
  private buildTableFromCluster(
    cluster: GridCluster,
    nodes: ReadonlyArray<GraphNode>,
    config: DetectionConfig,
  ): DetectedTable | null {
    const clusterElements = cluster.nodes.map((idx) => nodes[idx].element);

    if (clusterElements.length === 0) return null;

    // Compute bounding box
    const x1 = Math.min(...clusterElements.map((el) => el.x));
    const y1 = Math.min(...clusterElements.map((el) => el.y));
    const x2 = Math.max(...clusterElements.map((el) => el.x + el.width));
    const y2 = Math.max(...clusterElements.map((el) => el.y + el.height));

    // Build cells by estimating grid positions
    // Group elements by Y (rows) and X (columns)
    const rowGroups = this.clusterByCoordinate(clusterElements, 'y', config.tolerance);
    const colGroups = this.clusterByCoordinate(clusterElements, 'x', config.tolerance);

    const rows = rowGroups.length;
    const cols = colGroups.length;

    if (rows < config.minRows || cols < config.minCols) {
      return null;
    }

    // Build cell grid
    const cells: TableCell[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Find elements in this cell
        const cellElements = clusterElements.filter(
          (el) => rowGroups[r].includes(el) && colGroups[c].includes(el),
        );

        if (cellElements.length > 0) {
          const cx1 = Math.min(...cellElements.map((el) => el.x));
          const cy1 = Math.min(...cellElements.map((el) => el.y));
          const cx2 = Math.max(...cellElements.map((el) => el.x + el.width));
          const cy2 = Math.max(...cellElements.map((el) => el.y + el.height));

          cells.push({
            rowIndex: r,
            colIndex: c,
            x1: cx1,
            y1: cy1,
            x2: cx2,
            y2: cy2,
            content: cellElements.map((el) => el.text).join(' '),
          });
        } else {
          // Empty cell: estimate position from grid
          const rowY = Math.min(...rowGroups[r].map((el) => el.y));
          const colX = Math.min(...colGroups[c].map((el) => el.x));
          const rowH = rowGroups[r].reduce((s, el) => s + el.height, 0) / rowGroups[r].length;
          const colW = colGroups[c].reduce((s, el) => s + el.width, 0) / colGroups[c].length;

          cells.push({
            rowIndex: r,
            colIndex: c,
            x1: colX,
            y1: rowY,
            x2: colX + colW,
            y2: rowY + rowH,
          });
        }
      }
    }

    // Detect header: first row elements are typically bold or larger
    const firstRowElements = clusterElements.filter((el) => rowGroups[0].includes(el));
    const avgFontSize =
      clusterElements.reduce((s, el) => s + el.fontSize, 0) / clusterElements.length;
    const hasHeader =
      firstRowElements.length > 0 &&
      firstRowElements.some((el) => el.isBold || el.fontSize > avgFontSize);

    return {
      id: `graph-${Date.now()}`,
      detectorName: this.getName(),
      x1,
      y1,
      x2,
      y2,
      rows,
      cols,
      cells,
      hasHeader,
      confidence: 0,
    };
  }

  /**
   * Clusters elements by a coordinate (x or y) within tolerance.
   */
  private clusterByCoordinate(
    elements: ReadonlyArray<TextElement>,
    coord: 'x' | 'y',
    tolerance: number,
  ): TextElement[][] {
    const sorted = [...elements].sort((a, b) => {
      const valA = coord === 'x' ? a[coord] : a[coord];
      const valB = coord === 'x' ? b[coord] : b[coord];
      return valA - valB;
    });

    const groups: TextElement[][] = [];
    let currentGroup: TextElement[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const prevVal = coord === 'x' ? sorted[i - 1].x : sorted[i - 1].y;
      const currVal = coord === 'x' ? sorted[i].x : sorted[i].y;

      if (Math.abs(currVal - prevVal) <= tolerance) {
        currentGroup.push(sorted[i]);
      } else {
        groups.push(currentGroup);
        currentGroup = [sorted[i]];
      }
    }
    groups.push(currentGroup);

    return groups;
  }
}
