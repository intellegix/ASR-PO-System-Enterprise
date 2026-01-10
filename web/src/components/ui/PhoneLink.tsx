'use client';

import React from 'react';
import { Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhoneLinkProps {
  phone: string | null | undefined;
  className?: string;
  showIcon?: boolean;
  iconClassName?: string;
  variant?: 'default' | 'inline' | 'button';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Format phone number for tel: links
 * Strips all non-numeric characters except +
 */
export function formatPhoneForTel(phone: string): string {
  if (!phone) return '';
  // Keep only digits and leading +
  return phone.replace(/[^\d+]/g, '');
}

/**
 * Format phone number for display
 * Handles various US phone number formats
 */
export function formatPhoneDisplay(phone: string): string {
  if (!phone) return '';

  // Remove all non-numeric characters
  const digits = phone.replace(/\D/g, '');

  // Handle different length phone numbers
  if (digits.length === 10) {
    // Format as (XXX) XXX-XXXX
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits[0] === '1') {
    // Format as +1 (XXX) XXX-XXXX
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  // Return original if not a standard US format
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

/**
 * PhoneLink Component
 * Renders a clickable phone link that works on mobile devices
 */
export function PhoneLink({
  phone,
  className,
  showIcon = true,
  iconClassName,
  variant = 'default',
  size = 'md',
}: PhoneLinkProps) {
  // Don't render if no phone number
  if (!phone || !isValidPhone(phone)) {
    return null;
  }

  const telHref = `tel:${formatPhoneForTel(phone)}`;
  const displayPhone = formatPhoneDisplay(phone);

  // Base classes for different variants
  const variantClasses = {
    default: 'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300',
    inline: 'text-inherit hover:text-blue-600 dark:hover:text-blue-400 underline-offset-4 hover:underline',
    button: 'bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
  };

  // Size classes
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  // Icon size classes
  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const componentClasses = cn(
    'inline-flex items-center gap-1.5 transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-sm',
    'touch-manipulation', // Better touch handling on mobile
    variantClasses[variant],
    sizeClasses[size],
    className
  );

  return (
    <a
      href={telHref}
      className={componentClasses}
      title={`Call ${displayPhone}`}
      aria-label={`Call ${displayPhone}`}
    >
      {showIcon && (
        <Phone
          className={cn(
            iconSizeClasses[size],
            iconClassName
          )}
          aria-hidden="true"
        />
      )}
      <span>{displayPhone}</span>
    </a>
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