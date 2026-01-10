/**
 * PDF Generation Error Handler
 * Comprehensive error handling and recovery for PDF operations
 */

import { jsPDF } from 'jspdf';
import { POPDFData } from '@/lib/types/pdf';
import { PDF_CONFIG, logPDFOperation } from './config';
import { validatePOData, sanitizePOData, generateValidationReport } from './validation';

// Error types for PDF generation
export type PDFErrorCode =
  | 'VALIDATION_FAILED'
  | 'DATA_CORRUPTION'
  | 'PDF_GENERATION_FAILED'
  | 'MEMORY_EXCEEDED'
  | 'TIMEOUT'
  | 'UNKNOWN_ERROR';

export interface PDFError extends Error {
  code: PDFErrorCode;
  po_id?: string;
  po_number?: string;
  originalError?: any;
  recoverable: boolean;
}

export interface PDFResult {
  success: boolean;
  pdf?: jsPDF;
  buffer?: Buffer;
  error?: PDFError;
  warnings?: string[];
  metadata?: {
    generationTime?: number;
    retryCount?: number;
    validationsPassed?: boolean;
    fallbacksUsed?: string[];
  };
}

/**
 * Create a custom PDF error with context
 */
export function createPDFError(
  code: PDFErrorCode,
  message: string,
  originalError?: any,
  context?: { po_id?: string; po_number?: string }
): PDFError {
  const error = new Error(message) as PDFError;
  error.name = 'PDFError';
  error.code = code;
  error.po_id = context?.po_id;
  error.po_number = context?.po_number;
  error.originalError = originalError;

  // Determine if error is recoverable
  error.recoverable = [
    'DATA_CORRUPTION',
    'MEMORY_EXCEEDED',
    'TIMEOUT'
  ].includes(code);

  return error;
}

/**
 * Safe wrapper for PDF generation with comprehensive error handling
 */
export async function generatePDFSafely(
  data: POPDFData,
  generatorFunction: (data: POPDFData) => jsPDF,
  options?: {
    maxRetries?: number;
    skipValidation?: boolean;
    returnBuffer?: boolean;
  }
): Promise<PDFResult> {
  const startTime = Date.now();
  const { maxRetries = PDF_CONFIG.recovery.maxRetries, skipValidation = false, returnBuffer = true } = options || {};

  let retryCount = 0;
  const warnings: string[] = [];
  const fallbacksUsed: string[] = [];

  logPDFOperation({
    level: 'info',
    message: 'Starting safe PDF generation',
    po_number: data.po_number,
    metadata: { maxRetries, skipValidation, returnBuffer },
  });

  // Pre-flight validation
  if (!skipValidation) {
    const validationResult = validatePOData(data);

    if (!validationResult.isValid) {
      const validationReport = generateValidationReport(validationResult);

      logPDFOperation({
        level: 'error',
        message: 'PDF validation failed',
        po_number: data.po_number,
        metadata: {
          errors: validationResult.errors,
          report: validationReport
        },
      });

      return {
        success: false,
        error: createPDFError(
          'VALIDATION_FAILED',
          'PDF data validation failed: ' + validationResult.errors.map(e => e.message).join(', '),
          validationResult.errors,
          { po_number: data.po_number }
        ),
        metadata: {
          generationTime: Date.now() - startTime,
          retryCount: 0,
          validationsPassed: false,
        },
      };
    }

    // Add warnings from validation
    if (validationResult.warnings.length > 0) {
      warnings.push(...validationResult.warnings.map(w => w.message));
      logPDFOperation({
        level: 'warn',
        message: `PDF validation warnings: ${validationResult.warnings.length}`,
        po_number: data.po_number,
        metadata: { warnings: validationResult.warnings },
      });
    }
  }

  // Retry loop for PDF generation
  while (retryCount <= maxRetries) {
    try {
      // Sanitize data before each attempt (may help with transient issues)
      let processedData = data;
      if (retryCount > 0 || PDF_CONFIG.recovery.useDefaultValues) {
        processedData = sanitizePOData(data);
        fallbacksUsed.push('data_sanitization');

        logPDFOperation({
          level: 'info',
          message: 'Applied data sanitization for retry',
          po_number: data.po_number,
          metadata: { retryCount },
        });
      }

      // Attempt PDF generation
      logPDFOperation({
        level: 'info',
        message: `Attempting PDF generation (attempt ${retryCount + 1}/${maxRetries + 1})`,
        po_number: data.po_number,
      });

      const pdf = await generateWithTimeout(
        () => generatorFunction(processedData),
        30000 // 30 second timeout
      );

      // Convert to buffer if requested
      let buffer: Buffer | undefined;
      if (returnBuffer) {
        try {
          const arrayBuffer = pdf.output('arraybuffer');
          buffer = Buffer.from(arrayBuffer);
        } catch (bufferError) {
          logPDFOperation({
            level: 'warn',
            message: 'Failed to generate buffer, returning PDF object only',
            po_number: data.po_number,
            error: bufferError,
          });
          warnings.push('Buffer generation failed, PDF object returned instead');
        }
      }

      const generationTime = Date.now() - startTime;

      logPDFOperation({
        level: 'info',
        message: 'PDF generation successful',
        po_number: data.po_number,
        metadata: {
          generationTime,
          retryCount,
          warnings: warnings.length,
          fallbacksUsed,
        },
      });

      return {
        success: true,
        pdf,
        buffer,
        warnings: warnings.length > 0 ? warnings : undefined,
        metadata: {
          generationTime,
          retryCount,
          validationsPassed: !skipValidation,
          fallbacksUsed: fallbacksUsed.length > 0 ? fallbacksUsed : undefined,
        },
      };

    } catch (error) {
      retryCount++;

      const pdfError = classifyPDFError(error, {
        po_number: data.po_number,
      });

      logPDFOperation({
        level: 'error',
        message: `PDF generation failed (attempt ${retryCount}/${maxRetries + 1})`,
        po_number: data.po_number,
        error: pdfError,
        metadata: { retryCount, isRecoverable: pdfError.recoverable },
      });

      // If not recoverable or out of retries, return error
      if (!pdfError.recoverable || retryCount > maxRetries) {
        return {
          success: false,
          error: pdfError,
          warnings: warnings.length > 0 ? warnings : undefined,
          metadata: {
            generationTime: Date.now() - startTime,
            retryCount: retryCount - 1,
            validationsPassed: !skipValidation,
            fallbacksUsed: fallbacksUsed.length > 0 ? fallbacksUsed : undefined,
          },
        };
      }

      // Add delay before retry (exponential backoff)
      const delayMs = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
      await new Promise(resolve => setTimeout(resolve, delayMs));

      warnings.push(`Retry attempt ${retryCount} after ${pdfError.code}: ${pdfError.message}`);
    }
  }

  // This should never be reached, but TypeScript requires it
  return {
    success: false,
    error: createPDFError(
      'UNKNOWN_ERROR',
      'PDF generation failed after all retries',
      undefined,
      { po_number: data.po_number }
    ),
    metadata: {
      generationTime: Date.now() - startTime,
      retryCount,
      validationsPassed: !skipValidation,
    },
  };
}

/**
 * Execute function with timeout protection
 */
async function generateWithTimeout<T>(
  fn: () => T,
  timeoutMs: number
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`PDF generation timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    try {
      const result = fn();
      clearTimeout(timeoutId);
      resolve(result);
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });
}

/**
 * Classify errors into recoverable/non-recoverable categories
 */
function classifyPDFError(error: any, context: { po_number?: string }): PDFError {
  // Analyze error message and type to determine classification
  const errorMessage = error?.message || String(error);
  const errorStack = error?.stack || '';

  // Memory-related errors (recoverable)
  if (errorMessage.includes('memory') || errorMessage.includes('heap') ||
      errorStack.includes('ENOMEM')) {
    return createPDFError(
      'MEMORY_EXCEEDED',
      'PDF generation failed due to memory constraints',
      error,
      context
    );
  }

  // Timeout errors (recoverable)
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return createPDFError(
      'TIMEOUT',
      'PDF generation timed out',
      error,
      context
    );
  }

  // Data corruption errors (recoverable)
  if (errorMessage.includes('invalid') || errorMessage.includes('corrupt') ||
      errorMessage.includes('malformed')) {
    return createPDFError(
      'DATA_CORRUPTION',
      'PDF generation failed due to data issues',
      error,
      context
    );
  }

  // PDF library specific errors (usually not recoverable)
  if (errorMessage.includes('jsPDF') || errorMessage.includes('autoTable')) {
    return createPDFError(
      'PDF_GENERATION_FAILED',
      'PDF library error: ' + errorMessage,
      error,
      context
    );
  }

  // Default to unknown error (not recoverable)
  return createPDFError(
    'UNKNOWN_ERROR',
    'Unexpected PDF generation error: ' + errorMessage,
    error,
    context
  );
}

/**
 * Generate simplified fallback PDF when normal generation fails
 */
export function generateFallbackPDF(data: POPDFData): jsPDF {
  logPDFOperation({
    level: 'warn',
    message: 'Generating fallback PDF with minimal formatting',
    po_number: data.po_number,
  });

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Simple header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('PURCHASE ORDER', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(12);
  doc.text(`PO Number: ${data.po_number || 'UNKNOWN'}`, 20, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Basic info
  const info = [
    `Vendor: ${data.vendors?.vendor_name || 'Unknown Vendor'}`,
    `Project: ${data.projects?.project_name || 'Unknown Project'}`,
    `Status: ${data.status || 'Draft'}`,
    `Total Amount: $${Number(data.total_amount || 0).toFixed(2)}`,
    `Date: ${new Date(data.created_at || Date.now()).toLocaleDateString()}`,
  ];

  for (const line of info) {
    doc.text(line, 20, yPos);
    yPos += 6;
  }

  // Line items (simplified)
  if (data.po_line_items && data.po_line_items.length > 0) {
    yPos += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Line Items:', 20, yPos);
    yPos += 8;

    doc.setFont('helvetica', 'normal');
    data.po_line_items.slice(0, 20).forEach((item, index) => { // Limit to 20 items
      const lineText = `${index + 1}. ${item.item_description} - $${Number(item.line_subtotal || 0).toFixed(2)}`;
      doc.text(lineText.substring(0, 80), 25, yPos); // Truncate long descriptions
      yPos += 5;

      // Start new page if needed
      if (yPos > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        yPos = 20;
      }
    });
  }

  return doc;
}