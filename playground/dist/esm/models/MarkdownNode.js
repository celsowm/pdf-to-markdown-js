/**
 * Default inline formatting.
 */
export const DEFAULT_FORMATTING = {
    bold: false,
    italic: false,
    strike: false,
    code: false,
};
/**
 * Helper function to create a document node.
 */
export function createDocumentNode(children) {
    return {
        type: 'document',
        children,
    };
}
/**
 * Helper function to create a heading node.
 */
export function createHeadingNode(level, content) {
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
export function createParagraphNode(children) {
    return {
        type: 'paragraph',
        children,
    };
}
/**
 * Helper function to create a text node.
 */
export function createTextNode(content, formatting = DEFAULT_FORMATTING) {
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
export function createListNode(ordered) {
    return {
        type: 'list',
        ordered,
        children: [],
    };
}
/**
 * Helper function to create a table node.
 */
export function createTableNode(headers, rows) {
    return {
        type: 'table',
        headers,
        rows,
        children: [],
    };
}
