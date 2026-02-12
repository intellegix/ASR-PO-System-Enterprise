'use client';

import { useState, useRef } from 'react';

interface ScanResult {
  vendor: {
    name: string;
    matchedVendorId: string | null;
  };
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal?: number;
  taxAmount?: number;
  total: number;
  receiptDate?: string;
  receiptNumber?: string;
  receiptImageUrl?: string;
}

interface ReceiptScannerProps {
  poId: string;
  onScanComplete: (result: ScanResult) => void;
}

export default function ReceiptScanner({ poId, onScanComplete }: ReceiptScannerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Validate file
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(selected.type)) {
      setError('Please select a JPEG, PNG, or WebP image');
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError('File is too large (max 10MB)');
      return;
    }

    setFile(selected);
    setError(null);

    // Generate preview
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(selected);
  };

  const handleScan = async () => {
    if (!file) return;
    setScanning(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/po/${poId}/scan-receipt`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const result: ScanResult = await res.json();
        onScanComplete(result);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to scan receipt');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <div>
          <p className="text-sm font-medium text-blue-800">Scan Receipt with AI</p>
          <p className="text-xs text-blue-600">Upload a photo of the receipt to auto-fill vendor and line items</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-2 text-red-700 text-sm">
          {error}
        </div>
      )}

      {!preview ? (
        <div>
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-100/50 transition">
            <svg className="w-8 h-8 text-blue-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm text-blue-600 font-medium">Tap to upload receipt photo</span>
            <span className="text-xs text-blue-400 mt-1">JPEG, PNG, or WebP (max 10MB)</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Preview */}
          <div className="relative">
            <img
              src={preview}
              alt="Receipt preview"
              className="w-full max-h-48 object-contain rounded border border-blue-200"
            />
            <button
              onClick={handleClear}
              className="absolute top-1 right-1 w-6 h-6 bg-white rounded-full shadow flex items-center justify-center text-slate-500 hover:text-red-500"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scan button */}
          <button
            onClick={handleScan}
            disabled={scanning}
            className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {scanning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Analyzing receipt with AI...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Scan Receipt
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
