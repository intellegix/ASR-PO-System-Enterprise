import { z } from 'zod';

export const receiptLineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().default(1),
  unitPrice: z.number(),
  total: z.number(),
});

export const receiptOCRResponseSchema = z.object({
  vendor: z.object({
    name: z.string(),
    phone: z.string().optional(),
    address: z.string().optional(),
  }),
  lineItems: z.array(receiptLineItemSchema),
  subtotal: z.number().optional(),
  taxAmount: z.number().optional(),
  total: z.number(),
  receiptDate: z.string().optional(),
  receiptNumber: z.string().optional(),
});

export const receiptOCRErrorSchema = z.object({
  error: z.string(),
});

export type ReceiptOCRResponse = z.infer<typeof receiptOCRResponseSchema>;
export type ReceiptLineItem = z.infer<typeof receiptLineItemSchema>;
