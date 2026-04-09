"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParagraphTransformer = void 0;
const MarkdownNode_1 = require("../models/MarkdownNode");
/**
 * Transformer that handles regular paragraphs.
 * This is the fallback transformer for text that doesn't match other patterns.
 */
class ParagraphTransformer {
    getPriority() {
        return 10; // Lowest priority - fallback transformer
    }
    canTransform(_elements) {
        // Always can transform - this is the fallback
        return true;
    }
    transform(elements, _allElements) {
        if (elements.length === 0) {
            return [];
        }
        const nodes = [];
        const paragraphNode = (0, MarkdownNode_1.createParagraphNode)([]);
        for (const element of elements) {
            const textNode = (0, MarkdownNode_1.createTextNode)(element.text.trim());
            paragraphNode.children.push(textNode);
        }
        nodes.push(paragraphNode);
        return nodes;
    }
}
exports.ParagraphTransformer = ParagraphTransformer;
//# sourceMappingURL=ParagraphTransformer.js.map