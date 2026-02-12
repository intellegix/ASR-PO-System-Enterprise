import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { withRateLimit } from '@/lib/validation/middleware';
import { receiptOCRResponseSchema } from '@/lib/validation/receipt-schemas';
import log from '@/lib/logging/logger';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RECEIPT_SYSTEM_PROMPT = `Extract structured data from this receipt/invoice image for a construction company PO system.
Return ONLY valid JSON: { "vendor": { "name": "...", "phone": "...", "address": "..." }, "lineItems": [{ "description": "...", "quantity": 1, "unitPrice": 0.00, "total": 0.00 }], "subtotal": 0.00, "taxAmount": 0.00, "total": 0.00, "receiptDate": "YYYY-MM-DD", "receiptNumber": "..." }
Rules: Extract ALL line items. If quantity not explicit, assume 1. Use exact descriptions as printed. If unreadable, return {"error": "Not a receipt or invoice"}.`;

const postHandler = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'PO not found' }, { status: 404 });
    }

    // Verify PO exists and is incomplete draft
    const po = await prisma.po_headers.findUnique({
      where: { id, deleted_at: null },
    });

    if (!po) {
      return NextResponse.json({ error: 'PO not found' }, { status: 404 });
    }

    if (po.status !== 'Draft' || po.vendor_id !== null) {
      return NextResponse.json(
        { error: 'Receipt scanning only available for incomplete draft POs' },
        { status: 400 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type and size
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Supported: JPEG, PNG, WebP' },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    // Convert to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/webp';

    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Receipt scanning not configured (missing API key)' },
        { status: 503 }
      );
    }

    // Call Claude Vision API directly via fetch
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: base64 },
              },
              { type: 'text', text: RECEIPT_SYSTEM_PROMPT },
            ],
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      log.error('Claude Vision API failed', { status: claudeResponse.status, body: errText });
      return NextResponse.json({ error: 'Receipt analysis failed' }, { status: 502 });
    }

    const claudeResult = await claudeResponse.json();
    const textContent = claudeResult.content?.find((c: any) => c.type === 'text')?.text;

    if (!textContent) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 502 });
    }

    // Parse JSON from response (may be wrapped in markdown code block)
    let jsonStr = textContent.trim();
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      log.error('Failed to parse Claude response as JSON', { response: textContent });
      return NextResponse.json({ error: 'Could not parse receipt data' }, { status: 422 });
    }

    // Check for error response
    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 422 });
    }

    // Validate structured data
    const validated = receiptOCRResponseSchema.safeParse(parsed);
    if (!validated.success) {
      log.error('Receipt OCR response validation failed', { issues: validated.error.issues });
      return NextResponse.json({ error: 'Receipt data did not match expected format' }, { status: 422 });
    }

    const ocrData = validated.data;

    // Try to fuzzy-match vendor name against existing vendors
    let matchedVendorId: string | null = null;
    const vendorNameLower = ocrData.vendor.name.toLowerCase();

    const vendors = await prisma.vendors.findMany({
      where: { is_active: true },
      select: { id: true, vendor_name: true, name_variants: true },
    });

    for (const v of vendors) {
      const vNameLower = v.vendor_name.toLowerCase();
      if (
        vNameLower === vendorNameLower ||
        vNameLower.includes(vendorNameLower) ||
        vendorNameLower.includes(vNameLower)
      ) {
        matchedVendorId = v.id;
        break;
      }
      // Check name_variants
      if (v.name_variants && Array.isArray(v.name_variants)) {
        for (const variant of v.name_variants as string[]) {
          if (typeof variant === 'string' && variant.toLowerCase().includes(vendorNameLower)) {
            matchedVendorId = v.id;
            break;
          }
        }
        if (matchedVendorId) break;
      }
    }

    // Upload image to Vercel Blob if token is available
    let receiptImageUrl: string | null = null;
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

    if (blobToken) {
      try {
        const { put } = await import('@vercel/blob');
        const filename = `receipts/${id}-${Date.now()}.${file.type.split('/')[1]}`;
        const blob = await put(filename, file, {
          access: 'public',
          token: blobToken,
        });
        receiptImageUrl = blob.url;
      } catch (blobErr) {
        log.error('Vercel Blob upload failed', {
          error: blobErr instanceof Error ? blobErr.message : String(blobErr),
        });
        // Continue without storing image — OCR data still useful
      }
    }

    // Store OCR data and image URL on PO
    await prisma.po_headers.update({
      where: { id },
      data: {
        receipt_ocr_data: ocrData as any,
        receipt_image_url: receiptImageUrl,
        receipt_uploaded_at: new Date(),
        updated_at: new Date(),
      },
    });

    log.business('Receipt scanned for PO', {
      poId: id,
      poNumber: po.po_number,
      vendorName: ocrData.vendor.name,
      matchedVendorId,
      lineItemCount: ocrData.lineItems.length,
      total: ocrData.total,
      userId: session.user.id,
    });

    return NextResponse.json({
      vendor: {
        name: ocrData.vendor.name,
        matchedVendorId,
      },
      lineItems: ocrData.lineItems,
      subtotal: ocrData.subtotal,
      taxAmount: ocrData.taxAmount,
      total: ocrData.total,
      receiptDate: ocrData.receiptDate,
      receiptNumber: ocrData.receiptNumber,
      receiptImageUrl,
    });
  } catch (error) {
    log.error('Receipt scan failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: 'Receipt scanning failed' }, { status: 500 });
  }
};

export const POST = withRateLimit(10, 60 * 1000)(postHandler);
