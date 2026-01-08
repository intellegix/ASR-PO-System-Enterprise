import { COMPANY_INFO, APP_URL } from './config';

// Helper to format currency
const formatCurrency = (amount: number | string) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
};

// Base email wrapper
const emailWrapper = (content: string, preheader: string = '') => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${COMPANY_INFO.shortName} PO System</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .preheader { display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; }
  </style>
</head>
<body style="background-color: #f1f5f9; margin: 0; padding: 20px;">
  <span class="preheader">${preheader}</span>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto;">
    <!-- Header -->
    <tr>
      <td style="background-color: #ea580c; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">${COMPANY_INFO.shortName} PO System</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 4px 0 0 0; font-size: 14px;">${COMPANY_INFO.name}</p>
      </td>
    </tr>
    <!-- Content -->
    <tr>
      <td style="background-color: white; padding: 32px;">
        ${content}
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 24px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e2e8f0;">
        <p style="color: #64748b; margin: 0 0 8px 0; font-size: 13px;">
          ${COMPANY_INFO.name}<br>
          ${COMPANY_INFO.address}
        </p>
        <p style="color: #94a3b8; margin: 0; font-size: 12px;">
          This is an automated message from the PO System. Please do not reply directly to this email.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Button component
const button = (text: string, url: string, color: string = '#ea580c') => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
    <tr>
      <td style="background-color: ${color}; border-radius: 8px;">
        <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 28px; color: white; text-decoration: none; font-weight: 600; font-size: 14px;">${text}</a>
      </td>
    </tr>
  </table>
`;

// PO summary table
const poSummaryTable = (po: {
  po_number: string;
  vendor_name: string;
  project_name: string;
  division_name: string;
  total_amount: number | string;
  required_by_date?: string | null;
}) => `
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 8px; margin: 16px 0;">
    <tr>
      <td style="padding: 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
              <span style="color: #64748b; font-size: 13px;">PO Number</span><br>
              <span style="color: #0f172a; font-size: 16px; font-weight: 600; font-family: monospace;">${po.po_number}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
              <span style="color: #64748b; font-size: 13px;">Vendor</span><br>
              <span style="color: #0f172a; font-size: 14px;">${po.vendor_name}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
              <span style="color: #64748b; font-size: 13px;">Project</span><br>
              <span style="color: #0f172a; font-size: 14px;">${po.project_name}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
              <span style="color: #64748b; font-size: 13px;">Division</span><br>
              <span style="color: #0f172a; font-size: 14px;">${po.division_name}</span>
            </td>
          </tr>
          ${po.required_by_date ? `
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
              <span style="color: #64748b; font-size: 13px;">Required By</span><br>
              <span style="color: #0f172a; font-size: 14px;">${new Date(po.required_by_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 12px 0 0 0;">
              <span style="color: #64748b; font-size: 13px;">Total Amount</span><br>
              <span style="color: #ea580c; font-size: 24px; font-weight: bold;">${formatCurrency(po.total_amount)}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
`;

// Email templates
export interface POEmailData {
  po_id: string;
  po_number: string;
  vendor_name: string;
  project_name: string;
  division_name: string;
  total_amount: number | string;
  required_by_date?: string | null;
  requester_name: string;
  requester_email: string;
  approver_name?: string;
  rejection_reason?: string;
}

// 1. PO Submitted for Approval
export function approvalNeededEmail(data: POEmailData, approverName: string) {
  const poUrl = `${APP_URL}/po/${data.po_id}`;
  const approvalsUrl = `${APP_URL}/approvals`;

  const content = `
    <h2 style="color: #0f172a; margin: 0 0 8px 0; font-size: 20px;">New PO Awaiting Your Approval</h2>
    <p style="color: #475569; margin: 0 0 24px 0; font-size: 15px;">
      Hi ${approverName},<br><br>
      A new purchase order has been submitted and requires your approval.
    </p>

    ${poSummaryTable(data)}

    <p style="color: #475569; margin: 16px 0; font-size: 14px;">
      <strong>Requested by:</strong> ${data.requester_name}
    </p>

    ${button('Review & Approve', approvalsUrl)}

    <p style="color: #64748b; font-size: 13px; margin: 0;">
      Or <a href="${poUrl}" style="color: #ea580c;">view the full PO details</a>
    </p>
  `;

  return {
    subject: `[Action Required] PO ${data.po_number} Needs Approval - ${formatCurrency(data.total_amount)}`,
    html: emailWrapper(content, `PO ${data.po_number} from ${data.vendor_name} needs your approval`),
    text: `New PO ${data.po_number} requires your approval.\n\nVendor: ${data.vendor_name}\nAmount: ${formatCurrency(data.total_amount)}\nRequested by: ${data.requester_name}\n\nReview at: ${approvalsUrl}`,
  };
}

// 2. PO Approved
export function poApprovedEmail(data: POEmailData) {
  const poUrl = `${APP_URL}/po/${data.po_id}`;

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background-color: #dcfce7; border-radius: 50%; padding: 16px; margin-bottom: 16px;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2">
          <path d="M5 13l4 4L19 7"/>
        </svg>
      </div>
      <h2 style="color: #16a34a; margin: 0; font-size: 20px;">PO Approved!</h2>
    </div>

    <p style="color: #475569; margin: 0 0 24px 0; font-size: 15px;">
      Great news! Your purchase order has been approved by ${data.approver_name || 'a manager'}.
    </p>

    ${poSummaryTable(data)}

    <p style="color: #475569; margin: 16px 0; font-size: 14px;">
      You can now proceed to issue this PO to the vendor.
    </p>

    ${button('View PO & Issue to Vendor', poUrl)}
  `;

  return {
    subject: `PO ${data.po_number} Approved - ${formatCurrency(data.total_amount)}`,
    html: emailWrapper(content, `Your PO ${data.po_number} has been approved`),
    text: `Your PO ${data.po_number} has been approved by ${data.approver_name || 'a manager'}.\n\nVendor: ${data.vendor_name}\nAmount: ${formatCurrency(data.total_amount)}\n\nView at: ${poUrl}`,
  };
}

// 3. PO Rejected
export function poRejectedEmail(data: POEmailData) {
  const poUrl = `${APP_URL}/po/${data.po_id}`;

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background-color: #fee2e2; border-radius: 50%; padding: 16px; margin-bottom: 16px;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2">
          <path d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </div>
      <h2 style="color: #dc2626; margin: 0; font-size: 20px;">PO Rejected</h2>
    </div>

    <p style="color: #475569; margin: 0 0 24px 0; font-size: 15px;">
      Your purchase order was rejected by ${data.approver_name || 'a manager'}.
    </p>

    ${poSummaryTable(data)}

    ${data.rejection_reason ? `
    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
      <p style="color: #7f1d1d; margin: 0 0 4px 0; font-size: 13px; font-weight: 600;">Reason for rejection:</p>
      <p style="color: #991b1b; margin: 0; font-size: 14px;">${data.rejection_reason}</p>
    </div>
    ` : ''}

    <p style="color: #475569; margin: 16px 0; font-size: 14px;">
      Please review the feedback and make any necessary changes before resubmitting.
    </p>

    ${button('View PO Details', poUrl, '#64748b')}
  `;

  return {
    subject: `PO ${data.po_number} Rejected`,
    html: emailWrapper(content, `Your PO ${data.po_number} was rejected`),
    text: `Your PO ${data.po_number} was rejected by ${data.approver_name || 'a manager'}.\n\n${data.rejection_reason ? `Reason: ${data.rejection_reason}\n\n` : ''}View at: ${poUrl}`,
  };
}

// 4. PO Issued to Vendor (internal notification)
export function poIssuedInternalEmail(data: POEmailData, issuedByName: string) {
  const poUrl = `${APP_URL}/po/${data.po_id}`;

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background-color: #dbeafe; border-radius: 50%; padding: 16px; margin-bottom: 16px;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2">
          <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
        </svg>
      </div>
      <h2 style="color: #2563eb; margin: 0; font-size: 20px;">PO Issued to Vendor</h2>
    </div>

    <p style="color: #475569; margin: 0 0 24px 0; font-size: 15px;">
      PO ${data.po_number} has been issued to the vendor by ${issuedByName}.
    </p>

    ${poSummaryTable(data)}

    ${button('View PO', poUrl, '#2563eb')}
  `;

  return {
    subject: `PO ${data.po_number} Issued to ${data.vendor_name}`,
    html: emailWrapper(content, `PO ${data.po_number} has been sent to the vendor`),
    text: `PO ${data.po_number} has been issued to ${data.vendor_name} by ${issuedByName}.\n\nAmount: ${formatCurrency(data.total_amount)}\n\nView at: ${poUrl}`,
  };
}

// 5. PO Email to Vendor (with PDF attachment)
export function vendorPOEmail(data: POEmailData & {
  vendor_contact_name?: string | null;
  vendor_email: string;
  notes_vendor?: string | null;
}) {
  const content = `
    <h2 style="color: #0f172a; margin: 0 0 8px 0; font-size: 20px;">Purchase Order</h2>
    <p style="color: #475569; margin: 0 0 24px 0; font-size: 15px;">
      ${data.vendor_contact_name ? `Dear ${data.vendor_contact_name},` : 'Hello,'}<br><br>
      Please find attached our purchase order for your reference.
    </p>

    ${poSummaryTable(data)}

    ${data.notes_vendor ? `
    <div style="background-color: #f8fafc; border-left: 4px solid #ea580c; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
      <p style="color: #475569; margin: 0 0 4px 0; font-size: 13px; font-weight: 600;">Notes:</p>
      <p style="color: #0f172a; margin: 0; font-size: 14px;">${data.notes_vendor}</p>
    </div>
    ` : ''}

    <p style="color: #475569; margin: 24px 0 16px 0; font-size: 14px;">
      <strong>Important:</strong> Please reference PO number <strong>${data.po_number}</strong> on all invoices and correspondence.
    </p>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">

    <p style="color: #64748b; font-size: 13px; margin: 0;">
      If you have any questions, please contact us at:<br>
      <strong>Email:</strong> ${COMPANY_INFO.email}<br>
      <strong>Phone:</strong> ${COMPANY_INFO.phone}
    </p>
  `;

  return {
    subject: `Purchase Order ${data.po_number} from ${COMPANY_INFO.name}`,
    html: emailWrapper(content, `PO ${data.po_number} - ${formatCurrency(data.total_amount)}`),
    text: `Purchase Order ${data.po_number}\n\nVendor: ${data.vendor_name}\nAmount: ${formatCurrency(data.total_amount)}\n\nPlease reference PO number ${data.po_number} on all invoices.\n\nContact: ${COMPANY_INFO.email} | ${COMPANY_INFO.phone}`,
  };
}
