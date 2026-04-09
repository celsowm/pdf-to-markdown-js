#!/usr/bin/env python3
"""
Generates a test PDF with multiple font variations for testing bold/italic detection.
"""

import os
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.pdfbase import pdfmetrics
from reportlab.lib.fonts import addMapping

# Output directory
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'tests', 'fixtures')
os.makedirs(OUTPUT_DIR, exist_ok=True)


def generate_font_variations_pdf():
    """Generate a PDF with multiple font families and variations."""
    output_path = os.path.join(OUTPUT_DIR, 'font-variations.pdf')
    doc = SimpleDocTemplate(output_path, pagesize=letter)
    styles = getSampleStyleSheet()

    story = []

    # Title
    story.append(Paragraph('Font Variations Test', styles['Title']))
    story.append(Spacer(1, 12))

    # Test different font families with bold/italic variations
    
    # Helvetica family
    story.append(Paragraph('Helvetica Family:', styles['Heading2']))
    story.append(Spacer(1, 6))
    
    helv_styles = [
        ('Helvetica', 'Normal'),
        ('Helvetica-Bold', 'Bold'),
        ('Helvetica-Oblique', 'Italic'),
        ('Helvetica-BoldOblique', 'Bold Italic'),
    ]
    
    for font_name, label in helv_styles:
        try:
            style = ParagraphStyle(
                f'Helvetica_{label}',
                parent=styles['Normal'],
                fontName=font_name,
                fontSize=12,
            )
            story.append(Paragraph(f'{label}: This text uses {font_name}', style))
            story.append(Spacer(1, 4))
        except:
            pass
    
    story.append(Spacer(1, 12))
    
    # Arial family
    story.append(Paragraph('Arial Family:', styles['Heading2']))
    story.append(Spacer(1, 6))
    
    arial_styles = [
        ('Arial', 'Normal'),
        ('Arial-BoldMT', 'Bold'),
        ('Arial-ItalicMT', 'Italic'),
        ('Arial-BoldItalicMT', 'Bold Italic'),
    ]
    
    for font_name, label in arial_styles:
        try:
            style = ParagraphStyle(
                f'Arial_{label}',
                parent=styles['Normal'],
                fontName=font_name,
                fontSize=12,
            )
            story.append(Paragraph(f'{label}: This text uses {font_name}', style))
            story.append(Spacer(1, 4))
        except:
            pass
    
    story.append(Spacer(1, 12))
    
    # Times family
    story.append(Paragraph('Times Family:', styles['Heading2']))
    story.append(Spacer(1, 6))
    
    times_styles = [
        ('Times-Roman', 'Normal'),
        ('Times-Bold', 'Bold'),
        ('Times-Italic', 'Italic'),
        ('Times-BoldItalic', 'Bold Italic'),
    ]
    
    for font_name, label in times_styles:
        try:
            style = ParagraphStyle(
                f'Times_{label}',
                parent=styles['Normal'],
                fontName=font_name,
                fontSize=12,
            )
            story.append(Paragraph(f'{label}: This text uses {font_name}', style))
            story.append(Spacer(1, 4))
        except:
            pass
    
    story.append(Spacer(1, 12))
    
    # Courier family
    story.append(Paragraph('Courier Family:', styles['Heading2']))
    story.append(Spacer(1, 6))
    
    courier_styles = [
        ('Courier', 'Normal'),
        ('Courier-Bold', 'Bold'),
        ('Courier-Oblique', 'Italic'),
        ('Courier-BoldOblique', 'Bold Italic'),
    ]
    
    for font_name, label in courier_styles:
        try:
            style = ParagraphStyle(
                f'Courier_{label}',
                parent=styles['Normal'],
                fontName=font_name,
                fontSize=12,
            )
            story.append(Paragraph(f'{label}: This text uses {font_name}', style))
            story.append(Spacer(1, 4))
        except:
            pass
    
    story.append(Spacer(1, 12))
    
    # Summary
    story.append(Paragraph('Summary', styles['Heading2']))
    story.append(Spacer(1, 6))
    story.append(
        Paragraph(
            'This PDF contains multiple font families with bold and italic variations. '
            'The converter should detect and properly convert all formatting to markdown.',
            styles['Normal'],
        )
    )

    doc.build(story)
    print(f'Generated: {output_path}')


if __name__ == '__main__':
    print('Generating font variations test PDF...')
    generate_font_variations_pdf()
    print('Done!')
