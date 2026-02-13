import type { Prisma } from '@prisma/client';

type JsonValue = Prisma.JsonValue;

interface SettingDefinition {
  value: JsonValue;
  description: string;
}

export const SETTINGS_DEFAULTS: Record<string, SettingDefinition> = {
  'company.name': { value: 'All Surface Roofing', description: 'Company display name' },
  'company.address': { value: '', description: 'Company mailing address' },
  'company.phone': { value: '', description: 'Company phone number' },
  'financial.taxRate': { value: 8.75, description: 'Default tax rate (%)' },
  'financial.poApprovalThreshold': { value: 0, description: 'Auto-approve POs below this amount (0 = all need approval)' },
  'financial.fiscalYearStart': { value: 1, description: 'Fiscal year start month (1-12)' },
  'notifications.emailEnabled': { value: false, description: 'Enable email notifications' },
  'notifications.approvalReminders': { value: true, description: 'Send approval reminder emails' },
};

export const VALID_SETTING_KEYS = Object.keys(SETTINGS_DEFAULTS);

export function isValidSettingKey(key: string): boolean {
  return key in SETTINGS_DEFAULTS;
}

export function getDefaultValue(key: string): JsonValue | undefined {
  return SETTINGS_DEFAULTS[key]?.value;
}

export function getDefaultDescription(key: string): string | undefined {
  return SETTINGS_DEFAULTS[key]?.description;
}
