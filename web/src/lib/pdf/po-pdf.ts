import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface LineItem {
  line_number: number;
  item_description: string;
  quantity: number | string;
  unit_of_measure: string;
  unit_price: number | string;
  line_subtotal: number | string;
  is_taxable: boolean;
}

interface POData {
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
  vendors: {
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
  } | null;
  projects: {
    project_code: string;
    project_name: string;
    property_address: string | null;
  } | null;
  divisions: {
    division_name: string;
    division_code: string;
  } | null;
  work_orders: {
    work_order_number: string;
    title: string;
  } | null;
  users_po_headers_requested_by_idTousers: {
    name: string;
    email: string;
  } | null;
  users_po_headers_approved_by_idTousers: {
    name: string;
  } | null;
  po_line_items: LineItem[];
}

// Company info
const COMPANY = {
  name: 'All Surface Roofing & Waterproofing, Inc.',
  address1: '1234 Construction Way',
  address2: 'Los Angeles, CA 90001',
  phone: '(555) 123-4567',
  email: 'purchasing@allsurfaceroofing.com',
};

export function generatePOPdf(po: POData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 15;

  // Helper functions
  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // ===== HEADER =====
  // Company name
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY.name, 14, yPos);

  // PO Label (right side)
  doc.setFontSize(24);
  doc.setTextColor(220, 90, 30); // Orange color
  doc.text('PURCHASE ORDER', pageWidth - 14, yPos, { align: 'right' });

  yPos += 6;

  // Company address
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(COMPANY.address1, 14, yPos);
  yPos += 4;
  doc.text(COMPANY.address2, 14, yPos);
  yPos += 4;
  doc.text(`Phone: ${COMPANY.phone}`, 14, yPos);

  // PO Number (right side, large)
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(po.po_number, pageWidth - 14, yPos - 4, { align: 'right' });

  yPos += 10;

  // Divider line
  doc.setDrawColor(220, 90, 30);
  doc.setLineWidth(0.5);
  doc.line(14, yPos, pageWidth - 14, yPos);

  yPos += 10;

  // ===== INFO SECTION =====
  // Left column: Vendor info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('VENDOR', 14, yPos);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  yPos += 5;

  if (po.vendors) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(po.vendors.vendor_name, 14, yPos);
    yPos += 5;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (po.vendors.address_line1) {
      doc.text(po.vendors.address_line1, 14, yPos);
      yPos += 4;
    }
    if (po.vendors.city && po.vendors.state) {
      doc.text(`${po.vendors.city}, ${po.vendors.state} ${po.vendors.zip || ''}`, 14, yPos);
      yPos += 4;
    }
    if (po.vendors.contact_name) {
      doc.text(`Attn: ${po.vendors.contact_name}`, 14, yPos);
      yPos += 4;
    }
    if (po.vendors.contact_phone) {
      doc.text(`Phone: ${po.vendors.contact_phone}`, 14, yPos);
      yPos += 4;
    }
  }

  // Right column: PO Details
  const rightColX = pageWidth / 2 + 10;
  let rightYPos = yPos - 22;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('PO DETAILS', rightColX, rightYPos);

  rightYPos += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  const details = [
    ['Date:', formatDate(po.created_at)],
    ['Status:', po.status],
    ['Terms:', po.terms_code || 'Net 30'],
    ['Required By:', formatDate(po.required_by_date)],
    ['Division:', po.divisions?.division_name || '-'],
    ['Cost Center:', po.cost_center_code || '-'],
  ];

  details.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, rightColX, rightYPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, rightColX + 30, rightYPos);
    rightYPos += 4;
  });

  yPos = Math.max(yPos, rightYPos) + 5;

  // ===== PROJECT INFO =====
  if (po.projects) {
    doc.setFillColor(245, 245, 245);
    doc.rect(14, yPos, pageWidth - 28, 18, 'F');

    yPos += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('PROJECT', 18, yPos);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`${po.projects.project_code} - ${po.projects.project_name}`, 50, yPos);

    if (po.work_orders) {
      yPos += 5;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text('WORK ORDER', 18, yPos);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(`${po.work_orders.work_order_number} - ${po.work_orders.title}`, 50, yPos);
    }

    yPos += 10;
  }

  yPos += 5;

  // ===== LINE ITEMS TABLE =====
  const tableData = po.po_line_items.map((item) => [
    item.line_number.toString(),
    item.item_description,
    `${item.quantity} ${item.unit_of_measure}`,
    formatCurrency(item.unit_price),
    formatCurrency(item.line_subtotal),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Description', 'Qty', 'Unit Price', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [220, 90, 30],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  // Get Y position after table
  yPos = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || yPos + 50;
  yPos += 5;

  // ===== TOTALS =====
  const totalsX = pageWidth - 70;
  const totalsValueX = pageWidth - 14;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', totalsX, yPos);
  doc.text(formatCurrency(po.subtotal_amount), totalsValueX, yPos, { align: 'right' });

  yPos += 5;
  const taxRate = typeof po.tax_rate === 'string' ? parseFloat(po.tax_rate) : po.tax_rate;
  doc.text(`Tax (${(taxRate * 100).toFixed(2)}%):`, totalsX, yPos);
  doc.text(formatCurrency(po.tax_amount), totalsValueX, yPos, { align: 'right' });

  yPos += 6;
  doc.setLineWidth(0.3);
  doc.line(totalsX, yPos - 2, totalsValueX, yPos - 2);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', totalsX, yPos + 2);
  doc.setTextColor(220, 90, 30);
  doc.text(formatCurrency(po.total_amount), totalsValueX, yPos + 2, { align: 'right' });

  yPos += 15;

  // ===== NOTES =====
  if (po.notes_vendor) {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', 14, yPos);

    yPos += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    // Word wrap notes
    const splitNotes = doc.splitTextToSize(po.notes_vendor, pageWidth - 28);
    doc.text(splitNotes, 14, yPos);
    yPos += splitNotes.length * 4 + 5;
  }

  // ===== FOOTER =====
  yPos += 10;

  // Terms and conditions
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  const terms = [
    'Terms & Conditions:',
    '1. All items must be delivered to the project address unless otherwise specified.',
    '2. Invoice must reference this PO number for payment processing.',
    '3. Any changes to this order require written approval from the purchaser.',
  ];

  terms.forEach((term, i) => {
    doc.text(term, 14, yPos + i * 4);
  });

  // Approval signatures (if approved)
  if (po.approved_at && po.users_po_headers_approved_by_idTousers) {
    yPos += 25;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, yPos, 80, yPos);
    doc.line(pageWidth - 80, yPos, pageWidth - 14, yPos);

    yPos += 4;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Requested By', 14, yPos);
    doc.text('Approved By', pageWidth - 80, yPos);

    yPos += 4;
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(po.users_po_headers_requested_by_idTousers?.name || '-', 14, yPos);
    doc.text(po.users_po_headers_approved_by_idTousers.name, pageWidth - 80, yPos);

    yPos += 4;
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(formatDate(po.created_at), 14, yPos);
    doc.text(formatDate(po.approved_at), pageWidth - 80, yPos);
  }

  // Page number
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  return doc;
}

export function generatePOPdfBuffer(po: POData): Buffer {
  const doc = generatePOPdf(po);
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
