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

import { TextElement } from '../models/TextElement';
import { MarkdownNode, createTableNode } from '../models/MarkdownNode';
import { MarkdownTransformer } from './MarkdownTransformer';
import {
  DetectorRegistry,
  createStandardRegistry,
  DetectedTable,
  DetectionConfig,
  DEFAULT_DETECTION_CONFIG,
  DetectorRegistryConfig,
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

  transform(elements: TextElement[], _allElements: TextElement[]): MarkdownNode[] {
    const config: DetectionConfig = {
      ...DEFAULT_DETECTION_CONFIG,
      tolerance: this.config.tolerance ?? DEFAULT_DETECTION_CONFIG.tolerance,
    };

    // Run all detectors via registry
    const tables = this.registry.detectAll(elements, config);

    if (tables.length === 0) {
      return [];
    }

    // Convert tables to Markdown nodes
    return this.convertTablesToMarkdown(tables, elements);
  }

  /**
   * Gets the detector registry for advanced configuration.
   */
  getRegistry(): DetectorRegistry {
    return this.registry;
  }

  /**
   * Converts detected tables to Markdown nodes.
   */
  private convertTablesToMarkdown(
    tables: DetectedTable[],
    elements: ReadonlyArray<TextElement>,
  ): MarkdownNode[] {
    const nodes: MarkdownNode[] = [];

    for (const table of tables) {
      const markdownTable = this.buildMarkdownTable(table, elements);
      if (markdownTable) {
        nodes.push(markdownTable);
      }
    }

    return nodes;
  }

  /**
   * Builds a Markdown table node from a detected table.
   */
  private buildMarkdownTable(
    table: DetectedTable,
    elements: ReadonlyArray<TextElement>,
  ): MarkdownNode | null {
    // Extract text content for each cell
    const headers: string[] = [];
    const rows: string[][] = [];

    // Group elements by cell
    const cellContent = this.assignElementsToCells(table, elements);

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

    return createTableNode(finalHeaders, rows);
  }

  /**
   * Assigns text elements to table cells based on position.
   */
  private assignElementsToCells(
    table: DetectedTable,
    elements: ReadonlyArray<TextElement>,
  ): Map<string, string> {
    const cellContent = new Map<string, string>();

    for (const element of elements) {
      const cell = this.findElementCell(element, table);
      if (cell) {
        const key = `${cell.rowIndex}-${cell.colIndex}`;
        const existing = cellContent.get(key) || '';
        const separator = existing ? ' ' : '';
        cellContent.set(key, existing + separator + element.text);
      }
    }

    return cellContent;
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

    for (const cell of table.cells) {
      const inX = centerX >= cell.x1 && centerX <= cell.x2;
      const inY = centerY >= cell.y2 && centerY <= cell.y1; // PDF Y is inverted

      if (inX && inY) {
        return { rowIndex: cell.rowIndex, colIndex: cell.colIndex };
      }
    }

    // Fallback: find nearest cell
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

    return nearest;
  }
}
