import reportlab.rl_config
reportlab.rl_config.pageCompression = 0
#!/usr/bin/env python3
"""
Generates test PDF files for testing the PDF to Markdown converter.
Uses reportlab library to create controlled PDFs.
"""

import os
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import black
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    ListFlowable,
    ListItem,
    Table,
    TableStyle,
    PageBreak,
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER

# Output directory
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'tests', 'fixtures')
os.makedirs(OUTPUT_DIR, exist_ok=True)


def generate_simple_text_pdf():
    """Generate a PDF with simple text paragraphs."""
    output_path = os.path.join(OUTPUT_DIR, 'simple-text.pdf')
    doc = SimpleDocTemplate(output_path, pagesize=letter)
    styles = getSampleStyleSheet()

    story = []

    # Add some paragraphs
    story.append(
        Paragraph(
            'This is a simple text document with basic paragraphs. '
            'It contains multiple sentences to test the text extraction capabilities.',
            styles['Normal'],
        )
    )
    story.append(Spacer(1, 12))

    story.append(
        Paragraph(
            'The second paragraph demonstrates regular text flow. '
            'PDF parsers should be able to extract this text correctly '
            'and convert it to markdown format.',
            styles['Normal'],
        )
    )
    story.append(Spacer(1, 12))

    story.append(
        Paragraph(
            'A third paragraph to ensure multiple paragraphs are handled properly.',
            styles['Normal'],
        )
    )

    doc.build(story)
    print(f'Generated: {output_path}')


def generate_headings_pdf():
    """Generate a PDF with different heading levels."""
    output_path = os.path.join(OUTPUT_DIR, 'with-headings.pdf')
    doc = SimpleDocTemplate(output_path, pagesize=letter)
    styles = getSampleStyleSheet()

    # Create custom styles for headings
    h1_style = ParagraphStyle(
        'CustomH1',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=20,
    )

    h2_style = ParagraphStyle(
        'CustomH2',
        parent=styles['Heading2'],
        fontSize=18,
        spaceAfter=15,
    )

    h3_style = ParagraphStyle(
        'CustomH3',
        parent=styles['Heading3'],
        fontSize=14,
        spaceAfter=12,
    )

    story = []

    # Main title
    story.append(Paragraph('Main Document Title', h1_style))
    story.append(Spacer(1, 12))

    # Section heading
    story.append(Paragraph('First Section', h2_style))
    story.append(Spacer(1, 12))

    story.append(
        Paragraph(
            'This is the content under the first section. '
            'It should be detected as a paragraph.',
            styles['Normal'],
        )
    )
    story.append(Spacer(1, 12))

    # Subsection
    story.append(Paragraph('Subsection 1.1', h3_style))
    story.append(Spacer(1, 12))

    story.append(
        Paragraph(
            'Content under the subsection. The font size differences '
            'should help the parser identify the structure.',
            styles['Normal'],
        )
    )
    story.append(Spacer(1, 12))

    # Another section
    story.append(Paragraph('Second Section', h2_style))
    story.append(Spacer(1, 12))

    story.append(
        Paragraph(
            'More content in the second section for testing purposes.',
            styles['Normal'],
        )
    )

    doc.build(story)
    print(f'Generated: {output_path}')


def generate_lists_pdf():
    """Generate a PDF with ordered and unordered lists."""
    output_path = os.path.join(OUTPUT_DIR, 'with-lists.pdf')
    doc = SimpleDocTemplate(output_path, pagesize=letter)
    styles = getSampleStyleSheet()

    story = []

    # Title
    story.append(Paragraph('Document with Lists', styles['Heading1']))
    story.append(Spacer(1, 12))

    # Unordered list
    story.append(Paragraph('Unordered List:', styles['Heading2']))
    story.append(Spacer(1, 6))

    unordered_list = ListFlowable(
        [
            ListItem(Paragraph('First item in the list', styles['Normal'])),
            ListItem(Paragraph('Second item with more text', styles['Normal'])),
            ListItem(Paragraph('Third and final item', styles['Normal'])),
        ],
        bulletType='bullet',
    )
    story.append(unordered_list)
    story.append(Spacer(1, 12))

    # Ordered list
    story.append(Paragraph('Ordered List:', styles['Heading2']))
    story.append(Spacer(1, 6))

    ordered_list = ListFlowable(
        [
            ListItem(Paragraph('Step one of the process', styles['Normal'])),
            ListItem(Paragraph('Step two continues the flow', styles['Normal'])),
            ListItem(Paragraph('Step three completes the list', styles['Normal'])),
        ],
        bulletType='1',
    )
    story.append(ordered_list)

    doc.build(story)
    print(f'Generated: {output_path}')


def generate_tables_pdf():
    """Generate a PDF with a simple table."""
    output_path = os.path.join(OUTPUT_DIR, 'with-tables.pdf')
    doc = SimpleDocTemplate(output_path, pagesize=letter)
    styles = getSampleStyleSheet()

    story = []

    # Title
    story.append(Paragraph('Document with Tables', styles['Heading1']))
    story.append(Spacer(1, 12))

    # Simple table
    story.append(Paragraph('Simple Data Table:', styles['Heading2']))
    story.append(Spacer(1, 6))

    data = [
        ['Name', 'Age', 'City'],
        ['Alice', '30', 'New York'],
        ['Bob', '25', 'London'],
        ['Charlie', '35', 'Paris'],
    ]

    table = Table(data)
    table.setStyle(
        TableStyle(
            [
                ('BACKGROUND', (0, 0), (-1, 0), 'grey'),
                ('TEXTCOLOR', (0, 0), (-1, 0), 'black'),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('GRID', (0, 0), (-1, -1), 1, 'black'),
            ]
        )
    )
    story.append(table)
    story.append(Spacer(1, 12))

    # Another table
    story.append(Paragraph('Products Table:', styles['Heading2']))
    story.append(Spacer(1, 6))

    products = [
        ['Product', 'Price', 'Quantity'],
        ['Widget', '$10', '100'],
        ['Gadget', '$25', '50'],
        ['Doohickey', '$5', '200'],
    ]

    product_table = Table(products)
    product_table.setStyle(
        TableStyle(
            [
                ('BACKGROUND', (0, 0), (-1, 0), 'lightblue'),
                ('GRID', (0, 0), (-1, -1), 1, 'black'),
            ]
        )
    )
    story.append(product_table)

    doc.build(story)
    print(f'Generated: {output_path}')


def generate_mixed_content_pdf():
    """Generate a PDF with mixed content types."""
    output_path = os.path.join(OUTPUT_DIR, 'mixed-content.pdf')
    doc = SimpleDocTemplate(output_path, pagesize=letter)
    styles = getSampleStyleSheet()

    story = []

    # Title
    story.append(Paragraph('Mixed Content Document', styles['Title']))
    story.append(Spacer(1, 12))

    # Introduction
    story.append(
        Paragraph(
            'This document contains mixed content including headings, '
            'paragraphs, lists, and tables to test comprehensive PDF parsing.',
            styles['Normal'],
        )
    )
    story.append(Spacer(1, 12))

    # Section with list
    story.append(Paragraph('Features', styles['Heading1']))
    story.append(Spacer(1, 6))

    features = ListFlowable(
        [
            ListItem(Paragraph('Feature one description', styles['Normal'])),
            ListItem(Paragraph('Feature two with details', styles['Normal'])),
            ListItem(Paragraph('Feature three explained', styles['Normal'])),
        ],
        bulletType='bullet',
    )
    story.append(features)
    story.append(Spacer(1, 12))

    # Another section
    story.append(Paragraph('Results', styles['Heading1']))
    story.append(Spacer(1, 6))

    story.append(
        Paragraph(
            'The results show significant improvement in performance metrics.',
            styles['Normal'],
        )
    )

    doc.build(story)
    print(f'Generated: {output_path}')


def generate_inline_formatting_pdf():
    """Generate a PDF with bold, italic, and strikethrough formatting."""
    output_path = os.path.join(OUTPUT_DIR, 'with-inline-formatting.pdf')
    doc = SimpleDocTemplate(output_path, pagesize=letter)
    styles = getSampleStyleSheet()

    # Create custom styles
    bold_style = ParagraphStyle(
        'BoldText',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
    )

    italic_style = ParagraphStyle(
        'ItalicText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=12,
    )

    bold_italic_style = ParagraphStyle(
        'BoldItalicText',
        parent=styles['Normal'],
        fontName='Helvetica-BoldOblique',
        fontSize=12,
    )

    story = []

    # Title
    story.append(Paragraph('Inline Formatting Examples', styles['Heading1']))
    story.append(Spacer(1, 12))

    # Bold text
    story.append(Paragraph('Bold Text Examples:', styles['Heading2']))
    story.append(Spacer(1, 6))
    story.append(
        Paragraph(
            'This is <b>bold text</b> that should be detected.',
            styles['Normal'],
        )
    )
    story.append(Spacer(1, 6))
    story.append(
        Paragraph(
            'This entire line is bold and should convert to **markdown**.',
            bold_style,
        )
    )
    story.append(Spacer(1, 12))

    # Italic text
    story.append(Paragraph('Italic Text Examples:', styles['Heading2']))
    story.append(Spacer(1, 6))
    story.append(
        Paragraph(
            'This is <i>italic text</i> that should be detected.',
            styles['Normal'],
        )
    )
    story.append(Spacer(1, 6))
    story.append(
        Paragraph(
            'This entire line is italic and should convert to *markdown*.',
            italic_style,
        )
    )
    story.append(Spacer(1, 12))

    # Bold and italic
    story.append(Paragraph('Bold and Italic:', styles['Heading2']))
    story.append(Spacer(1, 6))
    story.append(
        Paragraph(
            'This is <b><i>bold italic</i></b> text for testing.',
            styles['Normal'],
        )
    )
    story.append(Spacer(1, 6))
    story.append(
        Paragraph(
            'This line is both bold and italic.',
            bold_italic_style,
        )
    )
    story.append(Spacer(1, 12))

    # Strike-through (using custom drawing since reportlab doesn't have native strike)
    story.append(Paragraph('Strike-through Text:', styles['Heading2']))
    story.append(Spacer(1, 6))
    story.append(
        Paragraph(
            'This is <strike>strikethrough text</strike> that should convert to ~~markdown~~.',
            styles['Normal'],
        )
    )
    story.append(Spacer(1, 12))

    # Mixed formatting
    story.append(Paragraph('Mixed Formatting:', styles['Heading2']))
    story.append(Spacer(1, 6))
    story.append(
        Paragraph(
            'This line has <b>bold</b>, <i>italic</i>, and <strike>strike</strike> in the same paragraph.',
            styles['Normal'],
        )
    )
    story.append(Spacer(1, 12))

    # Summary
    story.append(Paragraph('Summary', styles['Heading2']))
    story.append(Spacer(1, 6))
    story.append(
        Paragraph(
            'The converter should detect and properly convert all these formatting '
            'styles to their markdown equivalents: **bold**, *italic*, and ~~strikethrough~~.',
            styles['Normal'],
        )
    )

    doc.build(story)
    print(f'Generated: {output_path}')


if __name__ == '__main__':
    print('Generating test PDFs...')
    generate_simple_text_pdf()
    generate_headings_pdf()
    generate_lists_pdf()
    generate_tables_pdf()
    generate_mixed_content_pdf()
    generate_inline_formatting_pdf()
    print('All test PDFs generated successfully!')
