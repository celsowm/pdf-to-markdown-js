import os
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors

# Output directory
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'tests', 'fixtures')
os.makedirs(OUTPUT_DIR, exist_ok=True)

def generate_zebra_table_pdf():
    output_path = os.path.join(OUTPUT_DIR, 'zebra-table.pdf')
    doc = SimpleDocTemplate(output_path, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph('Zebra Striped Table', styles['Heading1']))
    story.append(Spacer(1, 12))

    data = [
        ['Index', 'Item Name', 'Status', 'Price'],
        ['1', 'Alpha', 'Active', '$10.00'],
        ['2', 'Beta', 'Pending', '$20.00'],
        ['3', 'Gamma', 'Active', '$30.00'],
        ['4', 'Delta', 'Inactive', '$40.00'],
        ['5', 'Epsilon', 'Active', '$50.00'],
        ['6', 'Zeta', 'Pending', '$60.00'],
    ]

    table = Table(data, hAlign='LEFT')
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        # Zebra striping
        ('BACKGROUND', (0, 1), (-1, 1), colors.whitesmoke),
        ('BACKGROUND', (0, 2), (-1, 2), colors.lightgrey),
        ('BACKGROUND', (0, 3), (-1, 3), colors.whitesmoke),
        ('BACKGROUND', (0, 4), (-1, 4), colors.lightgrey),
        ('BACKGROUND', (0, 5), (-1, 5), colors.whitesmoke),
        ('BACKGROUND', (0, 6), (-1, 6), colors.lightgrey),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        # NO GRID LINES to test background-only detection
    ]))
    
    story.append(table)
    doc.build(story)
    print(f'Generated: {output_path}')

if __name__ == '__main__':
    generate_zebra_table_pdf()
