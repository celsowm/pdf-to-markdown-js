"use strict";
/**
 * Lattice Table Detector (Vector-Based)
 *
 * Parses PDF drawing operators (moveTo, lineTo, rectangle) to find explicit line intersections.
 * Best for: Invoices, forms, and tables with visible borders.
 *
 * SOLID:
 * - SRP: Only handles vector-based detection
 * - OCP: Implements ITableDetector, can be replaced
 * - LSP: Interchangeable with other detectors
 * - DIP: Depends on ITableDetector abstraction
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LatticeDetector = void 0;
/**
 * Lattice detector implementation.
 */
class LatticeDetector {
    getName() {
        return 'Lattice';
    }
    getCategory() {
        return 'vector';
    }
    getDefaultWeight() {
        return 0.8;
    }
    detect(elements, config) {
        // Lattice requires access to raw PDF content stream for line operators
        // This detector works best when we parse PDF graphics operators
        // For now, we simulate detection from text alignment patterns
        const tables = [];
        // Group elements by row
        const rows = this.groupByYPosition(elements, config.tolerance);
        if (rows.length < config.minRows) {
            return [];
        }
        // Check if rows have consistent column alignment
        const colPositions = this.findCommonColumnPositions(rows, config.tolerance);
        if (colPositions.length < config.minCols) {
            return [];
        }
        // Build table
        const table = this.buildTable(rows, colPositions, config);
        if (table) {
            tables.push(table);
        }
        return tables;
    }
    getConfidence(table) {
        // Confidence based on grid completeness
        const expectedCells = table.rows * table.cols;
        const actualCells = table.cells.length;
        if (actualCells === 0)
            return 0;
        const completeness = actualCells / expectedCells;
        const sizeBonus = Math.min((table.rows * table.cols) / 20, 0.3);
        return Math.min(completeness * 0.7 + sizeBonus, 1.0);
    }
    /**
     * Groups text elements by Y position (rows).
     */
    groupByYPosition(elements, tolerance) {
        const sorted = [...elements].sort((a, b) => b.y - a.y);
        const rows = [];
        for (const element of sorted) {
            const existingRow = rows.find(row => Math.abs(row[0].y - element.y) <= tolerance);
            if (existingRow) {
                existingRow.push(element);
            }
            else {
                rows.push([element]);
            }
        }
        return rows;
    }
    /**
     * Finds common column X positions across rows.
     */
    findCommonColumnPositions(rows, tolerance) {
        if (rows.length === 0)
            return [];
        // Collect all X positions
        const allXPositions = rows.flatMap(row => row.map(el => el.x).sort((a, b) => a - b));
        // Cluster X positions
        const clusters = this.clusterValues(allXPositions, tolerance);
        // Find clusters that appear in most rows
        const consistentClusters = clusters.filter(cluster => {
            const rowsWithCluster = rows.filter(row => row.some(el => Math.abs(el.x - cluster) <= tolerance * 2));
            return rowsWithCluster.length >= Math.ceil(rows.length * 0.5);
        });
        return consistentClusters;
    }
    /**
     * Clusters numeric values within tolerance.
     */
    clusterValues(values, tolerance) {
        if (values.length === 0)
            return [];
        const sorted = [...values].sort((a, b) => a - b);
        const clusters = [];
        let currentCluster = [sorted[0]];
        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i] - currentCluster[0] <= tolerance) {
                currentCluster.push(sorted[i]);
            }
            else {
                clusters.push(currentCluster.reduce((a, b) => a + b, 0) / currentCluster.length);
                currentCluster = [sorted[i]];
            }
        }
        if (currentCluster.length > 0) {
            clusters.push(currentCluster.reduce((a, b) => a + b, 0) / currentCluster.length);
        }
        return clusters;
    }
    /**
     * Builds a DetectedTable from rows and column positions.
     */
    buildTable(rows, colPositions, config) {
        if (rows.length < config.minRows || colPositions.length < config.minCols) {
            return null;
        }
        const cells = [];
        let cellIndex = 0;
        for (let row = 0; row < rows.length; row++) {
            for (let col = 0; col < colPositions.length; col++) {
                const x1 = colPositions[col];
                const x2 = col < colPositions.length - 1 ? colPositions[col + 1] : x1 + 50;
                const y1 = rows[row][0]?.y || 0;
                const y2 = row < rows.length - 1 ? rows[row + 1][0]?.y || 0 : y1 - 20;
                cells.push({
                    rowIndex: row,
                    colIndex: col,
                    x1,
                    y1,
                    x2,
                    y2,
                });
                cellIndex++;
            }
        }
        const x1 = Math.min(...colPositions);
        const x2 = Math.max(...colPositions);
        const y1 = Math.max(...rows.map(r => r[0]?.y || 0));
        const y2 = Math.min(...rows.map(r => r[0]?.y || 0));
        return {
            id: `lattice-${Date.now()}`,
            detectorName: this.getName(),
            x1,
            y1,
            x2,
            y2,
            rows: rows.length,
            cols: colPositions.length,
            cells,
            hasHeader: rows.length >= 2,
            confidence: 0, // Will be calculated by getConfidence
        };
    }
}
exports.LatticeDetector = LatticeDetector;
//# sourceMappingURL=LatticeDetector.js.map