/**
 * PDF Generation Configuration
 * Enterprise-grade configuration and validation for PDF generation
 */

// PDF generation configuration
export const PDF_CONFIG = {
  // Company information (configurable via environment)
  company: {
    name: process.env.COMPANY_NAME || 'All Surface Roofing & Waterproofing, Inc.',
    address1: process.env.COMPANY_ADDRESS1 || '1234 Construction Way',
    address2: process.env.COMPANY_ADDRESS2 || 'Los Angeles, CA 90001',
    phone: process.env.COMPANY_PHONE || '(555) 123-4567',
    email: process.env.COMPANY_EMAIL || 'purchasing@allsurfaceroofing.com',
  },

  // PDF styling configuration
  styling: {
    primaryColor: {
      r: 220,
      g: 90,
      b: 30, // Orange
    },
    pageMargin: 14,
    headerFontSize: 18,
    titleFontSize: 24,
    bodyFontSize: 9,
    lineHeight: 4,
  },

  // Validation limits
  validation: {
    maxLineItems: 100,
    maxDescriptionLength: 500,
    maxNotesLength: 2000,
    maxVendorNameLength: 200,
    maxProjectNameLength: 200,
    requiredFields: [
      'po_number',
      'total_amount',
      'po_line_items',
    ] as const,
  },

  // Error recovery options
  recovery: {
    fallbackToPlainText: true,
    skipInvalidLineItems: true,
    useDefaultValues: true,
    maxRetries: 3,
  },

  // Output options
  output: {
    defaultFormat: 'buffer' as const,
    compressionLevel: 1, // 0-9, 1 = fast compression
    pdfVersion: '1.4',
  },
} as const;

// Validation error types
export interface PDFValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  value?: unknown;
}

export interface PDFValidationResult {
  isValid: boolean;
  errors: PDFValidationError[];
  warnings: PDFValidationError[];
  processedData?: unknown;
}

// Environment variable validation
export function validatePDFConfig(): PDFValidationResult {
  const errors: PDFValidationError[] = [];
  const warnings: PDFValidationError[] = [];

  // Check for missing environment variables (warnings only)
  const envVars = [
    { key: 'COMPANY_NAME', value: process.env.COMPANY_NAME },
    { key: 'COMPANY_ADDRESS1', value: process.env.COMPANY_ADDRESS1 },
    { key: 'COMPANY_ADDRESS2', value: process.env.COMPANY_ADDRESS2 },
    { key: 'COMPANY_PHONE', value: process.env.COMPANY_PHONE },
    { key: 'COMPANY_EMAIL', value: process.env.COMPANY_EMAIL },
  ];

  for (const envVar of envVars) {
    if (!envVar.value) {
      warnings.push({
        field: envVar.key,
        message: `Environment variable ${envVar.key} not set, using default value`,
        severity: 'warning',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// Default values for missing data
export const PDF_DEFAULTS = {
  vendor_name: 'Unknown Vendor',
  project_name: 'Unknown Project',
  division_name: 'General',
  status: 'Draft',
  terms_code: 'Net 30',
  tax_rate: 0.08,
  subtotal_amount: 0,
  tax_amount: 0,
  total_amount: 0,
  notes_vendor: '',
  required_by_date: null,
  approved_at: null,
  issued_at: null,
} as const;

// Logging configuration
export interface PDFLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  po_id?: string;
  po_number?: string;
  error?: unknown;
  metadata?: Record<string, unknown>;
}

export function logPDFOperation(entry: Omit<PDFLogEntry, 'timestamp'>): void {
  const logEntry: PDFLogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };

  // In production, you might want to send to a logging service
  if (process.env.NODE_ENV === 'development') {
    console.log(`[PDF ${entry.level.toUpperCase()}]`, logEntry.message, logEntry.metadata || '');
  }

  // For production logging, consider integration with Winston or similar
  if (entry.level === 'error') {
    console.error('[PDF ERROR]', logEntry);
  }
}