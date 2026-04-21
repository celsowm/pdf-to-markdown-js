import {
  MarkdownNode,
  HeadingNode,
  ListNode,
  TableNode,
  InlineFormatting,
} from '../models/MarkdownNode';

/**
 * Converts a Markdown AST to a markdown string.
 */
export class MarkdownWriter {
  /**
   * Converts a MarkdownNode tree to a markdown string.
   */
  write(node: MarkdownNode): string {
    return this.renderNode(node, 0);
  }

  /**
   * Renders a single node to markdown string.
   */
  private renderNode(node: MarkdownNode, depth: number): string {
    switch (node.type) {
      case 'document':
        return this.renderDocument(node, depth);
      case 'heading':
        return this.renderHeading(node as HeadingNode, depth);
      case 'paragraph':
        return this.renderParagraph(node, depth);
      case 'text':
        return this.renderText(node, depth);
      case 'list':
        return this.renderList(node as ListNode, depth);
      case 'table':
        return this.renderTable(node as TableNode, depth);
      case 'codeBlock':
        return this.renderCodeBlock(node, depth);
      case 'blockquote':
        return this.renderBlockquote(node, depth);
      case 'horizontalRule':
        return '---\n\n';
      case 'lineBreak':
        return '  \n';
      default:
        return '';
    }
  }

  /**
   * Renders a document node.
   */
  private renderDocument(node: MarkdownNode, _depth: number): string {
    return node.children.map((child) => this.renderNode(child, 0)).join('\n');
  }

  /**
   * Renders a heading node.
   */
  private renderHeading(node: HeadingNode, _depth: number): string {
    const prefix = '#'.repeat(node.level);
    return `${prefix} ${node.content}\n\n`;
  }

  /**
   * Renders a paragraph node.
   */
  private renderParagraph(node: MarkdownNode, depth: number): string {
    const content = node.children
      .map((child) => this.renderNode(child, depth))
      .join(' ')
      .trim();

    return content ? `${content}\n\n` : '';
  }

  /**
   * Renders a text node.
   */
  private renderText(node: MarkdownNode, _depth: number): string {
    const content = node.content || '';
    const formatting = node.metadata?.formatting as InlineFormatting | undefined;

    if (!formatting) {
      return content;
    }

    return this.applyInlineFormatting(content, formatting);
  }

  /**
   * Applies inline formatting to text.
   */
  private applyInlineFormatting(text: string, formatting: InlineFormatting): string {
    let result = text;

    // Apply code formatting first (backticks)
    if (formatting.code) {
      result = `\`${result}\``;
    }

    // Apply bold
    if (formatting.bold) {
      result = `**${result}**`;
    }

    // Apply italic
    if (formatting.italic) {
      result = `*${result}*`;
    }

    // Apply strike-through
    if (formatting.strike) {
      result = `~~${result}~~`;
    }

    return result;
  }

  /**
   * Renders a list node.
   */
  private renderList(node: ListNode, _depth: number): string {
    let result = '';
    let index = 1;

    for (const item of node.children) {
      const prefix = node.ordered ? `${index}.` : '-';
      const itemContent = item.children
        .map((child) => this.renderNode(child, 0))
        .join(' ')
        .trim();

      result += `${prefix} ${itemContent}\n`;
      index++;
    }

    return result + '\n';
  }

  /**
   * Renders a table node.
   */
  private renderTable(node: TableNode, _depth: number): string {
    let result = '';

    // Header row
    result += '| ' + node.headers.join(' | ') + ' |\n';
    result += '| ' + node.headers.map(() => '---').join(' | ') + ' |\n';

    // Data rows
    for (const row of node.rows) {
      result += '| ' + row.join(' | ') + ' |\n';
    }

    return result + '\n';
  }

  /**
   * Renders a code block node.
   */
  private renderCodeBlock(node: MarkdownNode, _depth: number): string {
    const language = node.metadata?.language || '';
    return `\`\`\`${language}\n${node.content}\n\`\`\`\n\n`;
  }

  /**
   * Renders a blockquote node.
   */
  private renderBlockquote(node: MarkdownNode, depth: number): string {
    const content = node.children
      .map((child) => this.renderNode(child, depth))
      .join('\n')
      .trim();

    const lines = content.split('\n');
    const quoted = lines.map((line) => `> ${line}`).join('\n');

    return `${quoted}\n\n`;
  }
}
