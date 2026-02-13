/**
 * PDF Generation Types
 * TypeScript interfaces for PDF generation with proper type safety
 */

// Base interfaces for PDF data structures
export interface PDFLineItem {
  line_number: number;
  item_description: string;
  quantity: number | string;
  unit_of_measure: string;
  unit_price: number | string;
  line_subtotal: number | string;
  is_taxable: boolean;
}

export interface PDFVendor {
  vendor_name: string;
  vendor_code: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
}

export interface PDFProject {
  project_code: string;
  project_name: string;
  property_address: string | null;
}

export interface PDFDivision {
  division_name: string;
  division_code: string;
}

export interface PDFWorkOrder {
  work_order_number: string;
  title: string;
}

export interface PDFUser {
  name: string; // Computed from first_name + last_name
  email: string;
}

export interface PDFApprover {
  name: string; // Computed from first_name + last_name
}

// Main PDF data interface (expected by generatePOPdfBuffer)
export interface POPDFData {
  po_number: string;
  status: string;
  created_at: string;
  required_by_date: string | null;
  approved_at: string | null;
  issued_at: string | null;
  terms_code: string | null;
  cost_center_code: string | null;
  subtotal_amount: number | string;
  tax_amount: number | string;
  tax_rate: number | string;
  total_amount: number | string;
  notes_vendor: string | null;
  vendors: PDFVendor | null;
  projects: PDFProject | null;
  divisions: PDFDivision | null;
  work_orders: PDFWorkOrder | null;
  users_po_headers_requested_by_user_idTousers: PDFUser | null;
  users_po_headers_approved_by_user_idTousers: PDFApprover | null;
  po_line_items: PDFLineItem[];
}

// Flexible Prisma result type (what we get from database)
// Using flexible types to accommodate Prisma's actual return structure
export interface POPrismaResult {
  id?: string;
  po_number: string;
  status?: string | null;
  created_at: Date | null;
  required_by_date?: Date | null;
  approved_at?: Date | null;
  issued_at?: Date | null;
  terms_code?: string | null;
  cost_center_code?: string | null;
  subtotal_amount: unknown; // Prisma Decimal type
  tax_amount: unknown; // Prisma Decimal type
  tax_rate: unknown; // Prisma Decimal type
  total_amount: unknown; // Prisma Decimal type
  notes_vendor?: string | null;
  vendors?: PDFVendor | null;
  projects?: PDFProject | null;
  divisions?: PDFDivision | null;
  work_orders?: PDFWorkOrder | null;
  users_po_headers_requested_by_user_idTousers?: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  users_po_headers_approved_by_user_idTousers?: {
    first_name: string;
    last_name: string;
  } | null;
  po_line_items: Array<{
    line_number: number;
    item_description: string;
    quantity: unknown; // Prisma Decimal type
    unit_of_measure: string;
    unit_price: unknown; // Prisma Decimal type
    line_subtotal: unknown; // Prisma Decimal type
    is_taxable: boolean;
  }>;
}

/**
 * Transforms Prisma result to PDF-ready format
 * Handles user name computation and decimal conversion
 */
export function transformPOForPDF(po: Record<string, unknown>): POPDFData {
  // Helper to convert Prisma Decimal to number
  const toNumber = (decimal: unknown): number => {
    if (decimal === null || decimal === undefined) return 0;
    return typeof decimal === 'number' ? decimal : parseFloat(String(decimal));
  };

  // Helper to format user name
  const formatUserName = (user: { first_name: string; last_name: string } | null): string => {
    if (!user) return '';
    return `${user.first_name} ${user.last_name}`.trim();
  };

  return {
    po_number: po.po_number as string,
    status: (po.status as string | null) || 'Draft',
    created_at: po.created_at ? (po.created_at as Date).toISOString() : new Date().toISOString(),
    required_by_date: (po.required_by_date as Date | undefined)?.toISOString() || null,
    approved_at: (po.approved_at as Date | undefined)?.toISOString() || null,
    issued_at: (po.issued_at as Date | undefined)?.toISOString() || null,
    terms_code: (po.terms_code as string | null) || null,
    cost_center_code: (po.cost_center_code as string | null) || null,
    subtotal_amount: toNumber(po.subtotal_amount),
    tax_amount: toNumber(po.tax_amount),
    tax_rate: toNumber(po.tax_rate),
    total_amount: toNumber(po.total_amount),
    notes_vendor: (po.notes_vendor as string | null) || null,
    vendors: (po.vendors as PDFVendor | null) || null,
    projects: (po.projects as PDFProject | null) || null,
    divisions: (po.divisions as PDFDivision | null) || null,
    work_orders: (po.work_orders as PDFWorkOrder | null) || null,
    users_po_headers_requested_by_user_idTousers: po.users_po_headers_requested_by_user_idTousers ? {
      name: formatUserName(po.users_po_headers_requested_by_user_idTousers as { first_name: string; last_name: string }),
      email: (po.users_po_headers_requested_by_user_idTousers as { email: string }).email,
    } : null,
    users_po_headers_approved_by_user_idTousers: po.users_po_headers_approved_by_user_idTousers ? {
      name: formatUserName(po.users_po_headers_approved_by_user_idTousers as { first_name: string; last_name: string }),
    } : null,
    po_line_items: ((po.po_line_items as Array<Record<string, unknown>>) || []).map((item) => ({
      line_number: item.line_number as number,
      item_description: item.item_description as string,
      quantity: toNumber(item.quantity),
      unit_of_measure: item.unit_of_measure as string,
      unit_price: toNumber(item.unit_price),
      line_subtotal: toNumber(item.line_subtotal),
      is_taxable: item.is_taxable as boolean,
    })),
  };
}