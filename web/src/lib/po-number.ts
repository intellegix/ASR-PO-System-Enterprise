/**
 * Smart PO Number Generator
 *
 * NEW Format (v2): [LeaderID][DivisionCode][WO#]-[PurchaseSeq]
 * Example: 01CP0012-1
 *
 * OLD Format (v1): [LeaderID][DivisionCode][WO#]-[PurchaseSeq][SupplierLast4]
 * Example: 01CP2345-1bn23
 *
 * Components:
 * - 01 = Who (Division Leader ID: 01, 02, 03, 04, 05, or OM for Operations Manager)
 * - CP = Division type (CP=CAPEX, RF=Roofing, SW=ServiceWork, CD1=Construction1, CD2=Construction2)
 * - 0012 = Work Order number (4 digits)
 * - -1 = Purchase number within the WO (sequence, starts at 1)
 */

// Division codes mapping
export const DIVISION_CODES: Record<string, string> = {
  'CAPEX': 'CP',
  'Service Work': 'SW',
  'Roofing': 'RF',
  'Construction Division 1': 'CD1',
  'Construction Division 2': 'CD2',
};

// Leader ID mapping (from division_code in database)
export const LEADER_ID_MAP: Record<string, string> = {
  'O1': '01', // Owner 1 - CAPEX
  'O2': '02', // Owner 2 - Service Work
  'O3': '03', // Owner 3 - Roofing
  'O4': '04', // Owner 4 - Construction Division 1
  'O5': '05', // Owner 5 - Construction Division 2
};

interface PONumberComponents {
  leaderId: string;        // e.g., "01", "02", "OM"
  divisionCode: string;    // e.g., "CP", "RF", "CD1"
  workOrderNumber: number; // e.g., 12
  purchaseSequence: number; // e.g., 1, 2, 3 (POs within same WO)
}

/** @deprecated Use PONumberComponents (without supplier) for new POs */
interface LegacyPONumberComponents extends PONumberComponents {
  supplierConfirmLast4: string; // e.g., "bn23"
}

/**
 * Generate a smart PO number (v2 format, no vendor suffix)
 * @returns PO number string like "01CP0012-1"
 */
export function generatePONumber(components: PONumberComponents): string {
  const { leaderId, divisionCode, workOrderNumber, purchaseSequence } = components;
  const woNum = String(workOrderNumber).padStart(4, '0');
  return `${leaderId}${divisionCode}${woNum}-${purchaseSequence}`;
}

/**
 * Parse a PO number into its components.
 * Handles BOTH v2 (new: no supplier suffix) and v1 (old: with supplier suffix).
 */
export function parsePONumber(poNumber: string): PONumberComponents | null {
  // v2 format: (leaderId)(divCode 2-3 chars)(woNum 4 digits)-(purchaseSeq)
  const v2Regex = /^(\d{2}|OM)([A-Z]{2,3})(\d{4})-(\d+)$/i;
  const v2Match = poNumber.match(v2Regex);
  if (v2Match) {
    return {
      leaderId: v2Match[1].toUpperCase(),
      divisionCode: v2Match[2].toUpperCase(),
      workOrderNumber: parseInt(v2Match[3], 10),
      purchaseSequence: parseInt(v2Match[4], 10),
    };
  }

  // v1 format: (leaderId)(divCode 2 chars)(woNum 4 digits)-(purchaseSeq)(supplierLast4)
  const v1Regex = /^(\d{2}|OM)([A-Z]{2})(\d{4})-(\d+)([a-z0-9]{4})$/i;
  const v1Match = poNumber.match(v1Regex);
  if (v1Match) {
    return {
      leaderId: v1Match[1].toUpperCase(),
      divisionCode: v1Match[2].toUpperCase(),
      workOrderNumber: parseInt(v1Match[3], 10),
      purchaseSequence: parseInt(v1Match[4], 10),
    };
  }

  return null;
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
 * @deprecated Vendor suffix no longer used in PO numbers.
 * Kept for backward compatibility with existing POs.
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
    'SW': 'Service Work',
    'RF': 'Roofing',
    'CD1': 'Construction Division 1',
    'CD2': 'Construction Division 2',
  };

  const leaderNames: Record<string, string> = {
    '01': 'Owner 1 (CAPEX)',
    '02': 'Owner 2 (Service Work)',
    '03': 'Owner 3 (Roofing)',
    '04': 'Owner 4 (Construction Division 1)',
    '05': 'Owner 5 (Construction Division 2)',
  };

  const division = divisionNames[parsed.divisionCode] || 'Unknown Division';
  const leader = leaderNames[parsed.leaderId] || 'Unknown Leader';

  return `${leader} | ${division} | WO-${parsed.workOrderNumber} | Purchase #${parsed.purchaseSequence}`;
}

/**
 * Validate a PO number format (accepts both v1 and v2)
 */
export function isValidPONumber(poNumber: string): boolean {
  return parsePONumber(poNumber) !== null;
}
