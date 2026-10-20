'use client';

import { useEffect } from 'react';
import { CheckCircle2, CircleX, X } from 'lucide-react';

export default function ToastNotice({ message, tone = 'success', onDismiss }: { message: string; tone?: 'success' | 'error'; onDismiss: () => void }) {
  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(onDismiss, 4500);
    return () => window.clearTimeout(timeout);
  }, [message, onDismiss]);

  if (!message) return null;
  const success = tone === 'success';

  return (
    <div className="fixed right-4 top-4 z-[80]" aria-live="polite" aria-atomic="true">
      <div role={success ? 'status' : 'alert'} className={`flex max-w-sm items-start gap-3 rounded-lg px-4 py-3 shadow-lg ring-1 ${success ? 'bg-white text-green-900 ring-green-200' : 'bg-white text-red-900 ring-red-200'}`}>
        {success ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" /> : <CircleX className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />}
        <p className="flex-1 text-sm font-medium">{message}</p>
        <button type="button" onClick={onDismiss} aria-label="Dismiss notification" className="rounded p-0.5 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
