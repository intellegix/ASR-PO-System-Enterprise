import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import prisma from '@/lib/db';
import { generatePOPdf } from '@/lib/pdf/po-pdf';
import { generatePDFSafely, generateFallbackPDF } from '@/lib/pdf/error-handler';
import { transformPOForPDF } from '@/lib/types/pdf';
import { logPDFOperation } from '@/lib/pdf/config';
// Force dynamic rendering for API route
export const dynamic = 'force-dynamic';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logPDFOperation({
      level: 'info',
      message: 'Starting PDF download request',
      po_id: id,
      metadata: { userId: session.user.id },
    });

    // Fetch PO with all related data
    const po = await prisma.po_headers.findUnique({
      where: { id, deleted_at: null },
      include: {
        po_line_items: {
          orderBy: { line_number: 'asc' },
        },
        vendors: true,
        projects: true,
        divisions: true,
        work_orders: true,
        users_po_headers_requested_by_user_idTousers: {
          select: { first_name: true, last_name: true, email: true },
        },
        users_po_headers_approved_by_user_idTousers: {
          select: { first_name: true, last_name: true },
        },
      },
    });

    if (!po) {
      logPDFOperation({
        level: 'error',
        message: 'PO not found for PDF generation',
        po_id: id,
      });
      return NextResponse.json({ error: 'PO not found' }, { status: 404 });
    }

    // Transform PO data for PDF generation
    const pdfData = transformPOForPDF(po);

    logPDFOperation({
      level: 'info',
      message: 'Data transformation completed, generating PDF',
      po_number: pdfData.po_number,
      metadata: {
        lineItems: pdfData.po_line_items.length,
        totalAmount: pdfData.total_amount,
      },
    });

    // Generate PDF with comprehensive error handling
    const result = await generatePDFSafely(
      pdfData,
      generatePOPdf,
      {
        maxRetries: 2,
        skipValidation: false,
        returnBuffer: true,
      }
    );

    if (!result.success || !result.buffer) {
      // Log the specific error
      logPDFOperation({
        level: 'error',
        message: 'PDF generation failed, attempting fallback',
        po_number: pdfData.po_number,
        error: result.error,
      });

      // Generate fallback PDF for critical failures
      try {
        const fallbackDoc = generateFallbackPDF(pdfData);
        const fallbackArrayBuffer = fallbackDoc.output('arraybuffer');
        const fallbackBuffer = Buffer.from(fallbackArrayBuffer);

        logPDFOperation({
          level: 'warn',
          message: 'Fallback PDF generation successful',
          po_number: pdfData.po_number,
        });

        return new NextResponse(new Uint8Array(fallbackBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="PO-${po.po_number.replace(/\s+/g, '-')}-BASIC.pdf"`,
            'Content-Length': fallbackBuffer.length.toString(),
            'X-PDF-Status': 'fallback',
          },
        });
      } catch (fallbackError) {
        logPDFOperation({
          level: 'error',
          message: 'Both primary and fallback PDF generation failed',
          po_number: pdfData.po_number,
          error: fallbackError,
        });

        return NextResponse.json(
          {
            error: 'Failed to generate PDF',
            details: result.error?.message || 'Unknown error',
            fallbackError: fallbackError instanceof Error ? fallbackError.message : 'Fallback failed'
          },
          { status: 500 }
        );
      }
    }

    const processingTime = Date.now() - startTime;

    // Log successful completion
    logPDFOperation({
      level: 'info',
      message: 'PDF generation and download completed successfully',
      po_number: pdfData.po_number,
      metadata: {
        processingTime,
        retries: result.metadata?.retryCount || 0,
        warnings: result.warnings?.length || 0,
        bufferSize: result.buffer.length,
      },
    });

    // Return successful PDF
    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="PO-${po.po_number.replace(/\s+/g, '-')}.pdf"`,
        'Content-Length': result.buffer.length.toString(),
        'X-PDF-Status': 'success',
        'X-PDF-Processing-Time': processingTime.toString(),
        'X-PDF-Warnings': result.warnings?.length.toString() || '0',
      },
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    logPDFOperation({
      level: 'error',
      message: 'Unexpected error in PDF endpoint',
      po_id: id,
      error,
      metadata: { processingTime },
    });

    console.error('Error in PDF endpoint:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
