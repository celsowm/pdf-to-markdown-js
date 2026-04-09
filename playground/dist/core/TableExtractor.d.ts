import { TextElement } from '../models/TextElement';
import { DetectedTable } from './LatticeDetector';
/**
 * Extracts text content from detected table cells.
 */
export declare class TableExtractor {
    /**
     * Extracts text from table cells based on text element positions.
     */
    extractTableContent(table: DetectedTable, allTextElements: ReadonlyArray<TextElement>): string[][];
    /**
     * Finds which cell a text element belongs to based on position.
     */
    private findCellForTextElement;
    /**
     * Filters text elements that fall within the table boundaries.
     */
    filterTextElementsForTable(table: DetectedTable, allTextElements: ReadonlyArray<TextElement>): TextElement[];
}
//# sourceMappingURL=TableExtractor.d.ts.map