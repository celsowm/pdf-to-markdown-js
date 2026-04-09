/**
 * SCA (Sparse Columnar Alignment) Table Detector (Statistical)
 *
 * Uses histogram analysis of text block centers to find column alignment patterns.
 * Algorithm:
 * 1. Compute X positions of all text element centers/edges
 * 2. Build a histogram of these positions
 * 3. Find "spikes" where many text edges align (column candidates)
 * 4. Calculate column alignment score for each candidate spike
 * 5. If alignment score exceeds threshold, build table from aligned elements
 * Handles "jagged" tables where some cells are empty (sparse alignment)
 *
 * SOLID:
 * - SRP: Only handles statistical column alignment detection
 * - OCP: Implements ITableDetector, can be replaced
 * - LSP: Interchangeable with other detectors
 * - DIP: Depends on ITableDetector abstraction
 */
/**
 * SCA Detector implementation.
 */
export class SCADetector {
    getName() {
        return 'SCA';
    }
    getCategory() {
        return 'statistical';
    }
    getDefaultWeight() {
        return 0.5;
    }
    detect(elements, config) {
        if (elements.length < 4)
            return [];
        const elems = [...elements];
        const tables = [];
        // Step 1: Build histogram of text positions
        const histogram = this.buildHistogram(elems, config);
        if (histogram.length === 0)
            return [];
        // Step 2: Find spikes (positions with significant alignment)
        const spikes = this.findSpikes(histogram, elems, config);
        if (spikes.length < config.minCols)
            return [];
        // Step 3: Group spikes into column sets and attempt table construction
        const columnCandidates = this.selectBestColumns(spikes, config);
        for (const columns of columnCandidates) {
            const table = this.buildTableFromColumns(elems, columns, config);
            if (table) {
                tables.push(table);
            }
        }
        // If no tables found with strict criteria, try with relaxed thresholds
        if (tables.length === 0) {
            const relaxedSpikes = this.findSpikesRelaxed(histogram, elems, config);
            if (relaxedSpikes.length >= config.minCols) {
                const relaxedColumns = this.selectBestColumns(relaxedSpikes, config);
                for (const columns of relaxedColumns) {
                    const table = this.buildTableFromColumns(elems, columns, config);
                    if (table) {
                        tables.push(table);
                    }
                }
            }
        }
        return tables;
    }
    getConfidence(table) {
        const expectedCells = table.rows * table.cols;
        const filledCells = table.cells.filter(c => c.content).length;
        if (filledCells === 0)
            return 0;
        const fillRate = filledCells / expectedCells;
        const columnStrength = Math.min(table.cols / 8, 0.4);
        const sparseBonus = fillRate < 1.0 ? (1.0 - fillRate) * 0.2 : 0; // Bonus for handling sparse tables
        return Math.min(fillRate * 0.4 + columnStrength + 0.1 + sparseBonus * 0.3, 1.0);
    }
    // ─── Histogram Building ──────────────────────────────────────────────
    buildHistogram(elements, config) {
        if (elements.length === 0)
            return [];
        const binSize = config.tolerance * 1.5;
        const binMap = new Map();
        for (const el of elements) {
            // Consider both left edge and center for robustness
            const positions = [
                { pos: el.x, weight: 0.6 },
                { pos: el.x + el.width / 2, weight: 0.4 },
            ];
            for (const { pos } of positions) {
                const binKey = Math.round(pos / binSize) * binSize;
                const existing = binMap.get(binKey) || [];
                existing.push(el);
                binMap.set(binKey, existing);
            }
        }
        // Convert to bins
        const bins = [];
        for (const [center, els] of binMap.entries()) {
            bins.push({
                center,
                count: els.length,
                elements: els,
            });
        }
        // Sort by position
        bins.sort((a, b) => a.center - b.center);
        return bins;
    }
    // ─── Spike Detection ─────────────────────────────────────────────────
    findSpikes(histogram, elements, config) {
        if (histogram.length === 0)
            return [];
        // Calculate statistics
        const counts = histogram.map(b => b.count);
        const meanCount = counts.reduce((a, b) => a + b, 0) / counts.length;
        const stdDev = Math.sqrt(counts.reduce((sum, c) => sum + Math.pow(c - meanCount, 2), 0) / counts.length);
        // Threshold: mean + 1 std deviation
        const spikeThreshold = meanCount + stdDev * 1.0;
        const minRowCount = Math.max(2, Math.ceil(elements.length / this.estimateRowCount(elements) * 0.3));
        const spikes = [];
        for (const bin of histogram) {
            if (bin.count < spikeThreshold)
                continue;
            // Calculate alignment score: how many unique rows does this column cover?
            const uniqueRows = this.countUniqueRows(bin.elements, config.tolerance);
            const estimatedRows = this.estimateRowCount(elements);
            const coverageScore = estimatedRows > 0 ? uniqueRows / estimatedRows : 0;
            const score = (bin.count / spikeThreshold) * 0.5 + coverageScore * 0.5;
            if (score >= 0.25 && uniqueRows >= minRowCount) {
                spikes.push({
                    xPosition: bin.center,
                    alignmentScore: score,
                    rowCount: uniqueRows,
                    elements: bin.elements,
                });
            }
        }
        // Merge nearby spikes
        return this.mergeNearbySpikes(spikes, config.tolerance * 2);
    }
    findSpikesRelaxed(histogram, elements, config) {
        if (histogram.length === 0)
            return [];
        const counts = histogram.map(b => b.count);
        const meanCount = counts.reduce((a, b) => a + b, 0) / counts.length;
        const stdDev = Math.sqrt(counts.reduce((sum, c) => sum + Math.pow(c - meanCount, 2), 0) / counts.length);
        // Lower threshold for relaxed mode
        const spikeThreshold = meanCount + stdDev * 0.5;
        const spikes = [];
        for (const bin of histogram) {
            if (bin.count < spikeThreshold)
                continue;
            const uniqueRows = this.countUniqueRows(bin.elements, config.tolerance);
            const estimatedRows = this.estimateRowCount(elements);
            const coverageScore = estimatedRows > 0 ? uniqueRows / estimatedRows : 0;
            const score = (bin.count / spikeThreshold) * 0.4 + coverageScore * 0.6;
            if (score >= 0.18 && uniqueRows >= 2) {
                spikes.push({
                    xPosition: bin.center,
                    alignmentScore: score,
                    rowCount: uniqueRows,
                    elements: bin.elements,
                });
            }
        }
        return this.mergeNearbySpikes(spikes, config.tolerance * 3);
    }
    mergeNearbySpikes(spikes, tolerance) {
        if (spikes.length === 0)
            return [];
        const sorted = [...spikes].sort((a, b) => a.xPosition - b.xPosition);
        const merged = [];
        let current = sorted[0];
        for (let i = 1; i < sorted.length; i++) {
            if (Math.abs(sorted[i].xPosition - current.xPosition) <= tolerance) {
                // Merge: take the one with higher score
                if (sorted[i].alignmentScore > current.alignmentScore) {
                    current = sorted[i];
                }
                else {
                    // Combine elements
                    const allElements = [...new Set([...current.elements, ...sorted[i].elements])];
                    current = {
                        ...current,
                        elements: allElements,
                        rowCount: current.rowCount + sorted[i].rowCount,
                    };
                }
            }
            else {
                merged.push(current);
                current = sorted[i];
            }
        }
        merged.push(current);
        return merged;
    }
    // ─── Column Selection ────────────────────────────────────────────────
    selectBestColumns(spikes, config) {
        if (spikes.length < config.minCols)
            return [];
        // Sort by score descending
        const sorted = [...spikes].sort((a, b) => b.alignmentScore - a.alignmentScore);
        // Select top columns ensuring minimum spacing
        const selected = [];
        const minSpacing = config.tolerance * 4;
        for (const spike of sorted) {
            const tooClose = selected.some(pos => Math.abs(pos - spike.xPosition) < minSpacing);
            if (!tooClose) {
                selected.push(spike.xPosition);
            }
            if (selected.length >= spikes.length)
                break;
        }
        selected.sort((a, b) => a - b);
        // Return as single table candidate, or split into multiple if there are clear gaps
        const candidates = [];
        if (selected.length >= config.minCols) {
            candidates.push(selected);
        }
        return candidates;
    }
    // ─── Table Building ──────────────────────────────────────────────────
    buildTableFromColumns(elements, colPositions, config) {
        if (colPositions.length < config.minCols)
            return null;
        // Group elements by Y position (rows)
        const rows = this.groupElementsByY(elements, config.tolerance);
        if (rows.length < config.minRows)
            return null;
        // Build cells
        const cells = [];
        for (let r = 0; r < rows.length; r++) {
            const rowY = rows[r][0]?.y ?? 0;
            const nextRowY = r < rows.length - 1 ? rows[r + 1][0]?.y ?? 0 : rowY - 20;
            for (let c = 0; c < colPositions.length; c++) {
                const x1 = colPositions[c];
                const x2 = c < colPositions.length - 1 ? colPositions[c + 1] : x1 + 50;
                // Find elements that align with this column
                const cellElements = rows[r].filter(el => {
                    // Check if element's left edge or center is near column position
                    const leftEdgeDist = Math.abs(el.x - x1);
                    const centerDist = Math.abs(el.x + el.width / 2 - x1);
                    const withinColumn = el.x >= x1 - config.tolerance * 2 && el.x < x2 + config.tolerance;
                    return (leftEdgeDist <= config.tolerance * 2 || centerDist <= config.tolerance * 2) && withinColumn;
                });
                cells.push({
                    rowIndex: r,
                    colIndex: c,
                    x1,
                    y1: rowY,
                    x2,
                    y2: nextRowY,
                    content: cellElements.map(e => e.text).join(' ').trim() || undefined,
                });
            }
        }
        // Verify we have meaningful content
        const filledCells = cells.filter(c => c.content).length;
        if (filledCells < config.minRows * Math.ceil(config.minCols * 0.5))
            return null;
        const x1 = Math.min(...colPositions);
        const x2 = colPositions[colPositions.length - 1] + 50;
        const yPositions = rows.map(r => r[0]?.y ?? 0);
        const y1 = Math.max(...yPositions);
        const y2 = Math.min(...yPositions) - 20;
        return {
            id: `sca-${Date.now()}`,
            detectorName: this.getName(),
            x1,
            y1,
            x2,
            y2,
            rows: rows.length,
            cols: colPositions.length,
            cells,
            hasHeader: this.detectHeader(rows),
            confidence: 0,
        };
    }
    // ─── Utility Methods ─────────────────────────────────────────────────
    groupElementsByY(elements, tolerance) {
        const sorted = [...elements].sort((a, b) => b.y - a.y);
        const rows = [];
        for (const el of sorted) {
            let placed = false;
            for (const row of rows) {
                if (Math.abs(row[0].y - el.y) <= tolerance * 2) {
                    row.push(el);
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                rows.push([el]);
            }
        }
        for (const row of rows) {
            row.sort((a, b) => a.x - b.x);
        }
        return rows;
    }
    countUniqueRows(elements, tolerance) {
        const yPositions = new Set();
        for (const el of elements) {
            // Quantize Y position
            const quantizedY = Math.round(el.y / tolerance) * tolerance;
            yPositions.add(quantizedY);
        }
        return yPositions.size;
    }
    estimateRowCount(elements) {
        if (elements.length === 0)
            return 0;
        const avgHeight = elements.reduce((sum, el) => sum + el.height, 0) / elements.length;
        const yPositions = elements.map(el => el.y);
        const minY = Math.min(...yPositions);
        const maxY = Math.max(...yPositions);
        // Estimate based on vertical span and average element height
        const span = maxY - minY + avgHeight;
        const estimatedRowHeight = avgHeight * 1.5; // Account for spacing
        return Math.max(1, Math.round(span / estimatedRowHeight));
    }
    detectHeader(rows) {
        if (rows.length < 2)
            return false;
        const firstRow = rows[0];
        const secondRow = rows[1];
        // Bold text in first row
        if (firstRow.some(el => el.isBold)) {
            return true;
        }
        // Larger font in first row
        const avgFirstFontSize = firstRow.reduce((sum, el) => sum + el.fontSize, 0) / firstRow.length;
        const avgSecondFontSize = secondRow.reduce((sum, el) => sum + el.fontSize, 0) / secondRow.length;
        if (avgFirstFontSize > avgSecondFontSize * 1.1) {
            return true;
        }
        return false;
    }
}
