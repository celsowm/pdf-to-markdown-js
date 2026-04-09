import { MarkdownNode } from '../models/MarkdownNode';
/**
 * Converts a Markdown AST to a markdown string.
 */
export declare class MarkdownWriter {
    /**
     * Converts a MarkdownNode tree to a markdown string.
     */
    write(node: MarkdownNode): string;
    /**
     * Renders a single node to markdown string.
     */
    private renderNode;
    /**
     * Renders a document node.
     */
    private renderDocument;
    /**
     * Renders a heading node.
     */
    private renderHeading;
    /**
     * Renders a paragraph node.
     */
    private renderParagraph;
    /**
     * Renders a text node.
     */
    private renderText;
    /**
     * Applies inline formatting to text.
     */
    private applyInlineFormatting;
    /**
     * Renders a list node.
     */
    private renderList;
    /**
     * Renders a table node.
     */
    private renderTable;
    /**
     * Renders a code block node.
     */
    private renderCodeBlock;
    /**
     * Renders a blockquote node.
     */
    private renderBlockquote;
}
//# sourceMappingURL=MarkdownWriter.d.ts.map