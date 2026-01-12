#!/usr/bin/env python3
"""
Improved Premium PDF Generator for ASR Purchase Order System SOP
Fixes text wrapping and formatting issues

Author: Austin Kidwell
Company: ASR Inc
Date: January 12, 2026
"""

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether, PageTemplate, BaseDocTemplate, Frame, Preformatted
)
from reportlab.lib.colors import HexColor, black, white, grey
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas
from reportlab.lib import colors
import re
from datetime import datetime
import os
import textwrap

class ImprovedSOPPDFGenerator:
    def __init__(self, markdown_file, output_file):
        self.markdown_file = markdown_file
        self.output_file = output_file

        # ASR Brand Colors
        self.primary_color = HexColor('#1E3A8A')      # Navy Blue
        self.secondary_color = HexColor('#3B82F6')     # Blue
        self.accent_color = HexColor('#10B981')        # Green
        self.text_color = HexColor('#1F2937')          # Dark Gray
        self.light_gray = HexColor('#F9FAFB')          # Light Gray

        # Setup styles
        self.styles = self._create_styles()

        # Document elements
        self.story = []

        # Page width for text wrapping
        self.text_width = letter[0] - 144  # Account for margins

        # Load and parse markdown
        with open(markdown_file, 'r', encoding='utf-8') as f:
            self.content = f.read()

    def _create_styles(self):
        """Create custom styles for enterprise document"""
        styles = getSampleStyleSheet()

        # Document Title Style
        styles.add(ParagraphStyle(
            name='DocTitle',
            parent=styles['Title'],
            fontSize=24,
            spaceAfter=30,
            textColor=self.primary_color,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))

        # Subtitle Style
        styles.add(ParagraphStyle(
            name='DocSubtitle',
            parent=styles['Normal'],
            fontSize=16,
            spaceAfter=20,
            textColor=self.secondary_color,
            alignment=TA_CENTER,
            fontName='Helvetica'
        ))

        # Section Header Style
        styles.add(ParagraphStyle(
            name='SectionHead',
            parent=styles['Heading1'],
            fontSize=16,
            spaceBefore=20,
            spaceAfter=12,
            textColor=self.primary_color,
            fontName='Helvetica-Bold',
            keepWithNext=True
        ))

        # Subsection Header Style
        styles.add(ParagraphStyle(
            name='SubsectionHead',
            parent=styles['Heading2'],
            fontSize=13,
            spaceBefore=16,
            spaceAfter=8,
            textColor=self.secondary_color,
            fontName='Helvetica-Bold',
            keepWithNext=True
        ))

        # Body Text Style
        styles.add(ParagraphStyle(
            name='BodyParagraph',
            parent=styles['Normal'],
            fontSize=10,
            spaceBefore=6,
            spaceAfter=6,
            textColor=self.text_color,
            fontName='Helvetica',
            alignment=TA_JUSTIFY,
            leading=12
        ))

        # List Item Style
        styles.add(ParagraphStyle(
            name='BulletItem',
            parent=styles['Normal'],
            fontSize=10,
            spaceBefore=3,
            spaceAfter=3,
            textColor=self.text_color,
            fontName='Helvetica',
            leftIndent=20,
            bulletIndent=10,
            leading=12
        ))

        # Table Header Style
        styles.add(ParagraphStyle(
            name='TableHead',
            parent=styles['Normal'],
            fontSize=9,
            textColor=white,
            fontName='Helvetica-Bold',
            alignment=TA_CENTER,
            leading=11
        ))

        # Table Cell Style
        styles.add(ParagraphStyle(
            name='TableData',
            parent=styles['Normal'],
            fontSize=8,
            textColor=self.text_color,
            fontName='Helvetica',
            leading=10,
            alignment=TA_LEFT
        ))

        # Code Style
        styles.add(ParagraphStyle(
            name='CodeBlock',
            parent=styles['Normal'],
            fontSize=8,
            fontName='Courier',
            textColor=HexColor('#374151'),
            backColor=HexColor('#F3F4F6'),
            leftIndent=20,
            rightIndent=20,
            spaceBefore=6,
            spaceAfter=6,
            leading=10
        ))

        # Footer Style
        styles.add(ParagraphStyle(
            name='PageFooter',
            parent=styles['Normal'],
            fontSize=8,
            textColor=grey,
            alignment=TA_CENTER
        ))

        return styles

    def _create_header_footer(self, canvas, doc):
        """Create header and footer for each page"""
        width, height = letter

        # Header
        canvas.saveState()
        canvas.setFont('Helvetica-Bold', 10)
        canvas.setFillColor(self.primary_color)
        canvas.drawString(72, height - 50, "ASR Purchase Order System - Standard Operating Procedure")
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(grey)
        canvas.drawRightString(width - 72, height - 50, f"Document ID: ASR-SOP-PO-001 v1.0")

        # Header line
        canvas.setStrokeColor(self.primary_color)
        canvas.line(72, height - 60, width - 72, height - 60)

        # Footer
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(grey)
        canvas.drawString(72, 50, f"Generated: {datetime.now().strftime('%B %d, %Y')}")
        canvas.drawCentredString(width / 2, 50, f"Page {canvas.getPageNumber()}")
        canvas.drawRightString(width - 72, 50, "CONFIDENTIAL - Internal Use Only")

        # Footer line
        canvas.setStrokeColor(self.primary_color)
        canvas.line(72, 60, width - 72, 60)

        canvas.restoreState()

    def _wrap_text(self, text, max_chars=80):
        """Wrap text to prevent cut-off in tables"""
        if len(text) <= max_chars:
            return text

        # Use textwrap for better word wrapping
        wrapped = textwrap.fill(text, width=max_chars, break_long_words=False)
        return wrapped

    def _parse_markdown_to_story(self):
        """Parse markdown content and convert to ReportLab story elements"""
        lines = self.content.split('\n')
        i = 0

        while i < len(lines):
            line = lines[i].strip()

            # Skip empty lines
            if not line:
                i += 1
                continue

            # Document title (first # header)
            if line.startswith('# ') and 'ASR Purchase Order System' in line:
                self._add_title_page()
                i += 1
                continue

            # Section headers
            if line.startswith('## '):
                header_text = line[3:].strip()
                self.story.append(PageBreak())  # Start sections on new page
                self.story.append(Paragraph(header_text, self.styles['SectionHead']))
                self.story.append(Spacer(1, 12))
                i += 1
                continue

            # Subsection headers
            if line.startswith('### '):
                header_text = line[4:].strip()
                self.story.append(Paragraph(header_text, self.styles['SubsectionHead']))
                self.story.append(Spacer(1, 8))
                i += 1
                continue

            # Tables
            if '|' in line and '---' not in line and line.count('|') > 2:
                table_data, i = self._parse_table(lines, i)
                if table_data:
                    self._add_improved_table(table_data)
                continue

            # Lists
            if line.startswith('- ') or line.startswith('* ') or re.match(r'^\d+\.', line):
                list_items, i = self._parse_list(lines, i)
                self._add_list(list_items)
                continue

            # Code blocks
            if line.startswith('```'):
                code_content, i = self._parse_code_block(lines, i)
                self._add_code_block(code_content)
                continue

            # Regular paragraphs
            if line and not line.startswith('**') and not line.startswith('---'):
                # Handle bold, italic, and other formatting
                formatted_line = self._format_inline_text(line)
                self.story.append(Paragraph(formatted_line, self.styles['BodyParagraph']))
                self.story.append(Spacer(1, 4))

            i += 1

    def _add_title_page(self):
        """Create a professional title page"""
        # ASR Logo area (placeholder)
        self.story.append(Spacer(1, 100))

        # Main title
        self.story.append(Paragraph("ASR Purchase Order System", self.styles['DocTitle']))
        self.story.append(Paragraph("Standard Operating Procedure", self.styles['DocSubtitle']))

        self.story.append(Spacer(1, 50))

        # Document info box
        doc_info = [
            ['Document ID:', 'ASR-SOP-PO-001'],
            ['Version:', '1.0'],
            ['Effective Date:', 'January 12, 2026'],
            ['Document Owner:', 'Austin Kidwell, CEO'],
            ['Contact:', 'akidwell@asr-inc.us'],
            ['Classification:', 'Internal Use Only']
        ]

        doc_table = Table(doc_info, colWidths=[2*inch, 3*inch])
        doc_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), self.light_gray),
            ('TEXTCOLOR', (0, 0), (0, -1), self.primary_color),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('GRID', (0, 0), (-1, -1), 1, self.primary_color),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))

        self.story.append(doc_table)
        self.story.append(Spacer(1, 50))

        # Company info
        self.story.append(Paragraph("ASR Inc", self.styles['SubsectionHead']))
        self.story.append(Paragraph("Systems Integration & Construction Services", self.styles['BodyParagraph']))
        self.story.append(Paragraph("San Diego, California", self.styles['BodyParagraph']))

        self.story.append(PageBreak())

    def _parse_table(self, lines, start_index):
        """Parse markdown table into table data"""
        table_data = []
        i = start_index

        while i < len(lines) and '|' in lines[i]:
            line = lines[i].strip()
            if '---' in line:  # Skip separator line
                i += 1
                continue

            # Split by | and clean up
            cells = [cell.strip() for cell in line.split('|')[1:-1]]
            if cells and any(cell for cell in cells):  # Only add non-empty rows
                # Wrap long text in cells
                wrapped_cells = [self._wrap_text(cell, 40) for cell in cells]
                table_data.append(wrapped_cells)
            i += 1

        return table_data, i

    def _add_improved_table(self, table_data):
        """Add a formatted table with improved text wrapping"""
        if not table_data:
            return

        # Calculate column widths more intelligently
        num_cols = len(table_data[0])

        # Adjust column widths based on content
        if num_cols == 2:
            col_widths = [2.5*inch, 4*inch]  # Two column layout
        elif num_cols == 3:
            col_widths = [2*inch, 2*inch, 2.5*inch]  # Three column layout
        elif num_cols == 4:
            col_widths = [1.5*inch, 1.5*inch, 1.5*inch, 1.5*inch]  # Four column layout
        else:
            # Default equal widths
            col_width = (letter[0] - 144) / num_cols
            col_widths = [col_width] * num_cols

        # Convert data to Paragraphs for better text handling
        formatted_data = []
        for row_idx, row in enumerate(table_data):
            formatted_row = []
            for cell in row:
                if row_idx == 0:  # Header row
                    formatted_row.append(Paragraph(cell, self.styles['TableHead']))
                else:
                    formatted_row.append(Paragraph(cell, self.styles['TableData']))
            formatted_data.append(formatted_row)

        table = Table(formatted_data, colWidths=col_widths, repeatRows=1)

        # Style the table
        table_style = [
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), self.primary_color),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),

            # Data rows
            ('BACKGROUND', (0, 1), (-1, -1), white),
            ('TEXTCOLOR', (0, 1), (-1, -1), self.text_color),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),

            # Alternating row colors
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, self.light_gray]),

            # Grid and padding
            ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#E5E7EB')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]

        table.setStyle(TableStyle(table_style))

        # Wrap table in KeepTogether if it's small
        if len(table_data) <= 5:
            self.story.append(KeepTogether([table, Spacer(1, 12)]))
        else:
            self.story.append(table)
            self.story.append(Spacer(1, 12))

    def _parse_list(self, lines, start_index):
        """Parse markdown list into list items"""
        list_items = []
        i = start_index

        while i < len(lines):
            line = lines[i].strip()
            if not line:
                break
            if line.startswith('- ') or line.startswith('* '):
                item_text = line[2:].strip()
                # Wrap long list items
                wrapped_item = self._wrap_text(item_text, 100)
                list_items.append(wrapped_item)
            elif re.match(r'^\d+\.', line):
                item_text = re.sub(r'^\d+\.\s*', '', line)
                wrapped_item = self._wrap_text(item_text, 100)
                list_items.append(wrapped_item)
            else:
                break
            i += 1

        return list_items, i

    def _add_list(self, list_items):
        """Add formatted list to story"""
        for item in list_items:
            formatted_item = self._format_inline_text(f"• {item}")
            self.story.append(Paragraph(formatted_item, self.styles['BulletItem']))
        self.story.append(Spacer(1, 6))

    def _parse_code_block(self, lines, start_index):
        """Parse code block content"""
        code_lines = []
        i = start_index + 1  # Skip opening ```

        while i < len(lines) and not lines[i].strip().startswith('```'):
            # Wrap long code lines
            line = lines[i].rstrip()
            if len(line) > 80:
                wrapped_lines = textwrap.wrap(line, width=80, break_long_words=True)
                code_lines.extend(wrapped_lines)
            else:
                code_lines.append(line)
            i += 1

        return '\n'.join(code_lines), i + 1

    def _add_code_block(self, code_content):
        """Add formatted code block to story"""
        if code_content.strip():
            # Use Preformatted for better code handling
            self.story.append(Preformatted(code_content, self.styles['CodeBlock']))
            self.story.append(Spacer(1, 12))

    def _format_inline_text(self, text):
        """Format inline markdown (bold, italic, etc.)"""
        # Bold text
        text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
        # Italic text
        text = re.sub(r'\*(.*?)\*', r'<i>\1</i>', text)
        # Code spans
        text = re.sub(r'`(.*?)`', r'<font name="Courier">\1</font>', text)

        return text

    def generate_pdf(self):
        """Generate the improved PDF document"""
        print("Generating improved enterprise SOP PDF...")

        # Create the document with custom page template
        doc = BaseDocTemplate(
            self.output_file,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=100,
            bottomMargin=100
        )

        # Create frame for content
        frame = Frame(
            72, 100, letter[0] - 144, letter[1] - 200,
            leftPadding=0, bottomPadding=0, rightPadding=0, topPadding=0
        )

        # Create page template with header/footer
        template = PageTemplate(
            id='normal',
            frames=[frame],
            onPage=self._create_header_footer
        )

        doc.addPageTemplates([template])

        # Parse content and build story
        self._parse_markdown_to_story()

        # Build the PDF
        doc.build(self.story)
        print(f"Improved PDF generated successfully: {self.output_file}")

def main():
    """Main function to generate the improved PDF"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    markdown_file = os.path.join(script_dir, "ASR-PO-System-SOP-Enterprise.md")
    output_file = os.path.join(script_dir, "ASR-PO-System-SOP-Enterprise-FIXED.pdf")

    if not os.path.exists(markdown_file):
        print(f"Error: Markdown file not found: {markdown_file}")
        return

    generator = ImprovedSOPPDFGenerator(markdown_file, output_file)
    generator.generate_pdf()

    print(f"\nImproved enterprise SOP PDF created: {output_file}")
    print("Fixes applied:")
    print("- Proper text wrapping in tables")
    print("- Improved column width calculations")
    print("- Better handling of long text")
    print("- Enhanced table formatting")
    print("- Fixed cut-off word issues")
    print("- Optimized font sizes and spacing")

if __name__ == "__main__":
    main()