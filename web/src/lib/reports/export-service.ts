import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';

interface ExportOptions {
  filename: string;
  title: string;
  subtitle?: string;
  data: any;
  format: 'pdf' | 'excel' | 'csv';
  reportType: 'gl-analysis' | 'vendor-analysis' | 'budget-vs-actual' | 'approval-bottleneck' | 'project-details' | 'po-summary';
}

interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
  style?: any;
}

export class ReportExportService {
  private static getCompanyLogo(): string {
    return `data:image/svg+xml;base64,${Buffer.from(`
      <svg width="120" height="40" viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="40" fill="#ea580c"/>
        <text x="10" y="25" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="white">ASR Inc</text>
      </svg>
    `).toString('base64')}`;
  }

  private static generateHTMLTemplate(options: ExportOptions): string {
    const { title, subtitle, data, reportType } = options;
    const currentDate = format(new Date(), 'MMMM dd, yyyy');

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            border-bottom: 2px solid #ea580c;
            padding-bottom: 20px;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .logo {
            height: 40px;
          }
          .report-info {
            text-align: right;
          }
          .report-title {
            font-size: 24px;
            font-weight: bold;
            color: #1e293b;
            margin: 0;
          }
          .report-subtitle {
            font-size: 14px;
            color: #64748b;
            margin: 5px 0 0 0;
          }
          .generated-date {
            font-size: 12px;
            color: #64748b;
            margin-top: 5px;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
          }
          .summary-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
          }
          .summary-label {
            font-size: 12px;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 500;
            margin-bottom: 5px;
          }
          .summary-value {
            font-size: 20px;
            font-weight: bold;
            color: #1e293b;
          }
          .summary-meta {
            font-size: 11px;
            color: #64748b;
            margin-top: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            font-size: 12px;
          }
          th, td {
            border: 1px solid #e2e8f0;
            padding: 8px 12px;
            text-align: left;
          }
          th {
            background-color: #f1f5f9;
            font-weight: 600;
            color: #374151;
          }
          tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #1e293b;
            margin: 30px 0 15px 0;
            padding-bottom: 5px;
            border-bottom: 1px solid #e2e8f0;
          }
          .currency {
            text-align: right;
          }
          .positive {
            color: #059669;
          }
          .negative {
            color: #dc2626;
          }
          .warning {
            color: #d97706;
          }
          .footer {
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
            margin-top: 40px;
            font-size: 11px;
            color: #64748b;
            text-align: center;
          }
          @media print {
            body {
              margin: 0;
              padding: 10px;
            }
            .summary-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${this.getCompanyLogo()}" alt="ASR Inc" class="logo" />
          <div class="report-info">
            <h1 class="report-title">${title}</h1>
            ${subtitle ? `<p class="report-subtitle">${subtitle}</p>` : ''}
            <p class="generated-date">Generated on ${currentDate}</p>
          </div>
        </div>

        ${this.generateReportContent(data, reportType)}

        <div class="footer">
          <p>© ${new Date().getFullYear()} ASR Inc. All rights reserved. | Generated by ASR Purchase Order System</p>
        </div>
      </body>
      </html>
    `;
  }

  private static generateReportContent(data: any, reportType: string): string {
    switch (reportType) {
      case 'gl-analysis':
        return this.generateGLAnalysisHTML(data);
      case 'vendor-analysis':
        return this.generateVendorAnalysisHTML(data);
      case 'budget-vs-actual':
        return this.generateBudgetAnalysisHTML(data);
      case 'approval-bottleneck':
        return this.generateApprovalBottleneckHTML(data);
      case 'project-details':
        return this.generateProjectDetailsHTML(data);
      case 'po-summary':
        return this.generatePOSummaryHTML(data);
      default:
        return '<p>Report content not available</p>';
    }
  }

  private static generateGLAnalysisHTML(data: any): string {
    return `
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-label">Total Spend</div>
          <div class="summary-value">${this.formatCurrency(data.totalSpend)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">COGS Amount</div>
          <div class="summary-value">${this.formatCurrency(data.cogsAmount)}</div>
          <div class="summary-meta">${((data.cogsAmount / data.totalSpend) * 100).toFixed(1)}% of total</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">OpEx Amount</div>
          <div class="summary-value">${this.formatCurrency(data.opexAmount)}</div>
          <div class="summary-meta">${((data.opexAmount / data.totalSpend) * 100).toFixed(1)}% of total</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Taxable Amount</div>
          <div class="summary-value">${this.formatCurrency(data.taxableAmount)}</div>
          <div class="summary-meta">${((data.taxableAmount / data.totalSpend) * 100).toFixed(1)}% of total</div>
        </div>
      </div>

      <h2 class="section-title">GL Category Breakdown</h2>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Amount</th>
            <th>Percentage</th>
            <th>Account Count</th>
          </tr>
        </thead>
        <tbody>
          ${data.categories.map((cat: any) => `
            <tr>
              <td>${cat.category}</td>
              <td class="currency">${this.formatCurrency(cat.amount)}</td>
              <td>${cat.percentage.toFixed(1)}%</td>
              <td>${cat.accountCount}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <h2 class="section-title">Division Breakdown</h2>
      <table>
        <thead>
          <tr>
            <th>Division</th>
            <th>Total Spend</th>
            <th>COGS</th>
            <th>OpEx</th>
            <th>Top GL Account</th>
          </tr>
        </thead>
        <tbody>
          ${data.divisionBreakdown.map((div: any) => `
            <tr>
              <td>${div.divisionName}</td>
              <td class="currency">${this.formatCurrency(div.totalSpend)}</td>
              <td class="currency">${this.formatCurrency(div.cogsAmount)}</td>
              <td class="currency">${this.formatCurrency(div.opexAmount)}</td>
              <td>${div.topGLAccounts[0]?.accountNumber || 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  private static generateVendorAnalysisHTML(data: any): string {
    return `
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-label">Total Vendors</div>
          <div class="summary-value">${data.summary.totalVendors}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Total Spend</div>
          <div class="summary-value">${this.formatCurrency(data.summary.totalSpend)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Avg Quality Score</div>
          <div class="summary-value">${data.summary.averageQualityScore}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Top Performers</div>
          <div class="summary-value">${data.summary.topPerformers}</div>
          <div class="summary-meta">Score 85+</div>
        </div>
      </div>

      <h2 class="section-title">Vendor Performance Rankings</h2>
      <table>
        <thead>
          <tr>
            <th>Vendor</th>
            <th>Total Spend</th>
            <th>Orders</th>
            <th>Quality Score</th>
            <th>On-Time Delivery</th>
            <th>Payment Terms</th>
          </tr>
        </thead>
        <tbody>
          ${data.vendors.slice(0, 15).map((vendor: any) => `
            <tr>
              <td>
                ${vendor.vendorName}<br>
                <small style="color: #64748b;">${vendor.industryType}</small>
              </td>
              <td class="currency">${this.formatCurrency(vendor.totalSpend)}</td>
              <td>${vendor.totalOrders}</td>
              <td class="${vendor.qualityScore >= 85 ? 'positive' : vendor.qualityScore >= 70 ? 'warning' : 'negative'}">
                ${vendor.qualityScore}
              </td>
              <td>${vendor.onTimeDeliveryRate.toFixed(1)}%</td>
              <td>${vendor.paymentTerms}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  private static generateBudgetAnalysisHTML(data: any): string {
    return `
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-label">Total Budget</div>
          <div class="summary-value">${this.formatCurrency(data.summary.totalBudget)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Actual Spend</div>
          <div class="summary-value">${this.formatCurrency(data.summary.totalActual)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Total Variance</div>
          <div class="summary-value ${data.summary.totalVariance > 0 ? 'negative' : 'positive'}">
            ${this.formatCurrency(Math.abs(data.summary.totalVariance))}
          </div>
          <div class="summary-meta">${data.summary.totalVariance > 0 ? 'Over budget' : 'Under budget'}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Avg CPI</div>
          <div class="summary-value ${data.summary.averageCPI >= 1.0 ? 'positive' : 'negative'}">
            ${data.summary.averageCPI.toFixed(2)}
          </div>
        </div>
      </div>

      <h2 class="section-title">Project Budget Analysis</h2>
      <table>
        <thead>
          <tr>
            <th>Project</th>
            <th>Budget</th>
            <th>Actual</th>
            <th>Variance</th>
            <th>CPI</th>
            <th>Progress</th>
          </tr>
        </thead>
        <tbody>
          ${data.projects.slice(0, 15).map((project: any) => `
            <tr>
              <td>
                ${project.projectName}<br>
                <small style="color: #64748b;">${project.divisionName}</small>
              </td>
              <td class="currency">${this.formatCurrency(project.revisedBudget)}</td>
              <td class="currency">${this.formatCurrency(project.actualSpend)}</td>
              <td class="currency ${project.varianceAmount > 0 ? 'negative' : 'positive'}">
                ${this.formatCurrency(Math.abs(project.varianceAmount))}
              </td>
              <td class="${project.costPerformanceIndex >= 1.0 ? 'positive' : 'negative'}">
                ${project.costPerformanceIndex.toFixed(2)}
              </td>
              <td>${project.timeline.percentComplete.toFixed(1)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  private static generateApprovalBottleneckHTML(data: any): string {
    return `
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-label">Total Bottlenecks</div>
          <div class="summary-value negative">${data.summary.totalBottlenecks}</div>
          <div class="summary-meta">${data.summary.criticalBottlenecks} critical</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Avg Approval Time</div>
          <div class="summary-value">${this.formatDays(data.summary.averageApprovalTime)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">POs Over 48hrs</div>
          <div class="summary-value warning">${data.summary.posOver48Hours}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Value Stuck</div>
          <div class="summary-value">${this.formatCurrency(data.summary.totalValueStuck)}</div>
        </div>
      </div>

      <h2 class="section-title">Current Approval Bottlenecks</h2>
      <table>
        <thead>
          <tr>
            <th>PO Number</th>
            <th>Vendor</th>
            <th>Amount</th>
            <th>Days Pending</th>
            <th>Approver</th>
            <th>Stage</th>
          </tr>
        </thead>
        <tbody>
          ${data.bottlenecks.slice(0, 15).map((bottleneck: any) => `
            <tr>
              <td>${bottleneck.poNumber}</td>
              <td>${bottleneck.vendorName}</td>
              <td class="currency">${this.formatCurrency(bottleneck.totalAmount)}</td>
              <td class="${bottleneck.totalDaysPending > 7 ? 'negative' : bottleneck.totalDaysPending > 2 ? 'warning' : ''}">
                ${this.formatDays(bottleneck.totalDaysPending)}
              </td>
              <td>${bottleneck.approverName}</td>
              <td>${bottleneck.currentStage}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  private static generateProjectDetailsHTML(data: any): string {
    return `
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-label">Project</div>
          <div class="summary-value" style="font-size: 16px;">${data.projectInfo.projectName}</div>
          <div class="summary-meta">PM: ${data.projectInfo.projectManager}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Total Budget</div>
          <div class="summary-value">${this.formatCurrency(data.projectInfo.totalBudget)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Actual Spend</div>
          <div class="summary-value">${this.formatCurrency(data.projectInfo.actualSpend)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Progress</div>
          <div class="summary-value">${data.projectInfo.timeline.percentComplete.toFixed(1)}%</div>
        </div>
      </div>

      <h2 class="section-title">Division Spending</h2>
      <table>
        <thead>
          <tr>
            <th>Division</th>
            <th>Budget Allocated</th>
            <th>Total Spend</th>
            <th>Variance</th>
            <th>POs</th>
          </tr>
        </thead>
        <tbody>
          ${data.divisionSpending.map((div: any) => `
            <tr>
              <td>${div.divisionName}</td>
              <td class="currency">${this.formatCurrency(div.budgetAllocated)}</td>
              <td class="currency">${this.formatCurrency(div.totalSpend)}</td>
              <td class="currency ${div.varianceAmount > 0 ? 'negative' : 'positive'}">
                ${this.formatCurrency(Math.abs(div.varianceAmount))}
              </td>
              <td>${div.poCount}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  private static generatePOSummaryHTML(data: any): string {
    return `
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-label">Total POs</div>
          <div class="summary-value">${data.summary.totalPOs}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Total Value</div>
          <div class="summary-value">${this.formatCurrency(data.summary.totalValue)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Avg PO Value</div>
          <div class="summary-value">${this.formatCurrency(data.summary.averageValue)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Completion Rate</div>
          <div class="summary-value">${data.summary.completionRate.toFixed(1)}%</div>
        </div>
      </div>

      <h2 class="section-title">PO Summary by Division</h2>
      <table>
        <thead>
          <tr>
            <th>Division</th>
            <th>PO Count</th>
            <th>Total Value</th>
            <th>Avg Value</th>
            <th>Completion Rate</th>
          </tr>
        </thead>
        <tbody>
          ${data.divisionData?.map((div: any) => `
            <tr>
              <td>${div.divisionName}</td>
              <td>${div.poCount}</td>
              <td class="currency">${this.formatCurrency(div.totalValue)}</td>
              <td class="currency">${this.formatCurrency(div.averageValue)}</td>
              <td>${div.completionRate.toFixed(1)}%</td>
            </tr>
          `).join('') || ''}
        </tbody>
      </table>
    `;
  }

  private static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  private static formatDays(days: number): string {
    if (days < 1) return `${(days * 24).toFixed(1)}h`;
    if (days === 1) return '1 day';
    return `${Math.floor(days)} days`;
  }

  static async exportToPDF(options: ExportOptions): Promise<NextResponse> {
    try {
      const html = this.generateHTMLTemplate(options);

      const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true,
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in',
        },
        printBackground: true,
        displayHeaderFooter: false,
      });

      await browser.close();

      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${options.filename}.pdf"`,
          'Content-Length': pdfBuffer.length.toString(),
        },
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      throw new Error('Failed to generate PDF export');
    }
  }

  static async exportToExcel(options: ExportOptions): Promise<NextResponse> {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'ASR Purchase Order System';
      workbook.created = new Date();

      // Company branding
      const worksheet = workbook.addWorksheet(options.title);

      // Add header
      worksheet.mergeCells('A1:F1');
      worksheet.getCell('A1').value = `${options.title} - ${options.subtitle || ''}`;
      worksheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FF1e293b' } };
      worksheet.getCell('A1').alignment = { horizontal: 'center' };

      worksheet.mergeCells('A2:F2');
      worksheet.getCell('A2').value = `Generated on ${format(new Date(), 'MMMM dd, yyyy')}`;
      worksheet.getCell('A2').font = { size: 12, color: { argb: 'FF64748b' } };
      worksheet.getCell('A2').alignment = { horizontal: 'center' };

      // Add report-specific data
      this.addExcelData(worksheet, options.data, options.reportType);

      // Style the worksheet
      this.styleExcelWorksheet(worksheet);

      const buffer = await workbook.xlsx.writeBuffer();

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${options.filename}.xlsx"`,
          'Content-Length': buffer.byteLength.toString(),
        },
      });
    } catch (error) {
      console.error('Excel export failed:', error);
      throw new Error('Failed to generate Excel export');
    }
  }

  private static addExcelData(worksheet: ExcelJS.Worksheet, data: any, reportType: string): void {
    let currentRow = 4; // Start after header

    switch (reportType) {
      case 'gl-analysis':
        currentRow = this.addGLAnalysisExcelData(worksheet, data, currentRow);
        break;
      case 'vendor-analysis':
        currentRow = this.addVendorAnalysisExcelData(worksheet, data, currentRow);
        break;
      case 'budget-vs-actual':
        currentRow = this.addBudgetAnalysisExcelData(worksheet, data, currentRow);
        break;
      case 'approval-bottleneck':
        currentRow = this.addApprovalBottleneckExcelData(worksheet, data, currentRow);
        break;
      case 'project-details':
        currentRow = this.addProjectDetailsExcelData(worksheet, data, currentRow);
        break;
      case 'po-summary':
        currentRow = this.addPOSummaryExcelData(worksheet, data, currentRow);
        break;
    }
  }

  private static addGLAnalysisExcelData(worksheet: ExcelJS.Worksheet, data: any, startRow: number): number {
    let currentRow = startRow;

    // Summary section
    worksheet.getCell(`A${currentRow}`).value = 'Financial Summary';
    worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 14 };
    currentRow += 2;

    const summaryData = [
      ['Total Spend', this.formatCurrency(data.totalSpend)],
      ['COGS Amount', this.formatCurrency(data.cogsAmount)],
      ['OpEx Amount', this.formatCurrency(data.opexAmount)],
      ['Taxable Amount', this.formatCurrency(data.taxableAmount)],
    ];

    summaryData.forEach(([label, value]) => {
      worksheet.getCell(`A${currentRow}`).value = label;
      worksheet.getCell(`B${currentRow}`).value = value;
      currentRow++;
    });

    currentRow += 2;

    // Categories table
    worksheet.getCell(`A${currentRow}`).value = 'GL Category Breakdown';
    worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 14 };
    currentRow += 2;

    const categoryHeaders = ['Category', 'Amount', 'Percentage', 'Account Count'];
    categoryHeaders.forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFf1f5f9' } };
    });
    currentRow++;

    data.categories.forEach((category: any) => {
      worksheet.getCell(`A${currentRow}`).value = category.category;
      worksheet.getCell(`B${currentRow}`).value = category.amount;
      worksheet.getCell(`B${currentRow}`).numFmt = '"$"#,##0.00';
      worksheet.getCell(`C${currentRow}`).value = category.percentage / 100;
      worksheet.getCell(`C${currentRow}`).numFmt = '0.0%';
      worksheet.getCell(`D${currentRow}`).value = category.accountCount;
      currentRow++;
    });

    return currentRow;
  }

  private static addVendorAnalysisExcelData(worksheet: ExcelJS.Worksheet, data: any, startRow: number): number {
    let currentRow = startRow;

    // Vendor performance table
    worksheet.getCell(`A${currentRow}`).value = 'Vendor Performance Rankings';
    worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 14 };
    currentRow += 2;

    const headers = ['Vendor Name', 'Industry', 'Total Spend', 'Orders', 'Quality Score', 'On-Time Delivery %', 'Payment Terms'];
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFf1f5f9' } };
    });
    currentRow++;

    data.vendors.forEach((vendor: any) => {
      worksheet.getCell(`A${currentRow}`).value = vendor.vendorName;
      worksheet.getCell(`B${currentRow}`).value = vendor.industryType;
      worksheet.getCell(`C${currentRow}`).value = vendor.totalSpend;
      worksheet.getCell(`C${currentRow}`).numFmt = '"$"#,##0.00';
      worksheet.getCell(`D${currentRow}`).value = vendor.totalOrders;
      worksheet.getCell(`E${currentRow}`).value = vendor.qualityScore;
      worksheet.getCell(`F${currentRow}`).value = vendor.onTimeDeliveryRate / 100;
      worksheet.getCell(`F${currentRow}`).numFmt = '0.0%';
      worksheet.getCell(`G${currentRow}`).value = vendor.paymentTerms;
      currentRow++;
    });

    return currentRow;
  }

  private static addBudgetAnalysisExcelData(worksheet: ExcelJS.Worksheet, data: any, startRow: number): number {
    let currentRow = startRow;

    // Project budget table
    worksheet.getCell(`A${currentRow}`).value = 'Project Budget Analysis';
    worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 14 };
    currentRow += 2;

    const headers = ['Project Name', 'Division', 'Budget', 'Actual Spend', 'Variance', 'CPI', 'SPI', 'Progress %'];
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFf1f5f9' } };
    });
    currentRow++;

    data.projects.forEach((project: any) => {
      worksheet.getCell(`A${currentRow}`).value = project.projectName;
      worksheet.getCell(`B${currentRow}`).value = project.divisionName;
      worksheet.getCell(`C${currentRow}`).value = project.revisedBudget;
      worksheet.getCell(`C${currentRow}`).numFmt = '"$"#,##0.00';
      worksheet.getCell(`D${currentRow}`).value = project.actualSpend;
      worksheet.getCell(`D${currentRow}`).numFmt = '"$"#,##0.00';
      worksheet.getCell(`E${currentRow}`).value = project.varianceAmount;
      worksheet.getCell(`E${currentRow}`).numFmt = '"$"#,##0.00';
      worksheet.getCell(`F${currentRow}`).value = project.costPerformanceIndex;
      worksheet.getCell(`F${currentRow}`).numFmt = '0.00';
      worksheet.getCell(`G${currentRow}`).value = project.schedulePerformanceIndex;
      worksheet.getCell(`G${currentRow}`).numFmt = '0.00';
      worksheet.getCell(`H${currentRow}`).value = project.timeline.percentComplete / 100;
      worksheet.getCell(`H${currentRow}`).numFmt = '0.0%';
      currentRow++;
    });

    return currentRow;
  }

  private static addApprovalBottleneckExcelData(worksheet: ExcelJS.Worksheet, data: any, startRow: number): number {
    let currentRow = startRow;

    // Bottlenecks table
    worksheet.getCell(`A${currentRow}`).value = 'Current Approval Bottlenecks';
    worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 14 };
    currentRow += 2;

    const headers = ['PO Number', 'Vendor', 'Amount', 'Days Pending', 'Current Stage', 'Approver', 'Priority'];
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFf1f5f9' } };
    });
    currentRow++;

    data.bottlenecks.forEach((bottleneck: any) => {
      worksheet.getCell(`A${currentRow}`).value = bottleneck.poNumber;
      worksheet.getCell(`B${currentRow}`).value = bottleneck.vendorName;
      worksheet.getCell(`C${currentRow}`).value = bottleneck.totalAmount;
      worksheet.getCell(`C${currentRow}`).numFmt = '"$"#,##0.00';
      worksheet.getCell(`D${currentRow}`).value = bottleneck.totalDaysPending;
      worksheet.getCell(`E${currentRow}`).value = bottleneck.currentStage;
      worksheet.getCell(`F${currentRow}`).value = bottleneck.approverName;
      worksheet.getCell(`G${currentRow}`).value = bottleneck.priority;
      currentRow++;
    });

    return currentRow;
  }

  private static addProjectDetailsExcelData(worksheet: ExcelJS.Worksheet, data: any, startRow: number): number {
    let currentRow = startRow;

    // Project info
    worksheet.getCell(`A${currentRow}`).value = 'Project Information';
    worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 14 };
    currentRow += 2;

    const projectInfo = [
      ['Project Name', data.projectInfo.projectName],
      ['Project Manager', data.projectInfo.projectManager],
      ['Status', data.projectInfo.status],
      ['Total Budget', this.formatCurrency(data.projectInfo.totalBudget)],
      ['Actual Spend', this.formatCurrency(data.projectInfo.actualSpend)],
      ['Progress', `${data.projectInfo.timeline.percentComplete.toFixed(1)}%`],
    ];

    projectInfo.forEach(([label, value]) => {
      worksheet.getCell(`A${currentRow}`).value = label;
      worksheet.getCell(`B${currentRow}`).value = value;
      currentRow++;
    });

    currentRow += 2;

    // Division spending
    worksheet.getCell(`A${currentRow}`).value = 'Division Spending';
    worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 14 };
    currentRow += 2;

    const divHeaders = ['Division', 'Budget Allocated', 'Total Spend', 'Variance', 'PO Count'];
    divHeaders.forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFf1f5f9' } };
    });
    currentRow++;

    data.divisionSpending.forEach((div: any) => {
      worksheet.getCell(`A${currentRow}`).value = div.divisionName;
      worksheet.getCell(`B${currentRow}`).value = div.budgetAllocated;
      worksheet.getCell(`B${currentRow}`).numFmt = '"$"#,##0.00';
      worksheet.getCell(`C${currentRow}`).value = div.totalSpend;
      worksheet.getCell(`C${currentRow}`).numFmt = '"$"#,##0.00';
      worksheet.getCell(`D${currentRow}`).value = div.varianceAmount;
      worksheet.getCell(`D${currentRow}`).numFmt = '"$"#,##0.00';
      worksheet.getCell(`E${currentRow}`).value = div.poCount;
      currentRow++;
    });

    return currentRow;
  }

  private static addPOSummaryExcelData(worksheet: ExcelJS.Worksheet, data: any, startRow: number): number {
    let currentRow = startRow;

    // PO summary table
    worksheet.getCell(`A${currentRow}`).value = 'PO Summary by Division';
    worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 14 };
    currentRow += 2;

    const headers = ['Division', 'PO Count', 'Total Value', 'Average Value', 'Completion Rate'];
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFf1f5f9' } };
    });
    currentRow++;

    data.divisionData?.forEach((div: any) => {
      worksheet.getCell(`A${currentRow}`).value = div.divisionName;
      worksheet.getCell(`B${currentRow}`).value = div.poCount;
      worksheet.getCell(`C${currentRow}`).value = div.totalValue;
      worksheet.getCell(`C${currentRow}`).numFmt = '"$"#,##0.00';
      worksheet.getCell(`D${currentRow}`).value = div.averageValue;
      worksheet.getCell(`D${currentRow}`).numFmt = '"$"#,##0.00';
      worksheet.getCell(`E${currentRow}`).value = div.completionRate / 100;
      worksheet.getCell(`E${currentRow}`).numFmt = '0.0%';
      currentRow++;
    });

    return currentRow;
  }

  private static styleExcelWorksheet(worksheet: ExcelJS.Worksheet): void {
    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      if (column.values) {
        const lengths = column.values.map(v => v ? v.toString().length : 0);
        const maxLength = Math.max(...lengths.filter(v => typeof v === 'number'));
        column.width = Math.min(maxLength + 2, 50);
      }
    });

    // Add borders to all used cells
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });
  }
}