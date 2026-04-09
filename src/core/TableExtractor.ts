import { TextElement } from '../models/TextElement';
import { DetectedTable, TableCell } from './LatticeDetector';

/**
 * Extracts text content from detected table cells.
 */
export class TableExtractor {
  /**
   * Extracts text from table cells based on text element positions.
   */
  extractTableContent(
    table: DetectedTable,
    allTextElements: ReadonlyArray<TextElement>
  ): string[][] {
    // Initialize empty table
    const tableContent: string[][] = Array.from(
      { length: table.rows },
      () => Array(table.cols).fill('')
    );

    // Assign text elements to cells
    for (const textEl of allTextElements) {
      const cell = this.findCellForTextElement(textEl, table.cells);

      if (cell && cell.rowIndex < table.rows && cell.colIndex < table.cols) {
        const currentContent = tableContent[cell.rowIndex][cell.colIndex];
        const separator = currentContent ? ' ' : '';
        tableContent[cell.rowIndex][cell.colIndex] = currentContent + separator + textEl.text;
      }
    }

    // Trim whitespace from all cells
    return tableContent.map((row) =>
      row.map((cell) => cell.trim())
    );
  }

  /**
   * Finds which cell a text element belongs to based on position.
   */
  private findCellForTextElement(
    textEl: TextElement,
    cells: TableCell[]
  ): TableCell | null {
    // Calculate center point of text element
    const textCenterX = textEl.x + textEl.width / 2;
    const textCenterY = textEl.y - textEl.height / 2; // PDF Y is inverted

    for (const cell of cells) {
      const inX = textCenterX >= cell.x1 && textCenterX <= cell.x2;
      const inY = textCenterY >= cell.y1 && textCenterY <= cell.y2;

      if (inX && inY) {
        return cell;
      }
    }

    // Fallback: find closest cell
    let closestCell: TableCell | null = null;
    let closestDistance = Infinity;

    for (const cell of cells) {
      const cellCenterX = (cell.x1 + cell.x2) / 2;
      const cellCenterY = (cell.y1 + cell.y2) / 2;

      const dx = textCenterX - cellCenterX;
      const dy = textCenterY - cellCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestCell = cell;
      }
    }

    return closestCell;
  }

  /**
   * Filters text elements that fall within the table boundaries.
   */
  filterTextElementsForTable(
    table: DetectedTable,
    allTextElements: ReadonlyArray<TextElement>
  ): TextElement[] {
    const padding = 5; // Small padding around table

    return allTextElements.filter(
      (el) =>
        el.x >= table.x1 - padding &&
        el.x <= table.x2 + padding &&
        el.y >= table.y1 - padding &&
        el.y <= table.y2 + padding
    );
  }
}
