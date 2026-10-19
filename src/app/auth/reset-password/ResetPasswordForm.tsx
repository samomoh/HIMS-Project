'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { HeartPulse, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { requestPasswordResetAction, verifyAndResetPasswordAction } from './actions';

export default function ResetPasswordForm({ token }: { token: string }) {
  const [step, setStep] = useState<'request' | 'sent' | 'reset' | 'success'>(token ? 'reset' : 'request');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setMessage('');
    try {
      const result = await requestPasswordResetAction(email);
      setMessage(result.message);
      setStep('sent');
    } catch {
      setMessage('We could not process that request. Please try again shortly.');
    } finally { setPending(false); }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage('');
    if (password !== confirm) { setMessage('The passwords do not match.'); return; }
    setPending(true);
    try {
      const result = await verifyAndResetPasswordAction(token, password);
      if (result.success) setStep('success');
      else setMessage(result.message);
    } catch {
      setMessage('We could not update your password. Please try again.');
    } finally { setPending(false); }
  }

  const title = step === 'request' ? 'Reset your password' : step === 'sent' ? 'Check your email' : step === 'success' ? 'Password updated' : 'Choose a new password';

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand"><span><HeartPulse size={24} /></span><strong>HealthAI</strong></div>
        <p className="auth-eyebrow">ACCOUNT RECOVERY</p>
        <h1>{title}</h1>
        <p className="auth-intro">{step === 'request' ? 'Enter your work email and we’ll send a secure reset link if an account matches.' : step === 'sent' ? 'If an account with that email exists, a reset link will arrive shortly. The link expires in 30 minutes.' : step === 'success' ? 'Your password has been changed. Sign in with your new password.' : 'Use a unique password with at least 12 characters.'}</p>
        {message && <div role={step === 'request' || step === 'sent' ? 'status' : 'alert'} className={step === 'request' || step === 'sent' ? 'auth-notice' : 'auth-error'}>{message}</div>}

        {step === 'request' && <form onSubmit={requestReset} className="auth-form">
          <label htmlFor="email">Work email</label>
          <div className="auth-input"><Mail size={17} /><input id="email" type="email" autoComplete="username" required maxLength={255} value={email} onChange={(event) => setEmail(event.target.value)} /></div>
          <button type="submit" disabled={pending} className="auth-submit">{pending ? 'Sending…' : 'Send reset link'}</button>
        </form>}

        {step === 'reset' && <form onSubmit={resetPassword} className="auth-form">
          <label htmlFor="password">New password</label>
          <div className="auth-input"><LockKeyhole size={17} /><input id="password" type="password" autoComplete="new-password" required minLength={12} maxLength={1024} value={password} onChange={(event) => setPassword(event.target.value)} /></div>
          <label htmlFor="confirm">Confirm new password</label>
          <div className="auth-input"><LockKeyhole size={17} /><input id="confirm" type="password" autoComplete="new-password" required minLength={12} maxLength={1024} value={confirm} onChange={(event) => setConfirm(event.target.value)} /></div>
          <button type="submit" disabled={pending} className="auth-submit">{pending ? 'Updating…' : 'Update password'}</button>
        </form>}

        {step === 'success' && <div className="auth-success-icon"><ShieldCheck size={28} /></div>}
        {step === 'sent' && <button type="button" className="auth-submit" onClick={() => { setStep('request'); setMessage(''); }}>Request another link</button>}
        {(step === 'success' || step === 'request' || step === 'sent') && <Link href="/auth/login" className="auth-secondary">Return to sign in</Link>}
      </section>
    </main>
  );
}
