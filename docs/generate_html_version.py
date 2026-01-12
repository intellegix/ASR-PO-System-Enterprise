#!/usr/bin/env python3
"""
HTML Version Generator for ASR Purchase Order System SOP
Creates professional HTML version that can be easily converted to PDF

Author: Austin Kidwell
Company: ASR Inc
Date: January 12, 2026
"""

import re
import os
from datetime import datetime

class SOPHTMLGenerator:
    def __init__(self, markdown_file, output_file):
        self.markdown_file = markdown_file
        self.output_file = output_file

        # Load markdown content
        with open(markdown_file, 'r', encoding='utf-8') as f:
            self.content = f.read()

    def _create_css_styles(self):
        """Create professional CSS styles"""
        return """
        <style>
            @page {
                size: A4;
                margin: 1in;
                @top-center {
                    content: "ASR Purchase Order System - Standard Operating Procedure";
                    font-size: 10pt;
                    color: #1E3A8A;
                }
                @bottom-center {
                    content: "Page " counter(page);
                    font-size: 9pt;
                    color: #666;
                }
                @bottom-left {
                    content: "Generated: """ + datetime.now().strftime('%B %d, %Y') + """";
                    font-size: 8pt;
                    color: #666;
                }
                @bottom-right {
                    content: "CONFIDENTIAL - Internal Use Only";
                    font-size: 8pt;
                    color: #666;
                }
            }

            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #1F2937;
                max-width: 8.5in;
                margin: 0 auto;
                background: white;
            }

            .title-page {
                text-align: center;
                margin-top: 2in;
                page-break-after: always;
            }

            .doc-title {
                font-size: 28pt;
                color: #1E3A8A;
                font-weight: bold;
                margin-bottom: 20px;
            }

            .doc-subtitle {
                font-size: 18pt;
                color: #3B82F6;
                margin-bottom: 40px;
            }

            .doc-info-table {
                margin: 40px auto;
                border-collapse: collapse;
                background: #F9FAFB;
                border: 2px solid #1E3A8A;
            }

            .doc-info-table th {
                background: #1E3A8A;
                color: white;
                padding: 12px;
                text-align: left;
                font-weight: bold;
            }

            .doc-info-table td {
                padding: 10px 12px;
                border-bottom: 1px solid #E5E7EB;
            }

            .company-info {
                margin-top: 40px;
            }

            h1 {
                color: #1E3A8A;
                font-size: 18pt;
                margin-top: 30px;
                margin-bottom: 15px;
                border-bottom: 2px solid #1E3A8A;
                padding-bottom: 5px;
                page-break-before: always;
            }

            h2 {
                color: #3B82F6;
                font-size: 14pt;
                margin-top: 20px;
                margin-bottom: 10px;
                page-break-after: avoid;
            }

            h3 {
                color: #1E3A8A;
                font-size: 12pt;
                margin-top: 16px;
                margin-bottom: 8px;
                page-break-after: avoid;
            }

            p {
                margin: 8px 0;
                text-align: justify;
                line-height: 1.5;
            }

            table {
                width: 100%;
                border-collapse: collapse;
                margin: 15px 0;
                page-break-inside: avoid;
            }

            table th {
                background: #1E3A8A;
                color: white;
                padding: 8px 6px;
                text-align: left;
                font-weight: bold;
                font-size: 10pt;
                word-wrap: break-word;
            }

            table td {
                padding: 6px;
                border-bottom: 1px solid #E5E7EB;
                vertical-align: top;
                word-wrap: break-word;
                font-size: 9pt;
                line-height: 1.4;
            }

            table tr:nth-child(even) {
                background: #F9FAFB;
            }

            table tr:hover {
                background: #F3F4F6;
            }

            ul, ol {
                margin: 10px 0;
                padding-left: 25px;
            }

            li {
                margin: 4px 0;
                line-height: 1.5;
            }

            .code-block {
                background: #F3F4F6;
                border: 1px solid #E5E7EB;
                border-radius: 4px;
                padding: 12px;
                font-family: 'Courier New', monospace;
                font-size: 9pt;
                margin: 10px 0;
                overflow-x: auto;
                white-space: pre-wrap;
                word-wrap: break-word;
            }

            .highlight {
                background: #FEF3C7;
                padding: 2px 4px;
                border-radius: 2px;
            }

            .important {
                background: #FECACA;
                border-left: 4px solid #DC2626;
                padding: 10px 15px;
                margin: 10px 0;
            }

            .note {
                background: #DBEAFE;
                border-left: 4px solid #3B82F6;
                padding: 10px 15px;
                margin: 10px 0;
            }

            .toc {
                background: #F9FAFB;
                border: 1px solid #E5E7EB;
                padding: 20px;
                margin: 20px 0;
                page-break-inside: avoid;
            }

            .toc h2 {
                margin-top: 0;
                color: #1E3A8A;
            }

            .toc ol {
                margin: 0;
                padding-left: 20px;
            }

            .toc li {
                margin: 5px 0;
            }

            @media print {
                body { margin: 0; }
                .no-print { display: none; }
                h1 { page-break-before: always; }
                h2, h3 { page-break-after: avoid; }
                table { page-break-inside: avoid; }
                tr { page-break-inside: avoid; }
            }
        </style>
        """

    def _convert_markdown_to_html(self):
        """Convert markdown content to HTML"""
        html_content = self.content

        # Convert headers
        html_content = re.sub(r'^# (.+)$', r'<h1>\1</h1>', html_content, flags=re.MULTILINE)
        html_content = re.sub(r'^## (.+)$', r'<h2>\1</h2>', html_content, flags=re.MULTILINE)
        html_content = re.sub(r'^### (.+)$', r'<h3>\1</h3>', html_content, flags=re.MULTILINE)

        # Convert bold and italic
        html_content = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', html_content)
        html_content = re.sub(r'\*(.*?)\*', r'<em>\1</em>', html_content)

        # Convert code spans
        html_content = re.sub(r'`(.*?)`', r'<code>\1</code>', html_content)

        # Convert code blocks
        html_content = re.sub(
            r'```(.*?)\n(.*?)```',
            r'<div class="code-block">\2</div>',
            html_content,
            flags=re.DOTALL
        )

        # Convert tables
        html_content = self._convert_tables(html_content)

        # Convert lists
        html_content = self._convert_lists(html_content)

        # Convert paragraphs
        lines = html_content.split('\n')
        result_lines = []
        in_paragraph = False

        for line in lines:
            line = line.strip()
            if not line:
                if in_paragraph:
                    result_lines.append('</p>')
                    in_paragraph = False
                continue

            # Skip if it's already a tag
            if (line.startswith('<h') or line.startswith('</h') or
                line.startswith('<table') or line.startswith('</table') or
                line.startswith('<tr') or line.startswith('<td') or line.startswith('<th') or
                line.startswith('<ul') or line.startswith('</ul') or
                line.startswith('<ol') or line.startswith('</ol') or
                line.startswith('<li') or line.startswith('<div') or line.startswith('</div') or
                line.startswith('|') or '---' in line):
                if in_paragraph:
                    result_lines.append('</p>')
                    in_paragraph = False
                result_lines.append(line)
                continue

            # Regular text line
            if not in_paragraph:
                result_lines.append('<p>')
                in_paragraph = True
            result_lines.append(line)

        if in_paragraph:
            result_lines.append('</p>')

        return '\n'.join(result_lines)

    def _convert_tables(self, content):
        """Convert markdown tables to HTML"""
        lines = content.split('\n')
        result = []
        in_table = False

        for i, line in enumerate(lines):
            if '|' in line and not line.strip().startswith('```'):
                if not in_table:
                    result.append('<table>')
                    in_table = True

                # Skip separator lines
                if '---' in line:
                    continue

                # Process table row
                cells = [cell.strip() for cell in line.split('|')[1:-1]]
                if cells:
                    # First row is header
                    if in_table and not any('---' in prev_line for prev_line in lines[max(0, i-2):i]):
                        result.append('<tr>')
                        for cell in cells:
                            result.append(f'<th>{cell}</th>')
                        result.append('</tr>')
                    else:
                        result.append('<tr>')
                        for cell in cells:
                            result.append(f'<td>{cell}</td>')
                        result.append('</tr>')
            else:
                if in_table:
                    result.append('</table>')
                    in_table = False
                result.append(line)

        if in_table:
            result.append('</table>')

        return '\n'.join(result)

    def _convert_lists(self, content):
        """Convert markdown lists to HTML"""
        lines = content.split('\n')
        result = []
        in_list = False

        for line in lines:
            if re.match(r'^\s*[*-]\s+', line):
                if not in_list:
                    result.append('<ul>')
                    in_list = True
                item_text = re.sub(r'^\s*[*-]\s+', '', line)
                result.append(f'<li>{item_text}</li>')
            elif re.match(r'^\s*\d+\.\s+', line):
                if not in_list:
                    result.append('<ol>')
                    in_list = True
                item_text = re.sub(r'^\s*\d+\.\s+', '', line)
                result.append(f'<li>{item_text}</li>')
            else:
                if in_list:
                    result.append('</ul>' if any(re.match(r'^\s*[*-]\s+', prev_line) for prev_line in lines[max(0, len(result)-10):]) else '</ol>')
                    in_list = False
                result.append(line)

        return '\n'.join(result)

    def _create_title_page_html(self):
        """Create HTML title page"""
        return '''
        <div class="title-page">
            <div class="doc-title">ASR Purchase Order System</div>
            <div class="doc-subtitle">Standard Operating Procedure</div>

            <table class="doc-info-table">
                <tr><td><strong>Document ID:</strong></td><td>ASR-SOP-PO-001</td></tr>
                <tr><td><strong>Version:</strong></td><td>1.0</td></tr>
                <tr><td><strong>Effective Date:</strong></td><td>January 12, 2026</td></tr>
                <tr><td><strong>Document Owner:</strong></td><td>Austin Kidwell, CEO</td></tr>
                <tr><td><strong>Contact:</strong></td><td>akidwell@asr-inc.us</td></tr>
                <tr><td><strong>Classification:</strong></td><td>Internal Use Only</td></tr>
            </table>

            <div class="company-info">
                <h3>ASR Inc</h3>
                <p>Systems Integration & Construction Services</p>
                <p>San Diego, California</p>
            </div>
        </div>
        '''

    def generate_html(self):
        """Generate HTML version of the SOP"""
        print("Generating professional HTML version...")

        # Convert markdown to HTML
        html_body = self._convert_markdown_to_html()

        # Create complete HTML document
        html_document = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ASR Purchase Order System - Standard Operating Procedure</title>
    {self._create_css_styles()}
</head>
<body>
    {self._create_title_page_html()}
    {html_body}
</body>
</html>"""

        # Write to file
        with open(self.output_file, 'w', encoding='utf-8') as f:
            f.write(html_document)

        print(f"Professional HTML generated: {self.output_file}")

def main():
    """Main function"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    markdown_file = os.path.join(script_dir, "ASR-PO-System-SOP-Enterprise.md")
    output_file = os.path.join(script_dir, "ASR-PO-System-SOP-Enterprise.html")

    if not os.path.exists(markdown_file):
        print(f"Error: Markdown file not found: {markdown_file}")
        return

    generator = SOPHTMLGenerator(markdown_file, output_file)
    generator.generate_html()

    print(f"\nHTML version created: {output_file}")
    print("\nTo convert to PDF:")
    print("1. Open the HTML file in Chrome/Edge")
    print("2. Press Ctrl+P to print")
    print("3. Select 'Save as PDF'")
    print("4. Choose 'More settings' and select appropriate margins")
    print("5. This will give you perfect formatting with no cut-off text")

if __name__ == "__main__":
    main()