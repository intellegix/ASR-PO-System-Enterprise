/**
 * Smart PO Number Generator
 *
 * Format: [LeaderID][DivisionCode][WO#]-[PurchaseSeq][SupplierLast4]
 * Example: 01CP2345-1bn23
 *
 * Components:
 * - 01 = Who (Division Leader ID: 01, 02, 03, 04, or OM for Operations Manager)
 * - CP = Division type (CP=CAPEX, RF=Roofing, GC=GenContracting, SM=SubsMgmt, RP=Repairs)
 * - 2345 = Work Order number (4 digits)
 * - -1 = Purchase number within the WO (sequence, starts at 1)
 * - bn23 = Last 4 characters of supplier confirmation number
 */

// Division codes mapping
export const DIVISION_CODES: Record<string, string> = {
  'CAPEX': 'CP',
  'Roofing': 'RF',
  'General Contracting': 'GC',
  'Subcontractor Management': 'SM',
  'Repairs': 'RP',
  'Specialty Trades': 'ST',
};

// Leader ID mapping (from division_code in database)
export const LEADER_ID_MAP: Record<string, string> = {
  'O1': '01', // Owner 1 - CAPEX
  'O2': '02', // Owner 2 - Repairs
  'O3': '03', // Owner 3 - Roofing
  'O4': '04', // Owner 4 - General Contracting
  'O5': '05', // Owner 5 - Subcontractor Management
  'O6': '06', // Owner 6 - Specialty Trades
};

interface PONumberComponents {
  leaderId: string;        // e.g., "01", "02", "OM"
  divisionCode: string;    // e.g., "CP", "RF", "GC"
  workOrderNumber: number; // e.g., 2345
  purchaseSequence: number; // e.g., 1, 2, 3 (POs within same WO)
  supplierConfirmLast4: string; // e.g., "bn23"
}

/**
 * Generate a smart PO number
 * @returns PO number string like "01CP2345-1bn23"
 */
export function generatePONumber(components: PONumberComponents): string {
  const {
    leaderId,
    divisionCode,
    workOrderNumber,
    purchaseSequence,
    supplierConfirmLast4,
  } = components;

  // Format work order number as 4 digits (zero-padded)
  const woNum = String(workOrderNumber).padStart(4, '0');

  // Ensure supplier confirm is exactly 4 chars (lowercase)
  const supplierCode = supplierConfirmLast4.toLowerCase().slice(-4).padStart(4, 'x');

  return `${leaderId}${divisionCode}${woNum}-${purchaseSequence}${supplierCode}`;
}

/**
 * Parse a PO number into its components
 * @param poNumber e.g., "01CP2345-1bn23"
 */
export function parsePONumber(poNumber: string): PONumberComponents | null {
  // Regex: (leaderId)(divCode)(woNum)-(purchaseSeq)(supplierLast4)
  // Example: 01CP2345-1bn23
  const regex = /^(\d{2}|OM)([A-Z]{2})(\d{4})-(\d+)([a-z0-9]{4})$/i;
  const match = poNumber.match(regex);

  if (!match) {
    return null;
  }

  return {
    leaderId: match[1].toUpperCase(),
    divisionCode: match[2].toUpperCase(),
    workOrderNumber: parseInt(match[3], 10),
    purchaseSequence: parseInt(match[4], 10),
    supplierConfirmLast4: match[5].toLowerCase(),
  };
}

/**
 * Get division code from division name
 */
export function getDivisionCode(divisionName: string): string {
  return DIVISION_CODES[divisionName] || 'XX';
}

/**
 * Get leader ID from division leader code (O1, O2, etc.)
 */
export function getLeaderIdFromCode(leaderCode: string): string {
  return LEADER_ID_MAP[leaderCode] || '00';
}

/**
 * Generate a supplier confirmation code (last 4 chars)
 * In production, this would come from the vendor's confirmation number
 * For now, generate from vendor code + timestamp
 */
export function generateSupplierConfirmCode(vendorCode: string, timestamp?: Date): string {
  const date = timestamp || new Date();
  const timeComponent = date.getTime().toString(36).slice(-2);
  const vendorComponent = vendorCode.toLowerCase().slice(0, 2);
  return (vendorComponent + timeComponent).slice(-4).padStart(4, '0');
}

/**
 * Decode a PO number to human-readable description
 */
export function decodePONumber(poNumber: string): string | null {
  const parsed = parsePONumber(poNumber);
  if (!parsed) return null;

  const divisionNames: Record<string, string> = {
    'CP': 'CAPEX',
    'RF': 'Roofing',
    'GC': 'General Contracting',
    'SM': 'Subcontractor Management',
    'RP': 'Repairs',
    'ST': 'Specialty Trades',
  };

  const leaderNames: Record<string, string> = {
    '01': 'Owner 1 (CAPEX)',
    '02': 'Owner 2 (Repairs)',
    '03': 'Owner 3 (Roofing)',
    '04': 'Owner 4 (General Contracting)',
    '05': 'Owner 5 (Subcontractor Management)',
    '06': 'Owner 6 (Specialty Trades)',
  };

  const division = divisionNames[parsed.divisionCode] || 'Unknown Division';
  const leader = leaderNames[parsed.leaderId] || 'Unknown Leader';

  return `${leader} | ${division} | WO-${parsed.workOrderNumber} | Purchase #${parsed.purchaseSequence} | Supplier: ...${parsed.supplierConfirmLast4}`;
}

/**
 * Validate a PO number format
 */
export function isValidPONumber(poNumber: string): boolean {
  return parsePONumber(poNumber) !== null;
}

// Example usage:
// const poNum = generatePONumber({
//   leaderId: '01',
//   divisionCode: 'CP',
//   workOrderNumber: 2345,
//   purchaseSequence: 1,
//   supplierConfirmLast4: 'bn23',
// });
// console.log(poNum); // "01CP2345-1bn23"
// console.log(decodePONumber(poNum));
// "Owner 1 (CAPEX) | CAPEX | WO-2345 | Purchase #1 | Supplier: ...bn23"
