import os
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors

# Output directory
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'tests', 'fixtures')
os.makedirs(OUTPUT_DIR, exist_ok=True)

def generate_parallel_tables_pdf():
    output_path = os.path.join(OUTPUT_DIR, 'parallel-tables.pdf')
    doc = SimpleDocTemplate(output_path, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph('Parallel (Side-by-Side) Tables', styles['Heading1']))
    story.append(Spacer(1, 24))

    # Data for two tables
    data1 = [
        ['Left Col 1', 'Left Col 2'],
        ['Data L1', 'Data L2'],
        ['Data L3', 'Data L4'],
    ]
    
    data2 = [
        ['Right Col 1', 'Right Col 2'],
        ['Data R1', 'Data R2'],
        ['Data R3', 'Data R4'],
    ]

    # Create a container table to hold both tables side by side
    # This is a common way PDFs are structured
    t1 = Table(data1, colWidths=[100, 100])
    t1.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 1, colors.black),
        ('BACKGROUND', (0,0), (-1,0), colors.lightgrey)
    ]))
    
    t2 = Table(data2, colWidths=[100, 100])
    t2.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 1, colors.blue),
        ('BACKGROUND', (0,0), (-1,0), colors.lightblue)
    ]))

    # Main layout table (invisible)
    layout = Table([[t1, t2]], colWidths=[250, 250], hAlign='LEFT')
    
    story.append(layout)
    doc.build(story)
    print(f'Generated: {output_path}')

if __name__ == '__main__':
    generate_parallel_tables_pdf()
