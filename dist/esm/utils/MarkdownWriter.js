/**
 * Converts a Markdown AST to a markdown string.
 */
export class MarkdownWriter {
    /**
     * Converts a MarkdownNode tree to a markdown string.
     */
    write(node) {
        return this.renderNode(node, 0);
    }
    /**
     * Renders a single node to markdown string.
     */
    renderNode(node, depth) {
        switch (node.type) {
            case 'document':
                return this.renderDocument(node, depth);
            case 'heading':
                return this.renderHeading(node, depth);
            case 'paragraph':
                return this.renderParagraph(node, depth);
            case 'text':
                return this.renderText(node, depth);
            case 'list':
                return this.renderList(node, depth);
            case 'table':
                return this.renderTable(node, depth);
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
    renderDocument(node, _depth) {
        return node.children.map((child) => this.renderNode(child, 0)).join('\n');
    }
    /**
     * Renders a heading node.
     */
    renderHeading(node, _depth) {
        const prefix = '#'.repeat(node.level);
        return `${prefix} ${node.content}\n\n`;
    }
    /**
     * Renders a paragraph node.
     */
    renderParagraph(node, depth) {
        const content = node.children
            .map((child) => this.renderNode(child, depth))
            .join(' ')
            .trim();
        return content ? `${content}\n\n` : '';
    }
    /**
     * Renders a text node.
     */
    renderText(node, _depth) {
        const content = node.content || '';
        const formatting = node.metadata?.formatting;
        if (!formatting) {
            return content;
        }
        return this.applyInlineFormatting(content, formatting);
    }
    /**
     * Applies inline formatting to text.
     */
    applyInlineFormatting(text, formatting) {
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
    renderList(node, _depth) {
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
    renderTable(node, _depth) {
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
    renderCodeBlock(node, _depth) {
        const language = node.metadata?.language || '';
        return `\`\`\`${language}\n${node.content}\n\`\`\`\n\n`;
    }
    /**
     * Renders a blockquote node.
     */
    renderBlockquote(node, depth) {
        const content = node.children
            .map((child) => this.renderNode(child, depth))
            .join('\n')
            .trim();
        const lines = content.split('\n');
        const quoted = lines.map((line) => `> ${line}`).join('\n');
        return `${quoted}\n\n`;
    }
}
