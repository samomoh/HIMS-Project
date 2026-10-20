'use client';

import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  tone = 'primary',
  busy = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  const danger = tone === 'danger';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="presentation">
      <button type="button" aria-label="Close confirmation" disabled={busy} onClick={onCancel} className="absolute inset-0 bg-gray-950/40 disabled:cursor-wait" />
      <section role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-message" className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl ring-1 ring-black/10">
        <div className={`flex h-11 w-11 items-center justify-center rounded-full ${danger ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
          {danger ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
        </div>
        <h2 id="confirm-dialog-title" className="mt-4 text-lg font-semibold text-gray-900">{title}</h2>
        <p id="confirm-dialog-message" className="mt-2 text-sm leading-6 text-gray-600">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" disabled={busy} onClick={onCancel} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
          <button type="button" disabled={busy} onClick={onConfirm} className={`rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${danger ? 'bg-red-700 hover:bg-red-600' : 'bg-blue-700 hover:bg-blue-600'}`}>
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
