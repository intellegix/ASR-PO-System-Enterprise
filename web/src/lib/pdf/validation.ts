/**
 * PDF Data Validation
 * Pre-flight validation and data sanitization for PDF generation
 */

import { POPDFData } from '@/lib/types/pdf';
import { PDF_CONFIG, PDF_DEFAULTS, PDFValidationError, PDFValidationResult, logPDFOperation } from './config';

/**
 * Comprehensive validation of PO data before PDF generation
 */
export function validatePOData(data: POPDFData): PDFValidationResult {
  const errors: PDFValidationError[] = [];
  const warnings: PDFValidationError[] = [];

  logPDFOperation({
    level: 'info',
    message: 'Starting PDF data validation',
    po_number: data.po_number,
    metadata: { hasLineItems: data.po_line_items?.length || 0 },
  });

  // Check required fields
  for (const field of PDF_CONFIG.validation.requiredFields) {
    if (!data[field]) {
      errors.push({
        field,
        message: `Required field '${field}' is missing or empty`,
        severity: 'error',
        value: data[field],
      });
    }
  }

  // Validate PO number
  if (data.po_number && data.po_number.length > 50) {
    errors.push({
      field: 'po_number',
      message: 'PO number is too long (max 50 characters)',
      severity: 'error',
      value: data.po_number,
    });
  }

  // Validate vendor information
  if (!data.vendors?.vendor_name) {
    warnings.push({
      field: 'vendor_name',
      message: 'Vendor name is missing',
      severity: 'warning',
    });
  } else if (data.vendors.vendor_name.length > PDF_CONFIG.validation.maxVendorNameLength) {
    warnings.push({
      field: 'vendor_name',
      message: `Vendor name is too long (max ${PDF_CONFIG.validation.maxVendorNameLength} characters)`,
      severity: 'warning',
      value: data.vendors.vendor_name.length,
    });
  }

  // Validate project information
  if (data.projects?.project_name &&
      data.projects.project_name.length > PDF_CONFIG.validation.maxProjectNameLength) {
    warnings.push({
      field: 'project_name',
      message: `Project name is too long (max ${PDF_CONFIG.validation.maxProjectNameLength} characters)`,
      severity: 'warning',
      value: data.projects.project_name.length,
    });
  }

  // Validate amounts
  const amounts = [
    { field: 'subtotal_amount', value: data.subtotal_amount },
    { field: 'tax_amount', value: data.tax_amount },
    { field: 'total_amount', value: data.total_amount },
  ];

  for (const { field, value } of amounts) {
    if (typeof value === 'string') {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        errors.push({
          field,
          message: `Invalid amount value: ${value}`,
          severity: 'error',
          value,
        });
      } else if (numValue < 0) {
        warnings.push({
          field,
          message: `Negative amount detected: ${value}`,
          severity: 'warning',
          value,
        });
      }
    } else if (typeof value === 'number') {
      if (value < 0) {
        warnings.push({
          field,
          message: `Negative amount detected: ${value}`,
          severity: 'warning',
          value,
        });
      }
    }
  }

  // Validate line items
  if (!data.po_line_items || data.po_line_items.length === 0) {
    errors.push({
      field: 'po_line_items',
      message: 'PO must have at least one line item',
      severity: 'error',
    });
  } else {
    // Check line items count limit
    if (data.po_line_items.length > PDF_CONFIG.validation.maxLineItems) {
      errors.push({
        field: 'po_line_items',
        message: `Too many line items (max ${PDF_CONFIG.validation.maxLineItems}, got ${data.po_line_items.length})`,
        severity: 'error',
        value: data.po_line_items.length,
      });
    }

    // Validate individual line items
    data.po_line_items.forEach((item, index) => {
      const linePrefix = `line_item_${index + 1}`;

      if (!item.item_description) {
        warnings.push({
          field: `${linePrefix}.item_description`,
          message: `Line item ${index + 1} is missing description`,
          severity: 'warning',
        });
      } else if (item.item_description.length > PDF_CONFIG.validation.maxDescriptionLength) {
        warnings.push({
          field: `${linePrefix}.item_description`,
          message: `Line item ${index + 1} description is too long (will be truncated)`,
          severity: 'warning',
          value: item.item_description.length,
        });
      }

      // Validate line amounts
      const lineAmount = typeof item.line_subtotal === 'string'
        ? parseFloat(item.line_subtotal)
        : item.line_subtotal;

      if (isNaN(lineAmount)) {
        errors.push({
          field: `${linePrefix}.line_subtotal`,
          message: `Line item ${index + 1} has invalid subtotal amount`,
          severity: 'error',
          value: item.line_subtotal,
        });
      } else if (lineAmount < 0) {
        warnings.push({
          field: `${linePrefix}.line_subtotal`,
          message: `Line item ${index + 1} has negative amount`,
          severity: 'warning',
          value: lineAmount,
        });
      }

      // Validate quantities
      const quantity = typeof item.quantity === 'string'
        ? parseFloat(item.quantity)
        : item.quantity;

      if (isNaN(quantity) || quantity <= 0) {
        warnings.push({
          field: `${linePrefix}.quantity`,
          message: `Line item ${index + 1} has invalid quantity`,
          severity: 'warning',
          value: item.quantity,
        });
      }
    });
  }

  // Validate notes length
  if (data.notes_vendor && data.notes_vendor.length > PDF_CONFIG.validation.maxNotesLength) {
    warnings.push({
      field: 'notes_vendor',
      message: `Vendor notes are too long (will be truncated at ${PDF_CONFIG.validation.maxNotesLength} characters)`,
      severity: 'warning',
      value: data.notes_vendor.length,
    });
  }

  // Validate dates
  const dateFields = [
    { field: 'created_at', value: data.created_at },
    { field: 'required_by_date', value: data.required_by_date },
    { field: 'approved_at', value: data.approved_at },
    { field: 'issued_at', value: data.issued_at },
  ];

  for (const { field, value } of dateFields) {
    if (value) {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        errors.push({
          field,
          message: `Invalid date format: ${value}`,
          severity: 'error',
          value,
        });
      }
    }
  }

  const isValid = errors.length === 0;

  logPDFOperation({
    level: isValid ? 'info' : 'warn',
    message: `PDF validation completed: ${isValid ? 'PASSED' : 'FAILED'}`,
    po_number: data.po_number,
    metadata: {
      errors: errors.length,
      warnings: warnings.length,
      errorFields: errors.map(e => e.field),
    },
  });

  return {
    isValid,
    errors,
    warnings,
  };
}

/**
 * Sanitize and normalize PO data with fallback values
 */
export function sanitizePOData(data: POPDFData): POPDFData {
  logPDFOperation({
    level: 'info',
    message: 'Sanitizing PDF data',
    po_number: data.po_number,
  });

  const sanitized: POPDFData = {
    ...data,

    // Ensure required strings exist
    po_number: data.po_number || 'DRAFT',
    status: data.status || PDF_DEFAULTS.status,

    // Sanitize vendor data
    vendors: data.vendors ? {
      ...data.vendors,
      vendor_name: data.vendors.vendor_name?.substring(0, PDF_CONFIG.validation.maxVendorNameLength) || PDF_DEFAULTS.vendor_name,
    } : {
      vendor_name: PDF_DEFAULTS.vendor_name,
      vendor_code: '',
      address_line1: null,
      address_line2: null,
      city: null,
      state: null,
      zip: null,
      contact_name: null,
      contact_phone: null,
      contact_email: null,
    },

    // Sanitize project data
    projects: data.projects ? {
      ...data.projects,
      project_name: data.projects.project_name?.substring(0, PDF_CONFIG.validation.maxProjectNameLength) || PDF_DEFAULTS.project_name,
    } : {
      project_code: '',
      project_name: PDF_DEFAULTS.project_name,
      property_address: null,
    },

    // Sanitize division data
    divisions: data.divisions || {
      division_name: PDF_DEFAULTS.division_name,
      division_code: '',
    },

    // Ensure amounts are valid numbers
    subtotal_amount: sanitizeAmount(data.subtotal_amount),
    tax_amount: sanitizeAmount(data.tax_amount),
    total_amount: sanitizeAmount(data.total_amount),
    tax_rate: sanitizeAmount(data.tax_rate),

    // Sanitize terms
    terms_code: data.terms_code || PDF_DEFAULTS.terms_code,

    // Truncate notes if too long
    notes_vendor: data.notes_vendor?.substring(0, PDF_CONFIG.validation.maxNotesLength) || null,

    // Filter and sanitize line items
    po_line_items: sanitizeLineItems(data.po_line_items || []),
  };

  return sanitized;
}

/**
 * Sanitize amount values
 */
function sanitizeAmount(amount: number | string | null | undefined): number {
  if (amount === null || amount === undefined) return 0;

  if (typeof amount === 'string') {
    const parsed = parseFloat(amount);
    return isNaN(parsed) ? 0 : Math.max(0, parsed); // Ensure non-negative
  }

  if (typeof amount === 'number') {
    return isNaN(amount) ? 0 : Math.max(0, amount); // Ensure non-negative
  }

  return 0;
}

/**
 * Sanitize line items array
 */
function sanitizeLineItems(items: any[]): any[] {
  if (!Array.isArray(items)) return [];

  return items
    .slice(0, PDF_CONFIG.validation.maxLineItems) // Limit count
    .filter(item => item && typeof item === 'object') // Remove invalid items
    .map((item, index) => ({
      line_number: item.line_number || index + 1,
      item_description: (item.item_description || `Line item ${index + 1}`)
        .substring(0, PDF_CONFIG.validation.maxDescriptionLength),
      quantity: sanitizeAmount(item.quantity) || 1,
      unit_of_measure: item.unit_of_measure || 'EA',
      unit_price: sanitizeAmount(item.unit_price),
      line_subtotal: sanitizeAmount(item.line_subtotal),
      is_taxable: Boolean(item.is_taxable),
    }));
}

/**
 * Generate validation report for logging
 */
export function generateValidationReport(result: PDFValidationResult): string {
  const { isValid, errors, warnings } = result;

  let report = `PDF Validation Report: ${isValid ? 'PASSED' : 'FAILED'}\n`;

  if (errors.length > 0) {
    report += `\nERRORS (${errors.length}):\n`;
    errors.forEach((error, i) => {
      report += `  ${i + 1}. ${error.field}: ${error.message}\n`;
    });
  }

  if (warnings.length > 0) {
    report += `\nWARNINGS (${warnings.length}):\n`;
    warnings.forEach((warning, i) => {
      report += `  ${i + 1}. ${warning.field}: ${warning.message}\n`;
    });
  }

  return report;
}