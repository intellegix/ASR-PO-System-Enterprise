import nodemailer from 'nodemailer';

// Email configuration
// For production, use environment variables for SMTP settings
// For development, you can use services like Mailtrap, Ethereal, or a local SMTP server

const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
};

// Company info for email templates
export const COMPANY_INFO = {
  name: 'All Surface Roofing & Waterproofing, Inc.',
  shortName: 'ASR',
  address: '1234 Construction Way, Los Angeles, CA 90001',
  phone: '(555) 123-4567',
  email: 'purchasing@allsurfaceroofing.com',
  website: 'https://allsurfaceroofing.com',
  logoUrl: '', // Add logo URL if available
};

// Default from address
export const DEFAULT_FROM = `"${COMPANY_INFO.name}" <${process.env.EMAIL_FROM || 'noreply@allsurfaceroofing.com'}>`;

// App URL for links in emails
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';

// Create transporter
let transporter: nodemailer.Transporter | null = null;

export async function getEmailTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) {
    return transporter;
  }

  // If no SMTP credentials, create a test account with Ethereal
  if (!process.env.SMTP_USER) {
    console.log('No SMTP credentials found, using Ethereal test account');
    const testAccount = await nodemailer.createTestAccount();

    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    console.log('Ethereal test account created:', testAccount.user);
    return transporter;
  }

  transporter = nodemailer.createTransport(emailConfig);
  return transporter;
}

// Helper to check if email is enabled
export function isEmailEnabled(): boolean {
  // Always enable for now - will use Ethereal for testing if no SMTP configured
  return true;
}
