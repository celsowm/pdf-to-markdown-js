/**
 * Represents the type of a Markdown node in the AST.
 */
export type MarkdownNodeType =
  | 'document'
  | 'heading'
  | 'paragraph'
  | 'text'
  | 'list'
  | 'listItem'
  | 'table'
  | 'tableRow'
  | 'tableCell'
  | 'codeBlock'
  | 'blockquote'
  | 'horizontalRule'
  | 'lineBreak';

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
export const DEFAULT_FORMATTING: InlineFormatting = {
  bold: false,
  italic: false,
  strike: false,
  code: false,
};

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
export function createDocumentNode(children: MarkdownNode[]): MarkdownNode {
  return {
    type: 'document',
    children,
  };
}

/**
 * Helper function to create a heading node.
 */
export function createHeadingNode(level: 1 | 2 | 3 | 4 | 5 | 6, content: string): HeadingNode {
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
export function createParagraphNode(children: MarkdownNode[]): ParagraphNode {
  return {
    type: 'paragraph',
    children,
  };
}

/**
 * Helper function to create a text node.
 */
export function createTextNode(
  content: string,
  formatting: InlineFormatting = DEFAULT_FORMATTING,
): MarkdownNode {
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
export function createListNode(ordered: boolean): ListNode {
  return {
    type: 'list',
    ordered,
    children: [],
  };
}

/**
 * Helper function to create a table node.
 */
export function createTableNode(headers: string[], rows: string[][]): TableNode {
  return {
    type: 'table',
    headers,
    rows,
    children: [],
  };
}
