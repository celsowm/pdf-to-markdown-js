"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_FORMATTING = void 0;
exports.createDocumentNode = createDocumentNode;
exports.createHeadingNode = createHeadingNode;
exports.createParagraphNode = createParagraphNode;
exports.createTextNode = createTextNode;
exports.createListNode = createListNode;
exports.createTableNode = createTableNode;
/**
 * Default inline formatting.
 */
exports.DEFAULT_FORMATTING = {
    bold: false,
    italic: false,
    strike: false,
    code: false,
};
/**
 * Helper function to create a document node.
 */
function createDocumentNode(children) {
    return {
        type: 'document',
        children,
    };
}
/**
 * Helper function to create a heading node.
 */
function createHeadingNode(level, content) {
    return {
        type: 'heading',
        level,
        content,
        children: [],
    };
}
/**
 * Helper function to create a paragraph node.
 */
function createParagraphNode(children) {
    return {
        type: 'paragraph',
        children,
    };
}
/**
 * Helper function to create a text node.
 */
function createTextNode(content, formatting = exports.DEFAULT_FORMATTING) {
    return {
        type: 'text',
        content,
        children: [],
        metadata: { formatting },
    };
}
/**
 * Helper function to create a list node.
 */
function createListNode(ordered) {
    return {
        type: 'list',
        ordered,
        children: [],
    };
}
/**
 * Helper function to create a table node.
 */
function createTableNode(headers, rows) {
    return {
        type: 'table',
        headers,
        rows,
        children: [],
    };
}
//# sourceMappingURL=MarkdownNode.js.map