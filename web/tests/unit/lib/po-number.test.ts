/**
 * Test Suite for PO Number Generation Logic
 * Covers both v2 (new, no supplier suffix) and v1 (legacy, with supplier suffix) formats.
 */

import {
  generatePONumber,
  parsePONumber,
  getDivisionCode,
  getLeaderIdFromCode,
  generateSupplierConfirmCode,
  decodePONumber,
  isValidPONumber,
  DIVISION_CODES,
  LEADER_ID_MAP,
} from '@/lib/po-number';

describe('PO Number Generation Logic', () => {

  // ============================================
  // GENERATE PO NUMBER TESTS (v2 format)
  // ============================================

  describe('generatePONumber', () => {
    test('should generate valid v2 PO number', () => {
      const result = generatePONumber({
        leaderId: '01',
        divisionCode: 'CP',
        workOrderNumber: 12,
        purchaseSequence: 1,
      });
      expect(result).toBe('01CP0012-1');
    });

    test('should zero-pad work order numbers', () => {
      const result = generatePONumber({
        leaderId: '02',
        divisionCode: 'RF',
        workOrderNumber: 1,
        purchaseSequence: 5,
      });
      expect(result).toBe('02RF0001-5');
    });

    test('should handle large work order numbers', () => {
      const result = generatePONumber({
        leaderId: '03',
        divisionCode: 'SW',
        workOrderNumber: 9999,
        purchaseSequence: 99,
      });
      expect(result).toBe('03SW9999-99');
    });

    test('should handle 3-char division codes (CD1, CD2)', () => {
      const result = generatePONumber({
        leaderId: '04',
        divisionCode: 'CD1',
        workOrderNumber: 42,
        purchaseSequence: 1,
      });
      expect(result).toBe('04CD10042-1');
    });

    test('should handle Operations Manager leader ID', () => {
      const result = generatePONumber({
        leaderId: 'OM',
        divisionCode: 'CP',
        workOrderNumber: 7890,
        purchaseSequence: 2,
      });
      expect(result).toBe('OMCP7890-2');
    });

    test('should handle zero work order number', () => {
      const result = generatePONumber({
        leaderId: '01',
        divisionCode: 'CP',
        workOrderNumber: 0,
        purchaseSequence: 1,
      });
      expect(result).toBe('01CP0000-1');
    });
  });

  // ============================================
  // PARSE PO NUMBER TESTS (both v1 and v2)
  // ============================================

  describe('parsePONumber', () => {
    test('should parse v2 format (no supplier suffix)', () => {
      const result = parsePONumber('01CP0012-1');
      expect(result).toEqual({
        leaderId: '01',
        divisionCode: 'CP',
        workOrderNumber: 12,
        purchaseSequence: 1,
      });
    });

    test('should parse v2 format with 3-char division code', () => {
      const result = parsePONumber('04CD10042-1');
      expect(result).toEqual({
        leaderId: '04',
        divisionCode: 'CD1',
        workOrderNumber: 42,
        purchaseSequence: 1,
      });
    });

    test('should parse v1 format (legacy, with supplier suffix)', () => {
      const result = parsePONumber('01CP2345-1bn23');
      expect(result).toEqual({
        leaderId: '01',
        divisionCode: 'CP',
        workOrderNumber: 2345,
        purchaseSequence: 1,
      });
    });

    test('should parse v1 format with OM leader', () => {
      const result = parsePONumber('OMRF9999-99abcd');
      expect(result).toEqual({
        leaderId: 'OM',
        divisionCode: 'RF',
        workOrderNumber: 9999,
        purchaseSequence: 99,
      });
    });

    test('should parse v2 format with OM leader', () => {
      const result = parsePONumber('OMRF9999-99');
      expect(result).toEqual({
        leaderId: 'OM',
        divisionCode: 'RF',
        workOrderNumber: 9999,
        purchaseSequence: 99,
      });
    });

    test('should return null for invalid PO number format', () => {
      const invalidNumbers = [
        'invalid',
        '1CP2345-1',       // Invalid leader ID (too short)
        '001CP2345-1',     // Invalid leader ID (too long)
        '01C234-1',        // Invalid division code (too short) + WO
        '01CP234-1',       // WO too short (3 digits)
        '01CP12345-1',     // WO too long (5 digits)
        '01CP2345_1',      // Wrong separator
        '',
      ];

      invalidNumbers.forEach((invalidNumber) => {
        expect(parsePONumber(invalidNumber)).toBeNull();
      });
    });

    test('should handle large purchase sequence numbers', () => {
      const result = parsePONumber('01CP1234-999');
      expect(result?.purchaseSequence).toBe(999);
    });
  });

  // ============================================
  // DIVISION CODE TESTS
  // ============================================

  describe('getDivisionCode', () => {
    test('should return correct codes for all division names', () => {
      expect(getDivisionCode('CAPEX')).toBe('CP');
      expect(getDivisionCode('Roofing')).toBe('RF');
      expect(getDivisionCode('Service Work')).toBe('SW');
      expect(getDivisionCode('Construction Division 1')).toBe('CD1');
      expect(getDivisionCode('Construction Division 2')).toBe('CD2');
    });

    test('should return XX for unknown division name', () => {
      expect(getDivisionCode('Unknown Division')).toBe('XX');
      expect(getDivisionCode('')).toBe('XX');
    });
  });

  // ============================================
  // LEADER ID TESTS
  // ============================================

  describe('getLeaderIdFromCode', () => {
    test('should return correct leader IDs for all codes', () => {
      expect(getLeaderIdFromCode('O1')).toBe('01');
      expect(getLeaderIdFromCode('O2')).toBe('02');
      expect(getLeaderIdFromCode('O3')).toBe('03');
      expect(getLeaderIdFromCode('O4')).toBe('04');
      expect(getLeaderIdFromCode('O5')).toBe('05');
    });

    test('should return 00 for unknown leader code', () => {
      expect(getLeaderIdFromCode('O7')).toBe('00');
      expect(getLeaderIdFromCode('')).toBe('00');
    });
  });

  // ============================================
  // SUPPLIER CONFIRMATION CODE TESTS (deprecated, but still tested)
  // ============================================

  describe('generateSupplierConfirmCode', () => {
    test('should generate 4-character code', () => {
      const result = generateSupplierConfirmCode('ABC', new Date('2024-01-01T00:00:00Z'));
      expect(result).toHaveLength(4);
      expect(result).toMatch(/^[a-z0-9]{4}$/);
    });

    test('should generate different codes for different timestamps', () => {
      const result1 = generateSupplierConfirmCode('ABC', new Date('2024-01-01T00:00:00Z'));
      const result2 = generateSupplierConfirmCode('ABC', new Date('2024-01-02T00:00:00Z'));
      expect(result1).not.toBe(result2);
    });
  });

  // ============================================
  // DECODE PO NUMBER TESTS
  // ============================================

  describe('decodePONumber', () => {
    test('should decode v2 PO number', () => {
      const result = decodePONumber('01CP0012-1');
      expect(result).toBe('Owner 1 (CAPEX) | CAPEX | WO-12 | Purchase #1');
    });

    test('should decode v1 PO number (legacy)', () => {
      const result = decodePONumber('01CP2345-1bn23');
      expect(result).toBe('Owner 1 (CAPEX) | CAPEX | WO-2345 | Purchase #1');
    });

    test('should return null for invalid PO number', () => {
      expect(decodePONumber('invalid-po-number')).toBeNull();
    });

    test('should handle unknown leader IDs', () => {
      const result = decodePONumber('99CP1234-1');
      expect(result).toContain('Unknown Leader');
    });
  });

  // ============================================
  // VALIDATION TESTS
  // ============================================

  describe('isValidPONumber', () => {
    test('should return true for valid v2 PO numbers', () => {
      expect(isValidPONumber('01CP0012-1')).toBe(true);
      expect(isValidPONumber('04CD10042-1')).toBe(true);
      expect(isValidPONumber('OMRF9999-99')).toBe(true);
    });

    test('should return true for valid v1 PO numbers (legacy)', () => {
      expect(isValidPONumber('01CP2345-1bn23')).toBe(true);
      expect(isValidPONumber('OMRF9999-99abcd')).toBe(true);
    });

    test('should return false for invalid PO numbers', () => {
      expect(isValidPONumber('invalid')).toBe(false);
      expect(isValidPONumber('')).toBe(false);
    });
  });

  // ============================================
  // CONSTANTS VALIDATION TESTS
  // ============================================

  describe('Constants Validation', () => {
    test('DIVISION_CODES should contain all expected divisions', () => {
      const expectedDivisions = ['CAPEX', 'Service Work', 'Roofing', 'Construction Division 1', 'Construction Division 2'];
      expectedDivisions.forEach((division) => {
        expect(DIVISION_CODES[division]).toBeDefined();
      });
    });

    test('LEADER_ID_MAP should contain all expected leader codes', () => {
      const expectedCodes = ['O1', 'O2', 'O3', 'O4', 'O5'];
      expectedCodes.forEach((code) => {
        expect(LEADER_ID_MAP[code]).toBeDefined();
        expect(LEADER_ID_MAP[code]).toMatch(/^\d{2}$/);
      });
    });

    test('Division codes should be unique', () => {
      const codes = Object.values(DIVISION_CODES);
      const uniqueCodes = [...new Set(codes)];
      expect(codes).toHaveLength(uniqueCodes.length);
    });

    test('Leader IDs should be unique', () => {
      const ids = Object.values(LEADER_ID_MAP);
      const uniqueIds = [...new Set(ids)];
      expect(ids).toHaveLength(uniqueIds.length);
    });
  });

  // ============================================
  // INTEGRATION TESTS
  // ============================================

  describe('Integration Tests', () => {
    test('should round-trip generate and parse correctly (v2)', () => {
      const original = {
        leaderId: '02',
        divisionCode: 'RF',
        workOrderNumber: 1234,
        purchaseSequence: 5,
      };
      const poNumber = generatePONumber(original);
      const parsed = parsePONumber(poNumber);
      expect(parsed).toEqual(original);
    });

    test('should work with all leader and division combinations', () => {
      const leaderIds = ['01', '02', '03', '04', '05', 'OM'];
      const divisionCodes = ['CP', 'RF', 'SW', 'CD1', 'CD2'];

      leaderIds.forEach((leaderId) => {
        divisionCodes.forEach((divisionCode) => {
          const components = {
            leaderId,
            divisionCode,
            workOrderNumber: 1234,
            purchaseSequence: 1,
          };
          const poNumber = generatePONumber(components);
          const parsed = parsePONumber(poNumber);
          expect(parsed).toEqual(components);
          expect(isValidPONumber(poNumber)).toBe(true);
        });
      });
    });
  });

  // ============================================
  // PERFORMANCE TESTS
  // ============================================

  describe('Performance Tests', () => {
    test('should generate PO numbers efficiently', () => {
      const components = {
        leaderId: '01',
        divisionCode: 'CP',
        workOrderNumber: 1234,
        purchaseSequence: 1,
      };
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        generatePONumber({ ...components, purchaseSequence: i + 1 });
      }
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100);
    });

    test('should parse PO numbers efficiently', () => {
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        parsePONumber('01CP1234-1');
      }
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100);
    });
  });
});
