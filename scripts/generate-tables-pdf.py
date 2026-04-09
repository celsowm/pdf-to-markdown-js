#!/usr/bin/env python3
"""
Generates a test PDF with tables that have explicit line borders for Lattice detection.
"""

import os
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.lib.colors import black
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.lib import colors

# Output directory
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'tests', 'fixtures')
os.makedirs(OUTPUT_DIR, exist_ok=True)


def generate_tables_with_borders_pdf():
    """Generate a PDF with tables that have explicit borders lines."""
    output_path = os.path.join(OUTPUT_DIR, 'tables-with-borders.pdf')
    doc = SimpleDocTemplate(output_path, pagesize=letter)
    styles = getSampleStyleSheet()

    story = []

    # Title
    story.append(Paragraph('Tables with Borders', styles['Title']))
    story.append(Spacer(1, 12))

    # Table 1: Full grid with all borders
    story.append(Paragraph('Table 1: Full Grid Borders', styles['Heading2']))
    story.append(Spacer(1, 6))

    data1 = [
        ['Header 1', 'Header 2', 'Header 3'],
        ['Row 1 Col 1', 'Row 1 Col 2', 'Row 1 Col 3'],
        ['Row 2 Col 1', 'Row 2 Col 2', 'Row 2 Col 3'],
        ['Row 3 Col 1', 'Row 3 Col 2', 'Row 3 Col 3'],
    ]

    table1 = Table(data1, colWidths=[1.5*inch, 1.5*inch, 1.5*inch])
    table1.setStyle(TableStyle([
        # Full grid - all borders
        ('GRID', (0, 0), (-1, -1), 1, black),
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
    ]))
    story.append(table1)
    story.append(Spacer(1, 12))

    # Table 2: Only outer border
    story.append(Paragraph('Table 2: Outer Border Only', styles['Heading2']))
    story.append(Spacer(1, 6))

    data2 = [
        ['Name', 'Age'],
        ['Alice', '30'],
        ['Bob', '25'],
    ]

    table2 = Table(data2, colWidths=[2*inch, 2*inch])
    table2.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 2, black),
    ]))
    story.append(table2)
    story.append(Spacer(1, 12))

    # Table 3: Inner lines only
    story.append(Paragraph('Table 3: Inner Lines Only', styles['Heading2']))
    story.append(Spacer(1, 6))

    data3 = [
        ['Product', 'Price', 'Qty'],
        ['Widget', '$10', '100'],
        ['Gadget', '$25', '50'],
    ]

    table3 = Table(data3, colWidths=[1.5*inch, 1*inch, 1*inch])
    table3.setStyle(TableStyle([
        ('INNERGRID', (0, 0), (-1, -1), 1, black),
    ]))
    story.append(table3)
    story.append(Spacer(1, 12))

    # Table 4: Simple 2x2 table
    story.append(Paragraph('Table 4: Simple 2x2', styles['Heading2']))
    story.append(Spacer(1, 6))

    data4 = [
        ['A', 'B'],
        ['C', 'D'],
    ]

    table4 = Table(data4, colWidths=[2*inch, 2*inch])
    table4.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 1, black),
    ]))
    story.append(table4)
    story.append(Spacer(1, 12))

    # Summary
    story.append(Paragraph('Summary', styles['Heading2']))
    story.append(Spacer(1, 6))
    story.append(
        Paragraph(
            'These tables have explicit border lines that should be detected '
            'by the Lattice algorithm. The converter should extract them as markdown tables.',
            styles['Normal'],
        )
    )

    doc.build(story)
    print(f'Generated: {output_path}')


def generate_borderless_tables_pdf():
    """Generate a PDF with tables without borders (for Stream heuristic testing)."""
    output_path = os.path.join(OUTPUT_DIR, 'borderless-tables.pdf')
    doc = SimpleDocTemplate(output_path, pagesize=letter)
    styles = getSampleStyleSheet()

    story = []

    # Title
    story.append(Paragraph('Borderless Tables', styles['Title']))
    story.append(Spacer(1, 12))

    # Table without borders
    story.append(Paragraph('Table Without Borders', styles['Heading2']))
    story.append(Spacer(1, 6))

    data = [
        ['Name', 'Age', 'City'],
        ['Alice', '30', 'New York'],
        ['Bob', '25', 'London'],
        ['Charlie', '35', 'Paris'],
    ]

    table = Table(data, colWidths=[1.5*inch, 1*inch, 2*inch])
    # No borders
    story.append(table)
    story.append(Spacer(1, 12))

    # Another borderless table
    story.append(Paragraph('Products Table', styles['Heading2']))
    story.append(Spacer(1, 6))

    products = [
        ['Product', 'Price', 'Quantity'],
        ['Widget', '$10', '100'],
        ['Gadget', '$25', '50'],
        ['Doohickey', '$5', '200'],
    ]

    product_table = Table(products, colWidths=[2*inch, 1*inch, 1.5*inch])
    story.append(product_table)

    doc.build(story)
    print(f'Generated: {output_path}')


if __name__ == '__main__':
    print('Generating table test PDFs...')
    generate_tables_with_borders_pdf()
    generate_borderless_tables_pdf()
    print('Done!')
