/**
 * Anchor Zoning Table Detector (Landmark-Based)
 *
 * Searches for common anchor keywords and defines zones around them.
 * Algorithm:
 * 1. Scan for anchor keywords (Total, Name, Date, Amount, etc.)
 * 2. When found, define a search zone around the keyword
 * 3. Look for aligned text elements within the zone
 * 4. If enough aligned elements found, build a table
 * Best for: Fixed-form documents like invoices, receipts, forms
 *
 * SOLID:
 * - SRP: Only handles landmark-based detection
 * - OCP: Implements ITableDetector, can be replaced
 * - LSP: Interchangeable with other detectors
 * - DIP: Depends on ITableDetector abstraction
 */

import { ITableDetector, DetectedTable, TableCell, DetectionConfig, DetectorCategory } from './TableTypes';
import { TextElement } from '../../models/TextElement';

/**
 * Represents an anchor keyword match.
 */
interface AnchorMatch {
  readonly element: TextElement;
  readonly keyword: string;
}

/**
 * Represents a zoning region around an anchor.
 */
interface AnchorZone {
  readonly anchor: AnchorMatch;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly elements: TextElement[];
}

/**
 * Default anchor keywords commonly found in tables/forms.
 */
const DEFAULT_ANCHOR_KEYWORDS = [
  'total', 'name', 'date', 'amount', 'description', 'item',
  'price', 'qty', 'quantity', 'id', 'no', '#',
  'subtotal', 'tax', 'discount', 'unit', 'cost',
  'rate', 'hours', 'payment', 'invoice', 'reference',
  'product', 'service', 'category', 'code', 'sku',
];

/**
 * Anchor Zoning detector implementation.
 */
export class AnchorZoningDetector implements ITableDetector {
  getName(): string {
    return 'AnchorZoning';
  }

  getCategory(): DetectorCategory {
    return 'landmark';
  }

  getDefaultWeight(): number {
    return 0.4;
  }

  detect(elements: ReadonlyArray<TextElement>, config: DetectionConfig): DetectedTable[] {
    if (elements.length < 3) return [];

    const elems = [...elements] as TextElement[];
    const tables: DetectedTable[] = [];

    // Step 1: Find anchor keyword matches
    const anchors = this.findAnchors(elems);

    if (anchors.length < 2) {
      return [];
    }

    // Step 2: Build zones around anchors
    const zones = this.buildZones(anchors, elems, config);

    if (zones.length === 0) return [];

    // Step 3: Try to build tables from each zone
    for (const zone of zones) {
      const table = this.buildTableFromZone(zone, config);
      if (table) {
        tables.push(table);
      }
    }

    // Step 4: If no zone-level tables, try building a table from all anchor-aligned elements
    if (tables.length === 0) {
      const table = this.buildGlobalAnchorTable(elems, anchors, config);
      if (table) {
        tables.push(table);
      }
    }

    return tables;
  }

  getConfidence(table: DetectedTable): number {
    const expectedCells = table.rows * table.cols;
    const actualCells = table.cells.filter(c => c.content).length;
    if (actualCells === 0) return 0;

    const fillRate = actualCells / expectedCells;
    const anchorBonus = table.hasHeader ? 0.2 : 0;
    const sizeBonus = Math.min((table.rows * table.cols) / 15, 0.3);

    return Math.min(fillRate * 0.5 + anchorBonus + sizeBonus, 1.0);
  }

  // ─── Anchor Detection ────────────────────────────────────────────────

  private findAnchors(elements: TextElement[]): AnchorMatch[] {
    const matches: AnchorMatch[] = [];

    for (const el of elements) {
      const normalizedText = el.text.trim().toLowerCase();

      for (const keyword of DEFAULT_ANCHOR_KEYWORDS) {
        // Exact match or prefix match (e.g., "Total:" matches "total")
        if (
          normalizedText === keyword ||
          normalizedText.startsWith(keyword) ||
          normalizedText.endsWith(keyword) ||
          normalizedText.includes(keyword + ':') ||
          normalizedText.includes(keyword + ' ')
        ) {
          matches.push({ element: el, keyword });
          break;
        }
      }
    }

    return matches;
  }

  // ─── Zone Building ───────────────────────────────────────────────────

  private buildZones(
    anchors: AnchorMatch[],
    allElements: TextElement[],
    config: DetectionConfig
  ): AnchorZone[] {
    // Group anchors that are close together (same table region)
    const clusters = this.clusterAnchors(anchors, config.tolerance * 10);

    const zones: AnchorZone[] = [];

    for (const cluster of clusters) {
      if (cluster.length < 2) continue;

      // Compute bounding box of the cluster
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      for (const anchor of cluster) {
        minX = Math.min(minX, anchor.element.x);
        minY = Math.min(minY, anchor.element.y);
        maxX = Math.max(maxX, anchor.element.x + anchor.element.width);
        maxY = Math.max(maxY, anchor.element.y + anchor.element.height);
      }

      // Expand zone
      const zone: AnchorZone = {
        anchor: cluster[0],
        x1: Math.max(0, minX - 300),
        y1: Math.max(0, minY - 200),
        x2: Math.min(config.pageWidth, maxX + 300),
        y2: Math.min(config.pageHeight, maxY + 200),
        elements: [],
      };

      // Collect elements within the zone
      for (const el of allElements) {
        const elRight = el.x + el.width;
        const elBottom = el.y + el.height;

        if (
          elRight >= zone.x1 &&
          el.x <= zone.x2 &&
          elBottom >= zone.y1 &&
          el.y <= zone.y2 &&
          !this.isAnchorElement(el, cluster)
        ) {
          zone.elements.push(el);
        }
      }

      if (zone.elements.length >= 3) {
        zones.push(zone);
      }
    }

    return zones;
  }

  private clusterAnchors(anchors: AnchorMatch[], tolerance: number): AnchorMatch[][] {
    if (anchors.length === 0) return [];

    const clusters: AnchorMatch[][] = [];
    const used = new Set<number>();

    for (let i = 0; i < anchors.length; i++) {
      if (used.has(i)) continue;

      const cluster: AnchorMatch[] = [anchors[i]];
      used.add(i);

      for (let j = i + 1; j < anchors.length; j++) {
        if (used.has(j)) continue;

        // Check proximity to any element in cluster
        const closeToCluster = cluster.some(a =>
          Math.abs(a.element.x - anchors[j].element.x) <= tolerance &&
          Math.abs(a.element.y - anchors[j].element.y) <= tolerance * 3
        );

        if (closeToCluster) {
          cluster.push(anchors[j]);
          used.add(j);
        }
      }

      clusters.push(cluster);
    }

    return clusters;
  }

  private isAnchorElement(el: TextElement, cluster: AnchorMatch[]): boolean {
    return cluster.some(a =>
      a.element.x === el.x &&
      a.element.y === el.y &&
      a.element.text === el.text
    );
  }

  // ─── Table Building from Zone ────────────────────────────────────────

  private buildTableFromZone(
    zone: AnchorZone,
    config: DetectionConfig
  ): DetectedTable | null {
    const allElements = [zone.anchor.element, ...zone.elements];
    const rows = this.groupElementsByY(allElements, config.tolerance);

    if (rows.length < config.minRows) return null;

    const colPositions = this.findColumnsFromZone(rows, zone, config);

    if (colPositions.length < config.minCols) return null;

    return this.constructTable(rows, colPositions, config);
  }

  private findColumnsFromZone(
    rows: TextElement[][],
    _zone: AnchorZone,
    config: DetectionConfig
  ): number[] {
    const allX = rows.flatMap(r => r.map(el => el.x));
    if (allX.length === 0) return [];

    // Cluster X positions with tighter tolerance
    const clusters = this.clusterPositions(allX, config.tolerance);

    // Keep clusters with enough representatives
    const consistent = clusters.filter(center => {
      let count = 0;
      for (const row of rows) {
        if (row.some(el => Math.abs(el.x - center) <= config.tolerance * 1.5)) {
          count++;
        }
      }
      return count >= Math.max(1, Math.ceil(rows.length * 0.3));
    });

    consistent.sort((a, b) => a - b);
    return consistent.length >= config.minCols ? consistent : [];
  }

  // ─── Global Anchor Table ─────────────────────────────────────────────

  private buildGlobalAnchorTable(
    elements: TextElement[],
    _anchors: AnchorMatch[],
    config: DetectionConfig
  ): DetectedTable | null {
    // Use anchor positions to define a global table region
    const allElements = [...elements];

    const rows = this.groupElementsByY(allElements, config.tolerance);

    if (rows.length < config.minRows) return null;

    const allX = rows.flatMap(r => r.map(el => el.x));
    const colPositions = this.clusterPositions(allX, config.tolerance)
      .filter(c => {
        let count = 0;
        for (const row of rows) {
          if (row.some(el => Math.abs(el.x - c) <= config.tolerance * 1.5)) {
            count++;
          }
        }
        return count >= Math.max(2, Math.ceil(rows.length * 0.3));
      })
      .sort((a, b) => a - b);

    if (colPositions.length < config.minCols) return null;

    return this.constructTable(rows, colPositions, config);
  }

  // ─── Utility Methods ─────────────────────────────────────────────────

  private groupElementsByY(
    elements: TextElement[],
    tolerance: number
  ): TextElement[][] {
    const sorted = [...elements].sort((a, b) => b.y - a.y);
    const rows: TextElement[][] = [];

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

  private clusterPositions(positions: number[], tolerance: number): number[] {
    if (positions.length === 0) return [];

    const sorted = [...positions].sort((a, b) => a - b);
    const clusters: number[] = [];
    let clusterSum = sorted[0];
    let clusterCount = 1;

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] <= tolerance * 2) {
        clusterSum += sorted[i];
        clusterCount++;
      } else {
        clusters.push(clusterSum / clusterCount);
        clusterSum = sorted[i];
        clusterCount = 1;
      }
    }
    clusters.push(clusterSum / clusterCount);

    return clusters;
  }

  private constructTable(
    rows: TextElement[][],
    colPositions: number[],
    config: DetectionConfig
  ): DetectedTable {
    const cells: TableCell[] = [];

    for (let r = 0; r < rows.length; r++) {
      const rowY = rows[r][0]?.y ?? 0;
      const nextRowY = r < rows.length - 1 ? rows[r + 1][0]?.y ?? 0 : rowY - 20;

      for (let c = 0; c < colPositions.length; c++) {
        const x1 = colPositions[c];
        const x2 = c < colPositions.length - 1 ? colPositions[c + 1] : x1 + 50;

        const cellElements = rows[r].filter(el =>
          el.x >= x1 - config.tolerance && el.x < x2 + config.tolerance
        );

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

    const x1 = Math.min(...colPositions);
    const x2 = colPositions[colPositions.length - 1] + 50;
    const yPositions = rows.map(r => r[0]?.y ?? 0);
    const y1 = Math.max(...yPositions);
    const y2 = Math.min(...yPositions) - 20;

    return {
      id: `anchor-zoning-${Date.now()}`,
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

  private detectHeader(rows: TextElement[][]): boolean {
    if (rows.length < 2) return false;

    // Header detection: first row has bold text or significantly different formatting
    const firstRow = rows[0];
    if (firstRow.some(el => el.isBold || el.fontSize > (rows[1]?.[0]?.fontSize ?? 0) * 1.1)) {
      return true;
    }

    return false;
  }
}
