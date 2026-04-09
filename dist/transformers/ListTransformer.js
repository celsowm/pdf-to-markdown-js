"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListTransformer = void 0;
const MarkdownNode_1 = require("../models/MarkdownNode");
/**
 * Common list markers.
 */
const BULLET_MARKERS = ['•', '●', '○', '▪', '▫', '◦', '∙', '-'];
const NUMBERED_PATTERN = /^\d+[\.\)]\s/;
/**
 * Transformer that detects ordered and unordered lists.
 */
class ListTransformer {
    getPriority() {
        return 90; // High priority, but after headings
    }
    canTransform(elements) {
        if (elements.length < 2) {
            return false;
        }
        // Check if elements form a list pattern
        return this.isListPattern(elements);
    }
    transform(elements, _allElements) {
        const nodes = [];
        const isOrdered = this.isOrderedList(elements);
        const listNode = (0, MarkdownNode_1.createListNode)(isOrdered);
        for (const element of elements) {
            const text = this.stripListMarker(element.text);
            const textNode = (0, MarkdownNode_1.createTextNode)(text.trim());
            listNode.children.push(textNode);
        }
        nodes.push(listNode);
        return nodes;
    }
    /**
     * Checks if elements form a list pattern.
     */
    isListPattern(elements) {
        let listCount = 0;
        for (const element of elements) {
            const trimmed = element.text.trim();
            if (this.hasListMarker(trimmed)) {
                listCount++;
            }
        }
        // If majority of elements have list markers, it's a list
        return listCount >= Math.ceil(elements.length * 0.6);
    }
    /**
     * Checks if the list is ordered (numbered).
     */
    isOrderedList(elements) {
        let orderedCount = 0;
        for (const element of elements) {
            const trimmed = element.text.trim();
            if (NUMBERED_PATTERN.test(trimmed)) {
                orderedCount++;
            }
        }
        return orderedCount > elements.length / 2;
    }
    /**
     * Checks if text has a list marker.
     */
    hasListMarker(text) {
        const trimmed = text.trim();
        // Check for bullet markers
        if (BULLET_MARKERS.some((marker) => trimmed.startsWith(marker))) {
            return true;
        }
        // Check for numbered markers
        if (NUMBERED_PATTERN.test(trimmed)) {
            return true;
        }
        // Check for dash marker (common in PDFs)
        if (trimmed.startsWith('- ') && trimmed.length > 2) {
            return true;
        }
        return false;
    }
    /**
     * Strips the list marker from text.
     */
    stripListMarker(text) {
        const trimmed = text.trim();
        // Remove numbered markers (e.g., "1. ", "2) ")
        const numberedMatch = trimmed.match(NUMBERED_PATTERN);
        if (numberedMatch) {
            return trimmed.substring(numberedMatch[0].length);
        }
        // Remove bullet markers
        for (const marker of BULLET_MARKERS) {
            if (trimmed.startsWith(marker)) {
                return trimmed.substring(marker.length).trim();
            }
        }
        // Remove dash marker
        if (trimmed.startsWith('- ')) {
            return trimmed.substring(2).trim();
        }
        return trimmed;
    }
}
exports.ListTransformer = ListTransformer;
//# sourceMappingURL=ListTransformer.js.map