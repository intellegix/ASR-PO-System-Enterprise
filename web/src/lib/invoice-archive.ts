/**
 * Invoice Archive Database Client
 * Connects to the SQLite invoice archive database for read-only access
 */

import Database from 'better-sqlite3';
import path from 'path';

// Path to the invoice archive database
const INVOICE_ARCHIVE_PATH = path.join(
  'C:',
  'Users',
  'AustinKidwell',
  'ASR Dropbox',
  'Austin Kidwell',
  '08_Financial_PayrollOperations',
  'Digital Billing Apps',
  'ASR Records APP 2.0',
  'ASR Records App',
  'invoice-archive-system',
  'data',
  'invoice_archive.db'
);

// Type definitions for the invoice archive
export interface ArchiveInvoice {
  id: string;
  invoice_number: string | null;
  document_type: string | null;
  vendor_id: string | null;
  project_id: string | null;
  subtotal: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  currency: string | null;
  invoice_date: string | null;
  due_date: string | null;
  payment_date: string | null;
  payment_status: 'PENDING' | 'PAID' | 'PARTIAL' | null;
  invoice_status: string | null;
  category: string | null;
  subcategory: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Joined fields
  vendor_name?: string;
  project_code?: string;
}

export interface ArchiveVendor {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  category: string | null;
  subcategory: string | null;
  is_active: boolean;
}

export interface ArchiveProject {
  id: string;
  code: string;
  name: string | null;
  client: string | null;
  status: string | null;
  contract_value: number | null;
}

export interface ArchiveInvoiceFile {
  id: string;
  invoice_id: string;
  original_filename: string;
  file_path: string;
  relative_path: string | null;
  file_extension: string | null;
  file_size: number | null;
  page_count: number | null;
}

export interface InvoiceSearchParams {
  search?: string;
  vendor_id?: string;
  project_id?: string;
  payment_status?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

/**
 * Get a read-only connection to the invoice archive database
 */
function getArchiveDb(): Database.Database {
  return new Database(INVOICE_ARCHIVE_PATH, { readonly: true });
}

/**
 * Search invoices in the archive
 */
export function searchInvoices(params: InvoiceSearchParams): ArchiveInvoice[] {
  const db = getArchiveDb();

  try {
    let query = `
      SELECT
        i.*,
        v.name as vendor_name,
        p.code as project_code
      FROM invoices i
      LEFT JOIN vendors v ON i.vendor_id = v.id
      LEFT JOIN projects p ON i.project_id = p.id
      WHERE 1=1
    `;
    const queryParams: (string | number)[] = [];

    if (params.search) {
      query += ` AND (i.invoice_number LIKE ? OR v.name LIKE ? OR i.notes LIKE ?)`;
      const searchTerm = `%${params.search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (params.vendor_id) {
      query += ` AND i.vendor_id = ?`;
      queryParams.push(params.vendor_id);
    }

    if (params.project_id) {
      query += ` AND i.project_id = ?`;
      queryParams.push(params.project_id);
    }

    if (params.payment_status) {
      query += ` AND i.payment_status = ?`;
      queryParams.push(params.payment_status);
    }

    if (params.date_from) {
      query += ` AND i.invoice_date >= ?`;
      queryParams.push(params.date_from);
    }

    if (params.date_to) {
      query += ` AND i.invoice_date <= ?`;
      queryParams.push(params.date_to);
    }

    query += ` ORDER BY i.invoice_date DESC, i.created_at DESC`;

    if (params.limit) {
      query += ` LIMIT ?`;
      queryParams.push(params.limit);
    }

    if (params.offset) {
      query += ` OFFSET ?`;
      queryParams.push(params.offset);
    }

    const stmt = db.prepare(query);
    return stmt.all(...queryParams) as ArchiveInvoice[];
  } finally {
    db.close();
  }
}

/**
 * Get a single invoice by ID
 */
export function getInvoiceById(id: string): ArchiveInvoice | null {
  const db = getArchiveDb();

  try {
    const stmt = db.prepare(`
      SELECT
        i.*,
        v.name as vendor_name,
        p.code as project_code
      FROM invoices i
      LEFT JOIN vendors v ON i.vendor_id = v.id
      LEFT JOIN projects p ON i.project_id = p.id
      WHERE i.id = ?
    `);
    return stmt.get(id) as ArchiveInvoice | null;
  } finally {
    db.close();
  }
}

/**
 * Get files associated with an invoice
 */
export function getInvoiceFiles(invoiceId: string): ArchiveInvoiceFile[] {
  const db = getArchiveDb();

  try {
    const stmt = db.prepare(`
      SELECT * FROM invoice_files
      WHERE invoice_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(invoiceId) as ArchiveInvoiceFile[];
  } finally {
    db.close();
  }
}

/**
 * Get all vendors from the archive
 */
export function getArchiveVendors(): ArchiveVendor[] {
  const db = getArchiveDb();

  try {
    const stmt = db.prepare(`
      SELECT * FROM vendors
      WHERE is_active = 1 OR is_active IS NULL
      ORDER BY name ASC
    `);
    return stmt.all() as ArchiveVendor[];
  } finally {
    db.close();
  }
}

/**
 * Get all projects from the archive
 */
export function getArchiveProjects(): ArchiveProject[] {
  const db = getArchiveDb();

  try {
    const stmt = db.prepare(`
      SELECT * FROM projects
      ORDER BY code ASC
    `);
    return stmt.all() as ArchiveProject[];
  } finally {
    db.close();
  }
}

/**
 * Get invoice statistics
 */
export function getInvoiceStats(): {
  total_invoices: number;
  total_amount: number;
  paid_count: number;
  pending_count: number;
  vendor_count: number;
} {
  const db = getArchiveDb();

  try {
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_invoices,
        COALESCE(SUM(total_amount), 0) as total_amount,
        SUM(CASE WHEN payment_status = 'PAID' THEN 1 ELSE 0 END) as paid_count,
        SUM(CASE WHEN payment_status = 'PENDING' OR payment_status IS NULL THEN 1 ELSE 0 END) as pending_count
      FROM invoices
    `).get() as { total_invoices: number; total_amount: number; paid_count: number; pending_count: number };

    const vendorCount = db.prepare(`SELECT COUNT(*) as cnt FROM vendors`).get() as { cnt: number };

    return {
      ...stats,
      vendor_count: vendorCount.cnt,
    };
  } finally {
    db.close();
  }
}

/**
 * Search for invoices that might match a PO
 */
export function findMatchingInvoices(
  vendorName: string,
  amount: number,
  tolerance: number = 0.05
): ArchiveInvoice[] {
  const db = getArchiveDb();

  try {
    const minAmount = amount * (1 - tolerance);
    const maxAmount = amount * (1 + tolerance);

    const stmt = db.prepare(`
      SELECT
        i.*,
        v.name as vendor_name,
        p.code as project_code
      FROM invoices i
      LEFT JOIN vendors v ON i.vendor_id = v.id
      LEFT JOIN projects p ON i.project_id = p.id
      WHERE v.name LIKE ?
        AND i.total_amount BETWEEN ? AND ?
      ORDER BY i.invoice_date DESC
      LIMIT 10
    `);

    return stmt.all(`%${vendorName}%`, minAmount, maxAmount) as ArchiveInvoice[];
  } finally {
    db.close();
  }
}
