/**
 * Table Transformer
 *
 * Orchestrates table detection using multiple detector techniques.
 * Users can configure weights to favor specific detection methods.
 *
 * SOLID:
 * - OCP: New detectors can be added via registry
 * - DIP: Depends on ITableDetector abstraction
 * - SRP: Only orchestrates detection, doesn't implement algorithms
 */

import type { TextElement } from '../models/TextElement';
import type { MarkdownNode } from '../models/MarkdownNode';
import { createTableNode } from '../models/MarkdownNode';
import type { MarkdownTransformer, TransformationResult } from './MarkdownTransformer';
import type {
  DetectorRegistry,
  DetectedTable,
  DetectionConfig,
  DetectorRegistryConfig} from '../core/table-detection';
import {
  createStandardRegistry,
  DEFAULT_DETECTION_CONFIG
} from '../core/table-detection';

/**
 * Configuration for table transformation.
 */
export interface TableTransformerConfig {
  /**
   * Detector registry configuration (weights, thresholds).
   */
  readonly registry?: Partial<DetectorRegistryConfig>;

  /**
   * Detection tolerance.
   */
  readonly tolerance?: number;

  /**
   * Whether to auto-detect headers.
   */
  readonly autoDetectHeader?: boolean;

  /**
   * Minimum confidence threshold (0-1).
   */
  readonly minConfidence?: number;
}

/**
 * Transformer that detects and converts tables to Markdown.
 *
 * Uses a registry of detection techniques:
 * - **Lattice**: Vector-based line detection (bordered tables)
 * - **Stream**: Whitespace projection profiles (borderless tables)
 * - **R-XY-Cut**: Recursive structural slicing
 * - **Anchor Zoning**: Landmark-based keyword detection
 * - **SCA**: Sparse Columnar Alignment histograms
 * - **Graph-Based**: Relational nearest-neighbor
 * - **Morphology**: Shape-based box dilation
 * - **Visual Signature**: Template matching
 * - **Entropy**: Signal processing for table regions
 */
export class TableTransformer implements MarkdownTransformer {
  private readonly registry: DetectorRegistry;
  private readonly config: TableTransformerConfig;

  constructor(config: TableTransformerConfig = {}) {
    this.config = {
      autoDetectHeader: true,
      ...config,
    };

    this.registry = createStandardRegistry(config.registry);
  }

  getPriority(): number {
    return 80; // High priority, after headings
  }

  canTransform(elements: TextElement[]): boolean {
    // Quick check: need enough elements for a table
    return elements.length >= 4;
  }

  transform(elements: TextElement[], _allElements: TextElement[]): TransformationResult {
    const config: DetectionConfig = {
      ...DEFAULT_DETECTION_CONFIG,
      tolerance: this.config.tolerance ?? DEFAULT_DETECTION_CONFIG.tolerance,
    };

    // Run all detectors via registry
    const tables = this.registry.detectAll(elements, config);

    if (tables.length === 0) {
      return { nodes: [], consumedElements: [] };
    }

    // Map to store elements assigned to each table
    const tableAssignments = new Map<string, { table: DetectedTable; elements: TextElement[] }>();
    const allConsumedElements: TextElement[] = [];

    // Assign each element to the best matching table
    for (const element of elements) {
      let bestTable: DetectedTable | null = null;
      let bestCell: { rowIndex: number; colIndex: number } | null = null;
      let minDistance = Infinity;

      for (const table of tables) {
        const cell = this.findElementCell(element, table);
        if (cell) {
          // If we found a cell, calculate distance to cell center for "best" fit
          const targetCell = table.cells.find(c => c.rowIndex === cell.rowIndex && c.colIndex === cell.colIndex)!;
          const cellCenterX = (targetCell.x1 + targetCell.x2) / 2;
          const cellCenterY = (targetCell.y1 + targetCell.y2) / 2;
          const dx = (element.x + element.width / 2) - cellCenterX;
          const dy = (element.y - element.height / 2) - cellCenterY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < minDistance) {
            minDistance = distance;
            bestTable = table;
            bestCell = cell;
          }
        }
      }

      if (bestTable && bestCell) {
        if (!tableAssignments.has(bestTable.id)) {
          tableAssignments.set(bestTable.id, { table: bestTable, elements: [] });
        }
        tableAssignments.get(bestTable.id)!.elements.push(element);
        allConsumedElements.push(element);
      }
    }

    const nodes: MarkdownNode[] = [];
    const positions: number[] = [];
    for (const assignment of tableAssignments.values()) {
      const { node } = this.buildMarkdownTable(assignment.table, assignment.elements);
      if (node) {
        nodes.push(node);
        const avgY = assignment.elements.reduce((sum, el) => sum + el.y, 0) / assignment.elements.length;
        positions.push(avgY);
      }
    }

    return {
      nodes,
      consumedElements: allConsumedElements,
      positions,
    };
  }

  /**
   * Gets the detector registry for advanced configuration.
   */
  getRegistry(): DetectorRegistry {
    return this.registry;
  }

  /**
   * Builds a Markdown table node from a detected table.
   */
  private buildMarkdownTable(
    table: DetectedTable,
    elements: ReadonlyArray<TextElement>,
  ): { node: MarkdownNode | null; consumedElements: TextElement[] } {
    // Extract text content for each cell
    const headers: string[] = [];
    const rows: string[][] = [];

    // Group elements by cell
    const { cellContent, consumedElements } = this.assignElementsToCells(table, elements);

    // Extract headers (first row)
    if (table.hasHeader) {
      for (let col = 0; col < table.cols; col++) {
        const content = cellContent.get(`0-${col}`) || '';
        headers.push(content.trim());
      }
    }

    // Extract data rows
    const startRow = table.hasHeader ? 1 : 0;
    for (let row = startRow; row < table.rows; row++) {
      const rowData: string[] = [];
      for (let col = 0; col < table.cols; col++) {
        const content = cellContent.get(`${row}-${col}`) || '';
        rowData.push(content.trim());
      }
      rows.push(rowData);
    }

    // If no headers detected, use empty headers
    const finalHeaders = headers.length > 0 ? headers : Array(table.cols).fill('');

    return {
      node: createTableNode(finalHeaders, rows),
      consumedElements,
    };
  }

  /**
   * Assigns text elements to table cells based on position.
   */
  private assignElementsToCells(
    table: DetectedTable,
    elements: ReadonlyArray<TextElement>,
  ): { cellContent: Map<string, string>; consumedElements: TextElement[] } {
    const cellContent = new Map<string, string>();
    const consumedElements: TextElement[] = [];

    for (const element of elements) {
      const cell = this.findElementCell(element, table);
      if (cell) {
        const key = `${cell.rowIndex}-${cell.colIndex}`;
        const existing = cellContent.get(key) || '';
        const separator = existing ? ' ' : '';
        cellContent.set(key, existing + separator + element.text);
        consumedElements.push(element as TextElement);
      }
    }

    return { cellContent, consumedElements };
  }

  /**
   * Finds which cell contains a text element.
   */
  private findElementCell(
    element: TextElement,
    table: DetectedTable,
  ): { rowIndex: number; colIndex: number } | null {
    const centerX = element.x + element.width / 2;
    const centerY = element.y - element.height / 2;

    // First check if it's within the table bounding box (with tolerance)
    const tolerance = this.config.tolerance ?? DEFAULT_DETECTION_CONFIG.tolerance;
    const inTableX = centerX >= table.x1 - tolerance && centerX <= table.x2 + tolerance;
    const inTableY = centerY >= table.y2 - tolerance && centerY <= table.y1 + tolerance; // PDF Y is inverted

    if (!inTableX || !inTableY) {
      return null;
    }

    for (const cell of table.cells) {
      const inX = centerX >= cell.x1 && centerX <= cell.x2;
      const inY = centerY >= cell.y2 && centerY <= cell.y1; // PDF Y is inverted

      if (inX && inY) {
        return { rowIndex: cell.rowIndex, colIndex: cell.colIndex };
      }
    }

    // Fallback: find nearest cell, but ONLY if we are already inside the table bounding box
    let nearest: { rowIndex: number; colIndex: number } | null = null;
    let minDistance = Infinity;

    for (const cell of table.cells) {
      const cellCenterX = (cell.x1 + cell.x2) / 2;
      const cellCenterY = (cell.y1 + cell.y2) / 2;
      const dx = centerX - cellCenterX;
      const dy = centerY - cellCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance) {
        minDistance = distance;
        nearest = { rowIndex: cell.rowIndex, colIndex: cell.colIndex };
      }
    }

    // Still check if the distance is reasonable
    if (minDistance > 50) {
      return null;
    }

    return nearest;
  }
}
