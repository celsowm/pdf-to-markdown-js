"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LatticeDetector = exports.DEFAULT_LATTICE_CONFIG = void 0;
/**
 * Default Lattice configuration.
 */
exports.DEFAULT_LATTICE_CONFIG = {
    lineTolerance: 2,
    minTableWidth: 50,
    minTableHeight: 30,
    minCells: { rows: 2, cols: 2 },
    detectionWeight: 0.5,
};
/**
 * Lattice algorithm for table detection in PDFs.
 *
 * Detects tables by finding horizontal and vertical lines that form grid structures.
 * This is the same approach used by Camelot-py and other PDF table extraction tools.
 *
 * PDFs draw tables using line operators:
 * - `m` (moveto) + `l` (lineto) for lines
 * - `re` (rectangle) for boxes
 * - `S` or `s` (stroke) to render them
 *
 * The algorithm:
 * 1. Parse content stream for line-drawing operations
 * 2. Group lines into horizontal and vertical sets
 * 3. Find intersections between line sets
 * 4. Cluster intersections into table grids
 * 5. Extract cell boundaries from the grid
 */
class LatticeDetector {
    constructor(config = {}) {
        this.config = { ...exports.DEFAULT_LATTICE_CONFIG, ...config };
    }
    /**
     * Detects tables in PDF content stream text.
     * @param content The raw PDF content stream
     * @returns Array of detected tables
     */
    detectTables(content) {
        // Step 1: Extract line segments from PDF operators
        const lines = this.extractLines(content);
        // Step 2: Separate horizontal and vertical lines
        const horizontalLines = lines.filter((l) => l.isHorizontal);
        const verticalLines = lines.filter((l) => l.isVertical);
        // Step 3: Find intersections
        const intersections = this.findIntersections(horizontalLines, verticalLines);
        if (intersections.length < 4) {
            return []; // Need at least 4 intersections for a minimal table
        }
        // Step 4: Cluster intersections into tables
        const tables = this.clusterIntersections(intersections);
        // Step 5: Build table grids
        return tables.map((table) => this.buildTableGrid(table));
    }
    /**
     * Extracts line segments from PDF content stream.
     * Parses PDF graphics operators: m, l, re, h, S, s
     */
    extractLines(content) {
        const lines = [];
        // PDF line drawing patterns
        // Rectangle: x y w h re
        const rectPattern = /([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)\s+re/g;
        let match;
        while ((match = rectPattern.exec(content)) !== null) {
            const x = parseFloat(match[1]);
            const y = parseFloat(match[2]);
            const w = parseFloat(match[3]);
            const h = parseFloat(match[4]);
            // Rectangle creates 4 lines
            if (w !== 0) {
                // Horizontal lines
                lines.push({
                    x1: x,
                    y1: y,
                    x2: x + w,
                    y2: y,
                    isHorizontal: true,
                    isVertical: false,
                });
                lines.push({
                    x1: x,
                    y1: y + h,
                    x2: x + w,
                    y2: y + h,
                    isHorizontal: true,
                    isVertical: false,
                });
            }
            if (h !== 0) {
                // Vertical lines
                lines.push({
                    x1: x,
                    y1: y,
                    x2: x,
                    y2: y + h,
                    isHorizontal: false,
                    isVertical: true,
                });
                lines.push({
                    x1: x + w,
                    y1: y,
                    x2: x + w,
                    y2: y + h,
                    isHorizontal: false,
                    isVertical: true,
                });
            }
        }
        // Line: x1 y1 m x2 y2 l S
        const linePattern = /([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)\s+m\s+([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)\s+l/g;
        while ((match = linePattern.exec(content)) !== null) {
            const x1 = parseFloat(match[1]);
            const y1 = parseFloat(match[2]);
            const x2 = parseFloat(match[3]);
            const y2 = parseFloat(match[4]);
            const isHorizontal = Math.abs(y2 - y1) < this.config.lineTolerance;
            const isVertical = Math.abs(x2 - x1) < this.config.lineTolerance;
            if (isHorizontal || isVertical) {
                lines.push({ x1, y1, x2, y2, isHorizontal, isVertical });
            }
        }
        return lines;
    }
    /**
     * Finds intersection points between horizontal and vertical lines.
     */
    findIntersections(horizontal, vertical) {
        const intersections = [];
        for (const hLine of horizontal) {
            for (const vLine of vertical) {
                const hY = hLine.y1;
                const hX1 = Math.min(hLine.x1, hLine.x2);
                const hX2 = Math.max(hLine.x1, hLine.x2);
                const vX1 = vLine.x1;
                const vY1 = Math.min(vLine.y1, vLine.y2);
                const vY2 = Math.max(vLine.y1, vLine.y2);
                // Check if vertical line crosses horizontal line
                const xMatch = vX1 >= hX1 - this.config.lineTolerance &&
                    vX1 <= hX2 + this.config.lineTolerance;
                const yMatch = hY >= vY1 - this.config.lineTolerance &&
                    hY <= vY2 + this.config.lineTolerance;
                if (xMatch && yMatch) {
                    intersections.push({
                        x: vX1,
                        y: hY,
                    });
                }
            }
        }
        return intersections;
    }
    /**
     * Clusters intersection points into potential tables.
     * Uses proximity-based clustering to group intersections.
     */
    clusterIntersections(intersections) {
        if (intersections.length < 4) {
            return [];
        }
        // Simple approach: if all intersections are within a reasonable area,
        // treat them as one table
        const xs = intersections.map(p => p.x);
        const ys = intersections.map(p => p.y);
        const xRange = Math.max(...xs) - Math.min(...xs);
        const yRange = Math.max(...ys) - Math.min(...ys);
        // Use average spacing to determine if this is a single table
        const avgSpacing = Math.max(xRange, yRange) / Math.sqrt(intersections.length);
        const threshold = avgSpacing * 2;
        const clusters = [];
        const visited = new Set();
        for (let i = 0; i < intersections.length; i++) {
            if (visited.has(i))
                continue;
            const cluster = [intersections[i]];
            visited.add(i);
            // Find all nearby intersections using flood fill
            const queue = [i];
            while (queue.length > 0) {
                const current = queue.shift();
                for (let j = 0; j < intersections.length; j++) {
                    if (visited.has(j))
                        continue;
                    const dist = this.distance(intersections[current], intersections[j]);
                    if (dist < threshold) {
                        cluster.push(intersections[j]);
                        visited.add(j);
                        queue.push(j);
                    }
                }
            }
            if (cluster.length >= 4) {
                clusters.push(cluster);
            }
        }
        return clusters;
    }
    /**
     * Builds a table grid from intersection points.
     * Identifies rows and columns from the intersection pattern.
     */
    buildTableGrid(intersections) {
        // Sort intersections
        const sorted = [...intersections].sort((a, b) => {
            const yDiff = Math.abs(a.y - b.y);
            if (yDiff > this.config.lineTolerance) {
                return b.y - a.y; // Top to bottom
            }
            return a.x - b.x; // Left to right
        });
        // Group by Y coordinate (rows)
        const rowGroups = this.groupByCoordinate(sorted, 'y', this.config.lineTolerance);
        const rows = rowGroups.length;
        // Group by X coordinate (columns)
        const colGroups = this.groupByCoordinate(sorted, 'x', this.config.lineTolerance);
        const cols = colGroups.length;
        // Calculate table boundaries
        const x1 = Math.min(...sorted.map((p) => p.x));
        const y1 = Math.min(...sorted.map((p) => p.y));
        const x2 = Math.max(...sorted.map((p) => p.x));
        const y2 = Math.max(...sorted.map((p) => p.y));
        // Build cells
        const cells = [];
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (row < rowGroups.length - 1 && col < colGroups.length - 1) {
                    cells.push({
                        rowIndex: row,
                        colIndex: col,
                        x1: colGroups[col],
                        y1: rowGroups[row],
                        x2: colGroups[col + 1],
                        y2: rowGroups[row + 1],
                    });
                }
            }
        }
        return {
            x1,
            y1,
            x2,
            y2,
            rows,
            cols,
            cells,
            hasHeader: rows >= 2, // Assume first row is header
        };
    }
    /**
     * Groups intersection points by a coordinate axis.
     */
    groupByCoordinate(points, axis, tolerance) {
        const values = points.map((p) => p[axis]);
        const sorted = [...new Set(values)].sort((a, b) => a - b);
        const groups = [];
        let currentGroup = [sorted[0]];
        for (let i = 1; i < sorted.length; i++) {
            const diff = Math.abs(sorted[i] - currentGroup[0]);
            if (diff <= tolerance) {
                currentGroup.push(sorted[i]);
            }
            else {
                // Average the group
                groups.push(currentGroup.reduce((a, b) => a + b, 0) / currentGroup.length);
                currentGroup = [sorted[i]];
            }
        }
        if (currentGroup.length > 0) {
            groups.push(currentGroup.reduce((a, b) => a + b, 0) / currentGroup.length);
        }
        return groups;
    }
    /**
     * Calculates Euclidean distance between two points.
     */
    distance(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    /**
     * Returns the current configuration.
     */
    getConfig() {
        return this.config;
    }
}
exports.LatticeDetector = LatticeDetector;
//# sourceMappingURL=LatticeDetector.js.map