/**
 * Comprehensive Test Suite for PO Number Generation Logic
 * Enterprise-grade testing with >95% coverage requirement
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
  // GENERATE PO NUMBER TESTS
  // ============================================

  describe('generatePONumber', () => {
    test('should generate valid PO number with all components', () => {
      const components = {
        leaderId: '01',
        divisionCode: 'CP',
        workOrderNumber: 2345,
        purchaseSequence: 1,
        supplierConfirmLast4: 'bn23',
      };

      const result = generatePONumber(components);
      expect(result).toBe('01CP2345-1bn23');
    });

    test('should handle zero-padded work order numbers', () => {
      const components = {
        leaderId: '02',
        divisionCode: 'RF',
        workOrderNumber: 1,
        purchaseSequence: 5,
        supplierConfirmLast4: 'ab12',
      };

      const result = generatePONumber(components);
      expect(result).toBe('02RF0001-5ab12');
    });

    test('should handle large work order numbers', () => {
      const components = {
        leaderId: '03',
        divisionCode: 'GC',
        workOrderNumber: 9999,
        purchaseSequence: 99,
        supplierConfirmLast4: 'xyza',
      };

      const result = generatePONumber(components);
      expect(result).toBe('03GC9999-99xyza');
    });

    test('should pad supplier confirm code if too short', () => {
      const components = {
        leaderId: '04',
        divisionCode: 'SM',
        workOrderNumber: 1234,
        purchaseSequence: 1,
        supplierConfirmLast4: 'a',
      };

      const result = generatePONumber(components);
      expect(result).toBe('04SM1234-1xxxa');
    });

    test('should truncate supplier confirm code if too long', () => {
      const components = {
        leaderId: '05',
        divisionCode: 'RP',
        workOrderNumber: 5678,
        purchaseSequence: 3,
        supplierConfirmLast4: 'verylongcode',
      };

      const result = generatePONumber(components);
      expect(result).toBe('05RP5678-3code');
    });

    test('should convert supplier code to lowercase', () => {
      const components = {
        leaderId: '01',
        divisionCode: 'CP',
        workOrderNumber: 1000,
        purchaseSequence: 1,
        supplierConfirmLast4: 'ABCD',
      };

      const result = generatePONumber(components);
      expect(result).toBe('01CP1000-1abcd');
    });

    test('should handle Operations Manager leader ID', () => {
      const components = {
        leaderId: 'OM',
        divisionCode: 'ST',
        workOrderNumber: 7890,
        purchaseSequence: 2,
        supplierConfirmLast4: 'test',
      };

      const result = generatePONumber(components);
      expect(result).toBe('OMST7890-2test');
    });

    test('should handle edge case with zero work order number', () => {
      const components = {
        leaderId: '01',
        divisionCode: 'CP',
        workOrderNumber: 0,
        purchaseSequence: 1,
        supplierConfirmLast4: 'zero',
      };

      const result = generatePONumber(components);
      expect(result).toBe('01CP0000-1zero');
    });
  });

  // ============================================
  // PARSE PO NUMBER TESTS
  // ============================================

  describe('parsePONumber', () => {
    test('should parse valid PO number correctly', () => {
      const poNumber = '01CP2345-1bn23';
      const result = parsePONumber(poNumber);

      expect(result).toEqual({
        leaderId: '01',
        divisionCode: 'CP',
        workOrderNumber: 2345,
        purchaseSequence: 1,
        supplierConfirmLast4: 'bn23',
      });
    });

    test('should parse PO number with Operations Manager', () => {
      const poNumber = 'OMRF9999-99abcd';
      const result = parsePONumber(poNumber);

      expect(result).toEqual({
        leaderId: 'OM',
        divisionCode: 'RF',
        workOrderNumber: 9999,
        purchaseSequence: 99,
        supplierConfirmLast4: 'abcd',
      });
    });

    test('should handle zero-padded work orders', () => {
      const poNumber = '02GC0001-5test';
      const result = parsePONumber(poNumber);

      expect(result).toEqual({
        leaderId: '02',
        divisionCode: 'GC',
        workOrderNumber: 1,
        purchaseSequence: 5,
        supplierConfirmLast4: 'test',
      });
    });

    test('should convert leader ID to uppercase', () => {
      const poNumber = '03sm1234-1abcd';
      const result = parsePONumber(poNumber);

      expect(result?.leaderId).toBe('03');
      expect(result?.divisionCode).toBe('SM');
    });

    test('should convert supplier code to lowercase', () => {
      const poNumber = '04RP5678-2ABCD';
      const result = parsePONumber(poNumber);

      expect(result?.supplierConfirmLast4).toBe('abcd');
    });

    test('should return null for invalid PO number format', () => {
      const invalidNumbers = [
        'invalid',
        '1CP2345-1bn23', // Invalid leader ID (too short)
        '001CP2345-1bn23', // Invalid leader ID (too long)
        '01C2345-1bn23', // Invalid division code (too short)
        '01CPPP2345-1bn23', // Invalid division code (too long)
        '01CP234-1bn23', // Invalid work order (too short)
        '01CP12345-1bn23', // Invalid work order (too long)
        '01CP2345-bn23', // Missing purchase sequence
        '01CP2345-1bn2', // Invalid supplier code (too short)
        '01CP2345-1bn234', // Invalid supplier code (too long)
        '01CP2345_1bn23', // Wrong separator
        '01CP2345', // Missing purchase sequence and supplier code
      ];

      invalidNumbers.forEach((invalidNumber) => {
        const result = parsePONumber(invalidNumber);
        expect(result).toBeNull();
      });
    });

    test('should handle alphanumeric supplier codes', () => {
      const poNumber = '01CP1234-1a1b2';
      const result = parsePONumber(poNumber);

      expect(result?.supplierConfirmLast4).toBe('a1b2');
    });

    test('should handle large purchase sequence numbers', () => {
      const poNumber = '01CP1234-999test';
      const result = parsePONumber(poNumber);

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
      expect(getDivisionCode('General Contracting')).toBe('GC');
      expect(getDivisionCode('Subcontractor Management')).toBe('SM');
      expect(getDivisionCode('Repairs')).toBe('RP');
      expect(getDivisionCode('Specialty Trades')).toBe('ST');
    });

    test('should return XX for unknown division name', () => {
      expect(getDivisionCode('Unknown Division')).toBe('XX');
      expect(getDivisionCode('')).toBe('XX');
      expect(getDivisionCode('Invalid')).toBe('XX');
    });

    test('should be case sensitive', () => {
      expect(getDivisionCode('capex')).toBe('XX');
      expect(getDivisionCode('ROOFING')).toBe('XX');
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
      expect(getLeaderIdFromCode('O6')).toBe('06');
    });

    test('should return 00 for unknown leader code', () => {
      expect(getLeaderIdFromCode('O7')).toBe('00');
      expect(getLeaderIdFromCode('')).toBe('00');
      expect(getLeaderIdFromCode('Invalid')).toBe('00');
    });

    test('should be case sensitive', () => {
      expect(getLeaderIdFromCode('o1')).toBe('00');
      expect(getLeaderIdFromCode('O1 ')).toBe('00');
    });
  });

  // ============================================
  // SUPPLIER CONFIRMATION CODE TESTS
  // ============================================

  describe('generateSupplierConfirmCode', () => {
    test('should generate 4-character code from vendor code and timestamp', () => {
      const vendorCode = 'ABC';
      const timestamp = new Date('2024-01-01T00:00:00Z');

      const result = generateSupplierConfirmCode(vendorCode, timestamp);

      expect(result).toHaveLength(4);
      expect(result).toMatch(/^[a-z0-9]{4}$/);
    });

    test('should include vendor component in generated code', () => {
      const vendorCode = 'ABC';
      const timestamp = new Date('2024-01-01T00:00:00Z');

      const result = generateSupplierConfirmCode(vendorCode, timestamp);

      // Should start with first 2 chars of vendor code (lowercased)
      expect(result.slice(0, 2)).toBe('ab');
    });

    test('should handle short vendor codes', () => {
      const vendorCode = 'A';
      const timestamp = new Date('2024-01-01T00:00:00Z');

      const result = generateSupplierConfirmCode(vendorCode, timestamp);

      expect(result).toHaveLength(4);
      // For single char vendor codes, should include 'a' somewhere in the result
      expect(result.toLowerCase()).toContain('a');
    });

    test('should handle long vendor codes', () => {
      const vendorCode = 'VERYLONGVENDORCODE';
      const timestamp = new Date('2024-01-01T00:00:00Z');

      const result = generateSupplierConfirmCode(vendorCode, timestamp);

      expect(result).toHaveLength(4);
      expect(result.slice(0, 2)).toBe('ve');
    });

    test('should pad with zeros if needed', () => {
      const vendorCode = '';
      const timestamp = new Date('2024-01-01T00:00:00Z');

      const result = generateSupplierConfirmCode(vendorCode, timestamp);

      expect(result).toHaveLength(4);
      expect(result).toMatch(/^0+/); // Should start with zeros for padding
    });

    test('should generate different codes for different timestamps', () => {
      const vendorCode = 'ABC';
      const timestamp1 = new Date('2024-01-01T00:00:00Z');
      const timestamp2 = new Date('2024-01-02T00:00:00Z');

      const result1 = generateSupplierConfirmCode(vendorCode, timestamp1);
      const result2 = generateSupplierConfirmCode(vendorCode, timestamp2);

      expect(result1).not.toBe(result2);
    });

    test('should use current time when timestamp not provided', () => {
      const vendorCode = 'ABC';

      const result = generateSupplierConfirmCode(vendorCode);

      expect(result).toHaveLength(4);
      expect(result).toMatch(/^ab/);
    });
  });

  // ============================================
  // DECODE PO NUMBER TESTS
  // ============================================

  describe('decodePONumber', () => {
    test('should decode valid PO number to human-readable format', () => {
      const poNumber = '01CP2345-1bn23';
      const result = decodePONumber(poNumber);

      expect(result).toBe('Owner 1 (CAPEX) | CAPEX | WO-2345 | Purchase #1 | Supplier: ...bn23');
    });

    test('should decode different division correctly', () => {
      const poNumber = '03RF1234-2abcd';
      const result = decodePONumber(poNumber);

      expect(result).toBe('Owner 3 (Roofing) | Roofing | WO-1234 | Purchase #2 | Supplier: ...abcd');
    });

    test('should return null for invalid PO number', () => {
      const result = decodePONumber('invalid-po-number');
      expect(result).toBeNull();
    });

    test('should handle unknown leader IDs', () => {
      const poNumber = '99XX1234-1test';
      const result = decodePONumber(poNumber);

      expect(result).toBe('Unknown Leader | Unknown Division | WO-1234 | Purchase #1 | Supplier: ...test');
    });

    test('should handle unknown division codes', () => {
      const poNumber = '01XX1234-1test';
      const result = decodePONumber(poNumber);

      expect(result).toBe('Owner 1 (CAPEX) | Unknown Division | WO-1234 | Purchase #1 | Supplier: ...test');
    });
  });

  // ============================================
  // VALIDATION TESTS
  // ============================================

  describe('isValidPONumber', () => {
    test('should return true for valid PO numbers', () => {
      const validNumbers = [
        '01CP2345-1bn23',
        '02RF0001-5test',
        'OMGC9999-99abcd',
        '06ST0000-1zero',
      ];

      validNumbers.forEach((validNumber) => {
        expect(isValidPONumber(validNumber)).toBe(true);
      });
    });

    test('should return false for invalid PO numbers', () => {
      const invalidNumbers = [
        'invalid',
        '1CP2345-1bn23',
        '01C2345-1bn23',
        '01CP234-1bn23',
        '01CP2345-bn23',
        '01CP2345_1bn23',
        '01CP2345',
        '',
      ];

      invalidNumbers.forEach((invalidNumber) => {
        expect(isValidPONumber(invalidNumber)).toBe(false);
      });
    });
  });

  // ============================================
  // CONSTANTS VALIDATION TESTS
  // ============================================

  describe('Constants Validation', () => {
    test('DIVISION_CODES should contain all expected divisions', () => {
      const expectedDivisions = [
        'CAPEX',
        'Roofing',
        'General Contracting',
        'Subcontractor Management',
        'Repairs',
        'Specialty Trades',
      ];

      expectedDivisions.forEach((division) => {
        expect(DIVISION_CODES[division]).toBeDefined();
        expect(DIVISION_CODES[division]).toMatch(/^[A-Z]{2}$/);
      });
    });

    test('LEADER_ID_MAP should contain all expected leader codes', () => {
      const expectedCodes = ['O1', 'O2', 'O3', 'O4', 'O5', 'O6'];

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
  // INTEGRATION AND EDGE CASE TESTS
  // ============================================

  describe('Integration Tests', () => {
    test('should round-trip generate and parse correctly', () => {
      const originalComponents = {
        leaderId: '02',
        divisionCode: 'RF',
        workOrderNumber: 1234,
        purchaseSequence: 5,
        supplierConfirmLast4: 'test',
      };

      const poNumber = generatePONumber(originalComponents);
      const parsedComponents = parsePONumber(poNumber);

      expect(parsedComponents).toEqual(originalComponents);
    });

    test('should work with all valid leader and division combinations', () => {
      const leaderIds = ['01', '02', '03', '04', '05', '06', 'OM'];
      const divisionCodes = ['CP', 'RF', 'GC', 'SM', 'RP', 'ST'];

      leaderIds.forEach((leaderId) => {
        divisionCodes.forEach((divisionCode) => {
          const components = {
            leaderId,
            divisionCode,
            workOrderNumber: 1234,
            purchaseSequence: 1,
            supplierConfirmLast4: 'test',
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
        supplierConfirmLast4: 'test',
      };

      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        generatePONumber({ ...components, purchaseSequence: i + 1 });
      }

      const end = performance.now();
      const duration = end - start;

      // Should complete 1000 generations in less than 100ms
      expect(duration).toBeLessThan(100);
    });

    test('should parse PO numbers efficiently', () => {
      const poNumber = '01CP1234-1test';

      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        parsePONumber(poNumber);
      }

      const end = performance.now();
      const duration = end - start;

      // Should complete 1000 parses in less than 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});