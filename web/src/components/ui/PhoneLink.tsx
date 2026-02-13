'use client';

import React from 'react';
import { Box, Link as MuiLink } from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';

interface PhoneLinkProps {
  phone: string | null | undefined;
  showIcon?: boolean;
  variant?: 'default' | 'inline' | 'button';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Format phone number for tel: links
 */
export function formatPhoneForTel(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[^\d+]/g, '');
}

/**
 * Format phone number for display
 */
export function formatPhoneDisplay(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

/**
 * Validate if phone number appears to be valid
 */
export function isValidPhone(phone: string): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 11;
}

const sizeMap = { sm: '0.875rem', md: '1rem', lg: '1.125rem' };
const iconSizeMap = { sm: 14, md: 16, lg: 20 };

/**
 * PhoneLink Component
 */
export function PhoneLink({
  phone,
  showIcon = true,
  variant = 'default',
  size = 'md',
}: PhoneLinkProps) {
  if (!phone || !isValidPhone(phone)) {
    return null;
  }

  const telHref = `tel:${formatPhoneForTel(phone)}`;
  const displayPhone = formatPhoneDisplay(phone);

  return (
    <MuiLink
      href={telHref}
      underline={variant === 'inline' ? 'hover' : 'none'}
      title={`Call ${displayPhone}`}
      aria-label={`Call ${displayPhone}`}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        fontSize: sizeMap[size],
        color: variant === 'button' ? 'white' : 'primary.main',
        ...(variant === 'button' && {
          bgcolor: 'primary.main',
          px: 1.5,
          py: 0.75,
          borderRadius: 1,
          '&:hover': { bgcolor: 'primary.dark' },
        }),
        ...(variant === 'inline' && {
          color: 'inherit',
          '&:hover': { color: 'primary.main' },
        }),
      }}
    >
      {showIcon && (
        <PhoneIcon sx={{ fontSize: iconSizeMap[size] }} aria-hidden="true" />
      )}
      <Box component="span">{displayPhone}</Box>
    </MuiLink>
  );
}

/**
 * PhoneLinkButton - Button variant shortcut
 */
export function PhoneLinkButton(props: Omit<PhoneLinkProps, 'variant'>) {
  return <PhoneLink {...props} variant="button" />;
}

/**
 * PhoneLinkInline - Inline variant shortcut
 */
export function PhoneLinkInline(props: Omit<PhoneLinkProps, 'variant'>) {
  return <PhoneLink {...props} variant="inline" showIcon={false} />;
}

/**
 * Hook for phone utilities
 */
export function usePhoneUtils() {
  return {
    formatPhoneForTel,
    formatPhoneDisplay,
    isValidPhone,
  };
}
