/**
 * Represents the type of a Markdown node in the AST.
 */
export type MarkdownNodeType = 'document' | 'heading' | 'paragraph' | 'text' | 'list' | 'listItem' | 'table' | 'tableRow' | 'tableCell' | 'codeBlock' | 'blockquote' | 'horizontalRule' | 'lineBreak';
/**
 * Represents inline formatting options for text nodes.
 */
export interface InlineFormatting {
    readonly bold: boolean;
    readonly italic: boolean;
    readonly strike: boolean;
    readonly code: boolean;
}
/**
 * Default inline formatting.
 */
export declare const DEFAULT_FORMATTING: InlineFormatting;
/**
 * Base interface for all Markdown nodes.
 */
export interface MarkdownNode {
    readonly type: MarkdownNodeType;
    readonly children: MarkdownNode[];
    readonly content?: string;
    readonly metadata?: Record<string, unknown>;
}
/**
 * Represents a heading element with a specific level (1-6).
 */
export interface HeadingNode extends MarkdownNode {
    readonly type: 'heading';
    readonly level: 1 | 2 | 3 | 4 | 5 | 6;
    readonly content: string;
}
/**
 * Represents a paragraph element.
 */
export interface ParagraphNode extends MarkdownNode {
    readonly type: 'paragraph';
    readonly children: MarkdownNode[];
}
/**
 * Represents a list (ordered or unordered).
 */
export interface ListNode extends MarkdownNode {
    readonly type: 'list';
    readonly ordered: boolean;
    readonly children: MarkdownNode[];
}
/**
 * Represents a table with rows and cells.
 */
export interface TableNode extends MarkdownNode {
    readonly type: 'table';
    readonly headers: string[];
    readonly rows: string[][];
}
/**
 * Helper function to create a document node.
 */
export declare function createDocumentNode(children: MarkdownNode[]): MarkdownNode;
/**
 * Helper function to create a heading node.
 */
export declare function createHeadingNode(level: 1 | 2 | 3 | 4 | 5 | 6, content: string): HeadingNode;
/**
 * Helper function to create a paragraph node.
 */
export declare function createParagraphNode(children: MarkdownNode[]): ParagraphNode;
/**
 * Helper function to create a text node.
 */
export declare function createTextNode(content: string, formatting?: InlineFormatting): MarkdownNode;
/**
 * Helper function to create a list node.
 */
export declare function createListNode(ordered: boolean): ListNode;
/**
 * Helper function to create a table node.
 */
export declare function createTableNode(headers: string[], rows: string[][]): TableNode;
//# sourceMappingURL=MarkdownNode.d.ts.map