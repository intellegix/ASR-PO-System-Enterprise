import nodemailer from 'nodemailer';
import { getEmailTransporter, DEFAULT_FROM, isEmailEnabled } from './config';
import {
  POEmailData,
  approvalNeededEmail,
  poApprovedEmail,
  poRejectedEmail,
  poIssuedInternalEmail,
  vendorPOEmail,
} from './templates';
import prisma from '@/lib/db';
import { generatePOPdf } from '@/lib/pdf/po-pdf';
import { generatePDFSafely, generateFallbackPDF } from '@/lib/pdf/error-handler';
import { transformPOForPDF } from '@/lib/types/pdf';
import { logPDFOperation } from '@/lib/pdf/config';

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: nodemailer.SendMailOptions['attachments'];
}

// Send email helper
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  if (!isEmailEnabled()) {
    console.log('Email disabled, skipping:', options.subject);
    return false;
  }

  try {
    const transporter = await getEmailTransporter();

    const info = await transporter.sendMail({
      from: DEFAULT_FROM,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
    });

    console.log('Email sent:', info.messageId);

    // If using Ethereal, log the preview URL
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log('Preview URL:', previewUrl);
    }

    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

// Get PO data for email templates
export async function getPOEmailData(poId: string): Promise<POEmailData | null> {
  const po = await prisma.po_headers.findUnique({
    where: { id: poId },
    include: {
      vendors: true,
      projects: true,
      divisions: true,
      users_po_headers_requested_by_user_idTousers: true,
    },
  });

  if (!po) return null;

  return {
    po_id: po.id,
    po_number: po.po_number,
    vendor_name: po.vendors?.vendor_name || 'Unknown Vendor',
    project_name: po.projects?.project_name || 'Unknown Project',
    division_name: po.divisions?.division_name || 'Unknown Division',
    total_amount: po.total_amount.toString(),
    required_by_date: po.required_by_date?.toISOString() || null,
    requester_name: po.users_po_headers_requested_by_user_idTousers
      ? `${po.users_po_headers_requested_by_user_idTousers.first_name} ${po.users_po_headers_requested_by_user_idTousers.last_name}`
      : 'Unknown',
    requester_email: po.users_po_headers_requested_by_user_idTousers?.email || '',
  };
}

// Get approvers who should be notified
export async function getApproversForPO(poId: string): Promise<Array<{ first_name: string; last_name: string; email: string }>> {
  const po = await prisma.po_headers.findUnique({
    where: { id: poId },
    include: { divisions: true },
  });

  if (!po) return [];

  const poAmount = Number(po.total_amount);
  const THRESHOLD = 25000;

  // Get potential approvers based on amount
  let approvers;
  if (poAmount > THRESHOLD) {
    // High value - only owners can approve
    approvers = await prisma.users.findMany({
      where: {
        role: 'MAJORITY_OWNER',
        is_active: true,
      },
      select: { first_name: true, last_name: true, email: true },
    });
  } else {
    // Division leaders of this division, ops manager, and owners
    approvers = await prisma.users.findMany({
      where: {
        is_active: true,
        OR: [
          { role: 'MAJORITY_OWNER' },
          { role: 'OPERATIONS_MANAGER' },
          {
            role: 'DIVISION_LEADER',
            division_id: po.division_id,
          },
        ],
      },
      select: { first_name: true, last_name: true, email: true },
    });
  }

  return approvers;
}

// ===== PUBLIC EMAIL FUNCTIONS =====

// Send approval needed notification to approvers
export async function sendApprovalNeededEmails(poId: string): Promise<void> {
  const poData = await getPOEmailData(poId);
  if (!poData) {
    console.error('PO not found for email:', poId);
    return;
  }

  const approvers = await getApproversForPO(poId);

  for (const approver of approvers) {
    const approverName = `${approver.first_name} ${approver.last_name}`;
    const email = approvalNeededEmail(poData, approverName);
    await sendEmail({
      to: approver.email,
      ...email,
    });
  }
}

// Send PO approved notification to requester
export async function sendPOApprovedEmail(poId: string, approverName: string): Promise<void> {
  const poData = await getPOEmailData(poId);
  if (!poData) {
    console.error('PO not found for email:', poId);
    return;
  }

  poData.approver_name = approverName;
  const email = poApprovedEmail(poData);

  await sendEmail({
    to: poData.requester_email,
    ...email,
  });
}

// Send PO rejected notification to requester
export async function sendPORejectedEmail(
  poId: string,
  approverName: string,
  rejectionReason?: string
): Promise<void> {
  const poData = await getPOEmailData(poId);
  if (!poData) {
    console.error('PO not found for email:', poId);
    return;
  }

  poData.approver_name = approverName;
  poData.rejection_reason = rejectionReason;
  const email = poRejectedEmail(poData);

  await sendEmail({
    to: poData.requester_email,
    ...email,
  });
}

// Send PO issued notification (internal)
export async function sendPOIssuedInternalEmail(poId: string, issuedByName: string): Promise<void> {
  const poData = await getPOEmailData(poId);
  if (!poData) {
    console.error('PO not found for email:', poId);
    return;
  }

  const email = poIssuedInternalEmail(poData, issuedByName);

  // Send to requester and accounting
  const recipients = [poData.requester_email];

  // Add accounting users
  const accountingUsers = await prisma.users.findMany({
    where: { role: 'ACCOUNTING', is_active: true },
    select: { email: true },
  });
  recipients.push(...accountingUsers.map((u) => u.email));

  await sendEmail({
    to: recipients,
    ...email,
  });
}

// Send PO to vendor with PDF attachment
export async function sendPOToVendor(poId: string): Promise<boolean> {
  // Fetch full PO data
  const po = await prisma.po_headers.findUnique({
    where: { id: poId },
    include: {
      po_line_items: { orderBy: { line_number: 'asc' } },
      vendors: true,
      projects: true,
      divisions: true,
      work_orders: true,
      users_po_headers_requested_by_user_idTousers: true,
      users_po_headers_approved_by_user_idTousers: true,
    },
  });

  if (!po) {
    console.error('PO not found for vendor email:', poId);
    return false;
  }

  if (!po.vendors?.contact_email) {
    console.error('Vendor has no email address:', po.vendors?.vendor_name);
    return false;
  }

  // Transform and generate PDF with error handling
  const pdfData = transformPOForPDF(po);

  logPDFOperation({
    level: 'info',
    message: 'Generating PDF for vendor email',
    po_number: pdfData.po_number,
    metadata: { vendorEmail: po.vendors.contact_email },
  });

  // Generate PDF with comprehensive error handling
  const result = await generatePDFSafely(
    pdfData,
    generatePOPdf,
    {
      maxRetries: 3, // More retries for email attachments
      skipValidation: false,
      returnBuffer: true,
    }
  );

  let pdfBuffer: Buffer;
  let pdfFilename = `PO-${po.po_number.replace(/\s+/g, '-')}.pdf`;

  if (!result.success || !result.buffer) {
    logPDFOperation({
      level: 'warn',
      message: 'Primary PDF generation failed for vendor email, using fallback',
      po_number: pdfData.po_number,
      error: result.error,
    });

    try {
      // Generate fallback PDF for vendor
      const fallbackDoc = generateFallbackPDF(pdfData);
      const arrayBuffer = fallbackDoc.output('arraybuffer');
      pdfBuffer = Buffer.from(arrayBuffer);
      pdfFilename = `PO-${po.po_number.replace(/\s+/g, '-')}-BASIC.pdf`;

      logPDFOperation({
        level: 'info',
        message: 'Fallback PDF generated successfully for vendor email',
        po_number: pdfData.po_number,
      });
    } catch (fallbackError) {
      logPDFOperation({
        level: 'error',
        message: 'Both primary and fallback PDF generation failed for vendor email',
        po_number: pdfData.po_number,
        error: fallbackError,
      });

      console.error('Failed to generate PDF for vendor email:', fallbackError);
      return false;
    }
  } else {
    pdfBuffer = result.buffer;

    logPDFOperation({
      level: 'info',
      message: 'PDF generated successfully for vendor email',
      po_number: pdfData.po_number,
      metadata: {
        bufferSize: pdfBuffer.length,
        warnings: result.warnings?.length || 0,
      },
    });
  }

  // Create email
  const email = vendorPOEmail({
    po_id: po.id,
    po_number: po.po_number,
    vendor_name: po.vendors.vendor_name,
    vendor_contact_name: po.vendors.contact_name,
    vendor_email: po.vendors.contact_email,
    project_name: po.projects?.project_name || 'Unknown Project',
    division_name: po.divisions?.division_name || 'Unknown Division',
    total_amount: po.total_amount.toString(),
    required_by_date: po.required_by_date?.toISOString() || null,
    requester_name: po.users_po_headers_requested_by_user_idTousers
      ? `${po.users_po_headers_requested_by_user_idTousers.first_name} ${po.users_po_headers_requested_by_user_idTousers.last_name}`
      : 'Unknown',
    requester_email: po.users_po_headers_requested_by_user_idTousers?.email || '',
    notes_vendor: po.notes_vendor,
  });

  return sendEmail({
    to: po.vendors.contact_email,
    ...email,
    attachments: [
      {
        filename: pdfFilename,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
}
