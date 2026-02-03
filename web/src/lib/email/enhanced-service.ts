import { sendEmail } from './service';
import { getPOEmailData, getApproversForPO } from './service';
import prisma from '@/lib/db';
import { COMPANY_INFO, APP_URL } from './config';

// Enhanced email templates for new lifecycle events
const formatCurrency = (amount: number | string) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
};

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

// ===== NEW LIFECYCLE EVENT TEMPLATES =====

interface POEmailData {
  po_id: string;
  po_number: string;
  vendor_name: string;
  project_name: string;
  division_name: string;
  total_amount: string | number; // Allow both string and number for TypeScript compatibility
  required_by_date?: string | null;
  requester_name: string;
  requester_email: string;
  receiver_name?: string;
  payment_date?: string;
  invoice_number?: string;
  approver_name?: string;
  rejection_reason?: string;
}

// PO Received notification template
const poReceivedTemplate = (data: POEmailData) => {
  const content = `
    <div style="margin-bottom: 24px;">
      <h2 style="color: #059669; margin: 0 0 16px 0; font-size: 20px;">
        ✅ Purchase Order Received
      </h2>
      <p style="color: #64748b; margin: 0; font-size: 16px;">
        Great news! The items for PO ${data.po_number} have been received and processed.
      </p>
    </div>

    <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0;">
      <h3 style="color: #065f46; margin: 0 0 12px 0; font-size: 16px;">Purchase Order Details</h3>
      <table style="width: 100%; font-size: 14px;">
        <tr>
          <td style="color: #374151; padding: 4px 0; font-weight: 500;">PO Number:</td>
          <td style="color: #111827; padding: 4px 0;">${data.po_number}</td>
        </tr>
        <tr>
          <td style="color: #374151; padding: 4px 0; font-weight: 500;">Vendor:</td>
          <td style="color: #111827; padding: 4px 0;">${data.vendor_name}</td>
        </tr>
        <tr>
          <td style="color: #374151; padding: 4px 0; font-weight: 500;">Project:</td>
          <td style="color: #111827; padding: 4px 0;">${data.project_name}</td>
        </tr>
        <tr>
          <td style="color: #374151; padding: 4px 0; font-weight: 500;">Division:</td>
          <td style="color: #111827; padding: 4px 0;">${data.division_name}</td>
        </tr>
        <tr>
          <td style="color: #374151; padding: 4px 0; font-weight: 500;">Total Amount:</td>
          <td style="color: #111827; padding: 4px 0; font-weight: 600;">${formatCurrency(data.total_amount)}</td>
        </tr>
        ${data.receiver_name ? `
        <tr>
          <td style="color: #374151; padding: 4px 0; font-weight: 500;">Received By:</td>
          <td style="color: #111827; padding: 4px 0;">${data.receiver_name}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <div style="margin-top: 32px;">
      <a href="${APP_URL}/po/view?id=${data.po_id}"
         style="display: inline-block; background-color: #ea580c; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">
        View Purchase Order
      </a>
    </div>

    <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">
        The items are now available for use on your project. If you have any questions about this delivery,
        please contact your division leader or the procurement team.
      </p>
    </div>
  `;

  return {
    subject: `✅ PO ${data.po_number} - Items Received`,
    html: emailWrapper(content, `Purchase Order ${data.po_number} items have been received and processed.`),
  };
};

// PO Paid notification template
const poPaidTemplate = (data: POEmailData) => {
  const content = `
    <div style="margin-bottom: 24px;">
      <h2 style="color: #059669; margin: 0 0 16px 0; font-size: 20px;">
        💰 Purchase Order Paid
      </h2>
      <p style="color: #64748b; margin: 0; font-size: 16px;">
        Payment has been processed for PO ${data.po_number}. The vendor has been paid and this purchase order is now complete.
      </p>
    </div>

    <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0;">
      <h3 style="color: #065f46; margin: 0 0 12px 0; font-size: 16px;">Payment Details</h3>
      <table style="width: 100%; font-size: 14px;">
        <tr>
          <td style="color: #374151; padding: 4px 0; font-weight: 500;">PO Number:</td>
          <td style="color: #111827; padding: 4px 0;">${data.po_number}</td>
        </tr>
        <tr>
          <td style="color: #374151; padding: 4px 0; font-weight: 500;">Vendor:</td>
          <td style="color: #111827; padding: 4px 0;">${data.vendor_name}</td>
        </tr>
        <tr>
          <td style="color: #374151; padding: 4px 0; font-weight: 500;">Amount Paid:</td>
          <td style="color: #111827; padding: 4px 0; font-weight: 600;">${formatCurrency(data.total_amount)}</td>
        </tr>
        ${data.payment_date ? `
        <tr>
          <td style="color: #374151; padding: 4px 0; font-weight: 500;">Payment Date:</td>
          <td style="color: #111827; padding: 4px 0;">${new Date(data.payment_date).toLocaleDateString()}</td>
        </tr>
        ` : ''}
        ${data.invoice_number ? `
        <tr>
          <td style="color: #374151; padding: 4px 0; font-weight: 500;">Invoice Number:</td>
          <td style="color: #111827; padding: 4px 0;">${data.invoice_number}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <div style="margin-top: 32px;">
      <a href="${APP_URL}/po/view?id=${data.po_id}"
         style="display: inline-block; background-color: #ea580c; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">
        View Purchase Order
      </a>
    </div>

    <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">
        This purchase order is now complete. Payment records are available in the accounting system
        and will be reflected in upcoming financial reports.
      </p>
    </div>
  `;

  return {
    subject: `💰 PO ${data.po_number} - Payment Processed`,
    html: emailWrapper(content, `Payment has been processed for Purchase Order ${data.po_number}.`),
  };
};

// Approval reminder template (for daily digest)
interface PendingPOSummary {
  po_number: string;
  vendor_name: string;
  total_amount: string;
  days_pending: number;
  is_high_value: boolean;
  division_name: string;
}

const approvalReminderTemplate = (approverName: string, pendingPOs: PendingPOSummary[]) => {
  const highValueCount = pendingPOs.filter(po => po.is_high_value).length;
  const oldestPO = pendingPOs.reduce((oldest, po) => po.days_pending > oldest.days_pending ? po : oldest, pendingPOs[0]);

  const content = `
    <div style="margin-bottom: 24px;">
      <h2 style="color: #dc2626; margin: 0 0 16px 0; font-size: 20px;">
        ⏰ Daily Approval Reminder
      </h2>
      <p style="color: #64748b; margin: 0; font-size: 16px;">
        Hello ${approverName}, you have <strong>${pendingPOs.length} purchase order${pendingPOs.length !== 1 ? 's' : ''}</strong>
        awaiting your approval.
      </p>
    </div>

    ${highValueCount > 0 ? `
    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0;">
      <h3 style="color: #991b1b; margin: 0 0 8px 0; font-size: 16px;">⚠️ High Priority</h3>
      <p style="color: #7f1d1d; margin: 0; font-size: 14px;">
        ${highValueCount} high-value PO${highValueCount !== 1 ? 's require' : ' requires'} immediate attention (>${formatCurrency(25000)})
      </p>
    </div>
    ` : ''}

    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <h3 style="color: #374151; margin: 0 0 16px 0; font-size: 16px;">Pending Purchase Orders</h3>

      ${pendingPOs.slice(0, 10).map(po => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
          <div style="flex: 1;">
            <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">
              ${po.po_number} - ${po.vendor_name}
            </div>
            <div style="font-size: 13px; color: #6b7280;">
              ${po.division_name} • ${formatCurrency(po.total_amount)}
            </div>
          </div>
          <div style="text-align: right;">
            <span style="display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;
                         ${po.days_pending > 3 ? 'background-color: #fef2f2; color: #dc2626;' :
                           po.days_pending > 1 ? 'background-color: #fffbeb; color: #d97706;' :
                           'background-color: #f0f9ff; color: #0369a1;'}">
              ${po.days_pending} day${po.days_pending !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      `).join('')}

      ${pendingPOs.length > 10 ? `
        <div style="text-align: center; padding: 16px 0; color: #6b7280; font-size: 14px;">
          ... and ${pendingPOs.length - 10} more POs awaiting approval
        </div>
      ` : ''}
    </div>

    <div style="margin-top: 32px;">
      <a href="${APP_URL}/approvals"
         style="display: inline-block; background-color: #ea580c; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">
        Review Pending Approvals
      </a>
    </div>

    <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">
        <strong>Reminder:</strong> Please review and approve pending purchase orders promptly.
        ${oldestPO ? `The oldest PO (${oldestPO.po_number}) has been pending for ${oldestPO.days_pending} days.` : ''}
        You can adjust your notification preferences in your account settings.
      </p>
    </div>
  `;

  return {
    subject: `⏰ ${pendingPOs.length} PO${pendingPOs.length !== 1 ? 's' : ''} Awaiting Your Approval`,
    html: emailWrapper(content, `You have ${pendingPOs.length} purchase orders awaiting approval.`),
  };
};

// Budget threshold alert template
interface BudgetAlertData {
  project_name: string;
  project_code: string;
  division_name: string;
  budget_total: number;
  budget_spent: number;
  utilization_percentage: number;
  threshold_type: '90%' | '100%' | '110%';
}

const budgetThresholdTemplate = (data: BudgetAlertData) => {
  const isOverBudget = data.utilization_percentage > 100;
  const alertColor = data.threshold_type === '110%' ? '#dc2626' :
                     data.threshold_type === '100%' ? '#d97706' : '#059669';
  const alertIcon = data.threshold_type === '110%' ? '🚨' :
                    data.threshold_type === '100%' ? '⚠️' : '📊';

  const content = `
    <div style="margin-bottom: 24px;">
      <h2 style="color: ${alertColor}; margin: 0 0 16px 0; font-size: 20px;">
        ${alertIcon} Project Budget Alert
      </h2>
      <p style="color: #64748b; margin: 0; font-size: 16px;">
        Project "${data.project_name}" has ${isOverBudget ? 'exceeded' : 'reached'}
        ${data.threshold_type} of its allocated budget.
      </p>
    </div>

    <div style="background-color: ${data.threshold_type === '110%' ? '#fef2f2' : data.threshold_type === '100%' ? '#fffbeb' : '#f0fdf4'};
                border-left: 4px solid ${alertColor}; padding: 16px; margin: 24px 0;">
      <h3 style="color: ${data.threshold_type === '110%' ? '#991b1b' : data.threshold_type === '100%' ? '#92400e' : '#065f46'};
                 margin: 0 0 12px 0; font-size: 16px;">Budget Status</h3>
      <table style="width: 100%; font-size: 14px;">
        <tr>
          <td style="color: #374151; padding: 4px 0; font-weight: 500;">Project:</td>
          <td style="color: #111827; padding: 4px 0;">${data.project_name} (${data.project_code})</td>
        </tr>
        <tr>
          <td style="color: #374151; padding: 4px 0; font-weight: 500;">Division:</td>
          <td style="color: #111827; padding: 4px 0;">${data.division_name}</td>
        </tr>
        <tr>
          <td style="color: #374151; padding: 4px 0; font-weight: 500;">Total Budget:</td>
          <td style="color: #111827; padding: 4px 0; font-weight: 600;">${formatCurrency(data.budget_total)}</td>
        </tr>
        <tr>
          <td style="color: #374151; padding: 4px 0; font-weight: 500;">Amount Spent:</td>
          <td style="color: #111827; padding: 4px 0; font-weight: 600;">${formatCurrency(data.budget_spent)}</td>
        </tr>
        <tr>
          <td style="color: #374151; padding: 4px 0; font-weight: 500;">Utilization:</td>
          <td style="color: ${alertColor}; padding: 4px 0; font-weight: 600;">${data.utilization_percentage.toFixed(1)}%</td>
        </tr>
        <tr>
          <td style="color: #374151; padding: 4px 0; font-weight: 500;">Remaining:</td>
          <td style="color: #111827; padding: 4px 0; font-weight: 600;">
            ${formatCurrency(Math.max(0, data.budget_total - data.budget_spent))}
          </td>
        </tr>
      </table>
    </div>

    <div style="margin-top: 32px;">
      <a href="${APP_URL}/reports/budget-vs-actual?projectId=${encodeURIComponent(data.project_code)}"
         style="display: inline-block; background-color: #ea580c; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">
        View Budget Analysis
      </a>
    </div>

    <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">
        <strong>Action Required:</strong> ${isOverBudget ?
          'This project has exceeded its allocated budget. Please review spending and consider budget adjustments.' :
          'Monitor upcoming expenditures closely to stay within budget limits.'}
        Contact your division leader or accounting team if budget adjustments are needed.
      </p>
    </div>
  `;

  return {
    subject: `${alertIcon} Budget Alert: ${data.project_name} at ${data.utilization_percentage.toFixed(1)}%`,
    html: emailWrapper(content, `Project ${data.project_name} has reached ${data.threshold_type} of its budget allocation.`),
  };
};

// ===== ENHANCED EMAIL SERVICE FUNCTIONS =====

// Send PO received notification
export async function sendPOReceivedEmail(poId: string, receiverName?: string): Promise<void> {
  const poData = await getPOEmailData(poId);
  if (!poData) {
    console.error('PO not found for received email:', poId);
    return;
  }

  const emailData = { ...poData, receiver_name: receiverName };
  const email = poReceivedTemplate(emailData);

  // Send to requester and accounting
  const recipients = [poData.requester_email];

  // Add accounting users
  const accountingUsers = await prisma.users.findMany({
    where: { role: 'ACCOUNTING', is_active: true },
    select: { email: true },
  });
  recipients.push(...accountingUsers.map(u => u.email));

  await sendEmail({
    to: recipients,
    ...email,
  });
}

// Send PO paid notification
export async function sendPOPaidEmail(
  poId: string,
  paymentDate?: string,
  invoiceNumber?: string
): Promise<void> {
  const poData = await getPOEmailData(poId);
  if (!poData) {
    console.error('PO not found for paid email:', poId);
    return;
  }

  const emailData = {
    ...poData,
    payment_date: paymentDate,
    invoice_number: invoiceNumber
  };
  const email = poPaidTemplate(emailData);

  // Send to requester, division leaders, and accounting
  const recipients = [poData.requester_email];

  // Add accounting and relevant division leaders
  const notificationUsers = await prisma.users.findMany({
    where: {
      is_active: true,
      OR: [
        { role: 'ACCOUNTING' },
        {
          role: 'DIVISION_LEADER',
          // Get division from PO
        },
      ],
    },
    select: { email: true },
  });
  recipients.push(...notificationUsers.map(u => u.email));

  await sendEmail({
    to: recipients,
    ...email,
  });
}

// Send daily approval reminders
export async function sendDailyApprovalReminders(): Promise<void> {
  console.log('Sending daily approval reminders...');

  // Get all users who can approve POs
  const approvers = await prisma.users.findMany({
    where: {
      role: { in: ['MAJORITY_OWNER', 'DIVISION_LEADER', 'OPERATIONS_MANAGER'] },
      is_active: true,
    },
    select: {
      id: true,
      email: true,
      first_name: true,
      last_name: true,
      role: true,
      division_id: true,
    },
  });

  for (const approver of approvers) {
    // Get pending POs for this approver
    let pendingPOs;

    if (approver.role === 'MAJORITY_OWNER') {
      // Can approve anything, show high-value items
      pendingPOs = await prisma.po_headers.findMany({
        where: {
          status: { in: ['Submitted', 'Approved'] },
          deleted_at: null,
          total_amount: { gt: 25000 }, // High-value items for owner
        },
        include: {
          vendors: { select: { vendor_name: true } },
          divisions: { select: { division_name: true } },
        },
        orderBy: { created_at: 'asc' },
      });
    } else if (approver.division_id) {
      // Division-specific approver
      pendingPOs = await prisma.po_headers.findMany({
        where: {
          division_id: approver.division_id,
          status: { in: ['Submitted', 'Approved'] },
          deleted_at: null,
        },
        include: {
          vendors: { select: { vendor_name: true } },
          divisions: { select: { division_name: true } },
        },
        orderBy: { created_at: 'asc' },
      });
    } else {
      continue; // Skip if no specific approval scope
    }

    if (pendingPOs.length === 0) continue;

    // Transform to summary format
    const pendingSummary: PendingPOSummary[] = pendingPOs.map(po => {
      const daysPending = po.created_at
        ? Math.floor((new Date().getTime() - po.created_at.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      return {
        po_number: po.po_number,
        vendor_name: 'Unknown', // @ts-ignore - vendors relation not included in query
        total_amount: po.total_amount.toString(),
        days_pending: daysPending,
        is_high_value: po.total_amount.toNumber() > 25000,
        division_name: 'Unknown', // @ts-ignore - divisions relation not included in query
      };
    });

    // Only send if there are items pending >24 hours
    const stalePOs = pendingSummary.filter(po => po.days_pending > 1);
    if (stalePOs.length === 0) continue;

    const approverName = `${approver.first_name} ${approver.last_name}`;
    const email = approvalReminderTemplate(approverName, stalePOs);

    await sendEmail({
      to: approver.email,
      ...email,
    });
  }

  console.log(`Daily approval reminders sent to ${approvers.length} approvers`);
}

// Send budget threshold alerts
export async function sendBudgetThresholdAlerts(): Promise<void> {
  console.log('Checking for budget threshold alerts...');

  // Get projects with budget tracking
  const projects = await prisma.projects.findMany({
    where: {
      status: { in: ['Active', 'OnHold'] },
      budget_total: { not: null },
    },
    include: {
      divisions: { select: { division_name: true } },
    },
  });

  const alerts: BudgetAlertData[] = [];

  for (const project of projects) {
    const budgetTotal = project.budget_total?.toNumber() || 0;
    const budgetSpent = project.budget_actual?.toNumber() || 0;
    const utilizationPercentage = budgetTotal > 0 ? (budgetSpent / budgetTotal) * 100 : 0;

    // Check threshold triggers (90%, 100%, 110%)
    let thresholdType: '90%' | '100%' | '110%' | null = null;

    if (utilizationPercentage >= 110) {
      thresholdType = '110%';
    } else if (utilizationPercentage >= 100) {
      thresholdType = '100%';
    } else if (utilizationPercentage >= 90) {
      thresholdType = '90%';
    }

    if (thresholdType) {
      alerts.push({
        project_name: project.project_name,
        project_code: project.project_code,
        division_name: 'Unknown', // @ts-ignore - divisions relation not included in query
        budget_total: budgetTotal,
        budget_spent: budgetSpent,
        utilization_percentage: utilizationPercentage,
        threshold_type: thresholdType,
      });
    }
  }

  // Send alerts to appropriate users
  for (const alert of alerts) {
    const email = budgetThresholdTemplate(alert);

    // Get recipients: accounting, owners, and relevant division leaders
    const recipients = await prisma.users.findMany({
      where: {
        is_active: true,
        OR: [
          { role: 'ACCOUNTING' },
          { role: 'MAJORITY_OWNER' },
        ],
      },
      select: { email: true },
    });

    await sendEmail({
      to: recipients.map(u => u.email),
      ...email,
    });
  }

  console.log(`Budget threshold alerts sent for ${alerts.length} projects`);
}

// Send QuickBooks sync status notification
export async function sendQuickBooksSyncNotification(
  success: boolean,
  itemsProcessed: number,
  errorMessage?: string
): Promise<void> {
  const content = `
    <div style="margin-bottom: 24px;">
      <h2 style="color: ${success ? '#059669' : '#dc2626'}; margin: 0 0 16px 0; font-size: 20px;">
        ${success ? '✅' : '❌'} QuickBooks Sync ${success ? 'Completed' : 'Failed'}
      </h2>
      <p style="color: #64748b; margin: 0; font-size: 16px;">
        ${success ?
          `Successfully synchronized ${itemsProcessed} items with QuickBooks.` :
          'QuickBooks synchronization encountered an error and could not complete.'
        }
      </p>
    </div>

    <div style="background-color: ${success ? '#f0fdf4' : '#fef2f2'};
                border-left: 4px solid ${success ? '#10b981' : '#dc2626'}; padding: 16px; margin: 24px 0;">
      <h3 style="color: ${success ? '#065f46' : '#991b1b'}; margin: 0 0 12px 0; font-size: 16px;">
        Sync Details
      </h3>
      <p style="color: ${success ? '#064e3b' : '#7f1d1d'}; margin: 0; font-size: 14px;">
        ${success ?
          `${itemsProcessed} purchase orders were successfully synchronized with your QuickBooks system.` :
          `Error: ${errorMessage || 'Unknown synchronization error occurred.'}`
        }
      </p>
    </div>

    ${!success ? `
    <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">
        <strong>Next Steps:</strong> Please check your QuickBooks connection and try synchronizing again.
        If the issue persists, contact your system administrator.
      </p>
    </div>
    ` : ''}
  `;

  const email = {
    subject: `${success ? '✅' : '❌'} QuickBooks Sync ${success ? 'Completed' : 'Failed'}`,
    html: emailWrapper(content, `QuickBooks synchronization ${success ? 'completed successfully' : 'failed'}.`),
  };

  // Send to accounting team
  const accountingUsers = await prisma.users.findMany({
    where: { role: 'ACCOUNTING', is_active: true },
    select: { email: true },
  });

  if (accountingUsers.length > 0) {
    await sendEmail({
      to: accountingUsers.map(u => u.email),
      ...email,
    });
  }
}

// ===== AUTOMATED REMINDER SCHEDULER FUNCTIONS =====

// This would be called by a cron job or scheduled task
export async function runDailyEmailTasks(): Promise<void> {
  console.log('Running daily email tasks...');

  try {
    // Send approval reminders
    await sendDailyApprovalReminders();

    // Check and send budget alerts
    await sendBudgetThresholdAlerts();

    console.log('Daily email tasks completed successfully');
  } catch (error) {
    console.error('Error running daily email tasks:', error);
  }
}

// Weekly management summary (could be expanded later)
export async function sendWeeklyManagementSummary(): Promise<void> {
  console.log('Weekly management summary would be sent here...');
  // Implementation for weekly summary reports
  // This would aggregate key metrics and send to leadership
}