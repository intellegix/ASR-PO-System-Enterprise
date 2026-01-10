# Export Service Dependencies

## Required NPM Packages

To enable PDF and Excel export functionality, install these packages:

```bash
npm install puppeteer exceljs date-fns
npm install --save-dev @types/puppeteer
```

## Package Details

### Puppeteer (PDF Generation)
- **Package**: `puppeteer`
- **Purpose**: Headless Chrome browser for PDF generation from HTML
- **Version**: Latest stable
- **Note**: May require additional system dependencies in production

### ExcelJS (Excel Generation)
- **Package**: `exceljs`
- **Purpose**: Create and manipulate Excel spreadsheets
- **Version**: Latest stable
- **Features**: Advanced formatting, charts, formulas

### Date-fns (Date Formatting)
- **Package**: `date-fns`
- **Purpose**: Date formatting and manipulation utilities
- **Version**: Latest stable
- **Usage**: Report timestamp formatting

## Production Considerations

### Puppeteer in Production
For production deployment, ensure the environment supports Puppeteer:

```dockerfile
# For Docker deployments
RUN apt-get update && apt-get install -y \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils
```

### Memory Usage
- PDF generation requires additional memory allocation
- Excel exports are more memory efficient
- Consider implementing request queuing for high volumes

## Environment Variables

Add these optional environment variables:

```env
# PDF Export Settings
PDF_EXPORT_TIMEOUT=30000
PDF_EXPORT_MAX_CONCURRENT=3

# Excel Export Settings
EXCEL_EXPORT_MAX_ROWS=10000

# General Export Settings
EXPORT_TEMP_DIR=/tmp/exports
EXPORT_MAX_FILE_SIZE=50MB
```

## Usage Example

```typescript
import { ReportExportService } from '@/lib/reports/export-service';

// Export to PDF
const pdfResponse = await ReportExportService.exportToPDF({
  filename: 'gl-analysis-2024',
  title: 'GL Account Analysis',
  subtitle: 'Financial categorization and budget analysis',
  data: reportData,
  format: 'pdf',
  reportType: 'gl-analysis'
});

// Export to Excel
const excelResponse = await ReportExportService.exportToExcel({
  filename: 'vendor-analysis-2024',
  title: 'Vendor Performance Analysis',
  subtitle: 'Performance evaluation and risk assessment',
  data: reportData,
  format: 'excel',
  reportType: 'vendor-analysis'
});
```

## Security Considerations

1. **File Size Limits**: Implement maximum file size restrictions
2. **Rate Limiting**: Prevent abuse of export endpoints
3. **Authentication**: Ensure exports respect user permissions
4. **Temporary Files**: Clean up generated files after download
5. **Content Validation**: Sanitize data before export generation

## Performance Optimization

1. **Caching**: Cache frequently requested exports
2. **Background Processing**: Move large exports to background jobs
3. **Compression**: Enable gzip compression for downloads
4. **CDN**: Serve static assets (logos, CSS) from CDN
5. **Resource Limits**: Set memory and CPU limits for export processes

This export system provides enterprise-grade document generation with professional formatting and comprehensive data representation suitable for executive reporting and compliance requirements.