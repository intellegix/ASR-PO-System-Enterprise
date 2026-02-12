'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface POGeneratedConfirmationProps {
  poId: string;
  poNumber: string;
  divisionName: string;
  projectName: string;
  workOrderNumber: string;
}

export default function POGeneratedConfirmation({
  poId,
  poNumber,
  divisionName,
  projectName,
  workOrderNumber,
}: POGeneratedConfirmationProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(poNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = poNumber;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 px-4">
      {/* Success check animation */}
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      {/* PO Number - large & prominent */}
      <div className="text-center space-y-2">
        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">PO Number</p>
        <p className="text-4xl sm:text-5xl font-bold font-mono text-slate-900 tracking-wider">
          {poNumber}
        </p>
      </div>

      {/* Copy button */}
      <button
        onClick={handleCopy}
        className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition text-lg ${
          copied
            ? 'bg-green-100 text-green-700'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
        }`}
      >
        {copied ? (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy to Clipboard
          </>
        )}
      </button>

      {/* Summary card */}
      <div className="w-full max-w-sm bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
          <span className="text-sm text-slate-500">Division</span>
          <span className="text-sm font-medium text-slate-900">{divisionName}</span>
        </div>
        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
          <span className="text-sm text-slate-500">Project</span>
          <span className="text-sm font-medium text-slate-900 text-right max-w-[200px] truncate">{projectName}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-500">Work Order</span>
          <span className="text-sm font-mono text-slate-900">{workOrderNumber}</span>
        </div>
      </div>

      {/* Status note */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 max-w-sm w-full">
        <p className="text-sm text-amber-800 text-center">
          This PO is <span className="font-semibold">incomplete</span>. Add vendor and line items when the invoice arrives.
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        <button
          onClick={() => router.push('/po')}
          className="flex-1 py-3 px-4 border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition"
        >
          Done
        </button>
        <button
          onClick={() => router.push(`/po/view?id=${poId}`)}
          className="flex-1 py-3 px-4 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition"
        >
          Add Details Now
        </button>
      </div>
    </div>
  );
}
