import { createHeadingNode } from '../models/MarkdownNode';
/**
 * Font size thresholds for heading levels.
 */
const HEADING_THRESHOLDS = {
    h1: 24,
    h2: 20,
    h3: 16,
    h4: 14,
    h5: 12,
    h6: 11,
};
/**
 * Transformer that detects headings based on font size and weight.
 */
export class HeadingTransformer {
    getPriority() {
        return 100; // Highest priority - headings should be detected first
    }
    canTransform(elements) {
        if (elements.length === 0) {
            return false;
        }
        // Check if any element has a font size that qualifies as a heading
        return elements.some((el) => el.fontSize >= HEADING_THRESHOLDS.h6 || el.isBold);
    }
    transform(elements, allElements) {
        const nodes = [];
        const medianFontSize = this.getMedianFontSize(allElements);
        for (const element of elements) {
            const headingLevel = this.detectHeadingLevel(element, medianFontSize);
            if (headingLevel) {
                nodes.push(createHeadingNode(headingLevel, element.text.trim()));
            }
        }
        return nodes;
    }
    /**
     * Detects the heading level based on font size and weight.
     */
    detectHeadingLevel(element, medianFontSize) {
        const { fontSize, isBold } = element;
        // If font size is significantly larger than median, it's likely a heading
        const ratio = fontSize / medianFontSize;
        if (fontSize >= HEADING_THRESHOLDS.h1 || (isBold && ratio > 2)) {
            return 1;
        }
        else if (fontSize >= HEADING_THRESHOLDS.h2 || (isBold && ratio > 1.7)) {
            return 2;
        }
        else if (fontSize >= HEADING_THRESHOLDS.h3 || (isBold && ratio > 1.4)) {
            return 3;
        }
        else if (fontSize >= HEADING_THRESHOLDS.h4 || (isBold && ratio > 1.2)) {
            return 4;
        }
        else if (fontSize >= HEADING_THRESHOLDS.h5 || (isBold && ratio > 1.1)) {
            return 5;
        }
        else if (fontSize >= HEADING_THRESHOLDS.h6 || (isBold && ratio > 1.05)) {
            return 6;
        }
        return null;
    }
    /**
     * Calculates the median font size from all elements.
     */
    getMedianFontSize(elements) {
        if (elements.length === 0) {
            return 12; // Default
        }
        const sorted = [...elements].sort((a, b) => a.fontSize - b.fontSize);
        const middle = Math.floor(sorted.length / 2);
        if (sorted.length % 2 === 0) {
            return (sorted[middle - 1].fontSize + sorted[middle].fontSize) / 2;
        }
        return sorted[middle].fontSize;
    }
}
