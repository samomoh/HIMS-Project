'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { LockKeyhole, Mail } from 'lucide-react';
import { signInAction } from './actions';

export default function LoginForm({ demoPassword }: { demoPassword: string | null }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      const result = await signInAction(email, password);
      if (!result.success) {
        setError(result.message ?? 'Email or password is incorrect.');
        return;
      }
      const next = new URLSearchParams(window.location.search).get('next');
      const target = next ? new URL(next, window.location.origin) : new URL('/', window.location.origin);
      const destination = target.origin === window.location.origin ? `${target.pathname}${target.search}${target.hash}` : '/';
      window.location.assign(destination);
    } catch {
      setError('Sign in is temporarily unavailable. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand"><Image src="/moh-logo.jpeg" alt="Ministry of Health, Government of Sierra Leone" width={58} height={58} priority className="auth-moh-logo" /><strong><span>Connaught Hospital</span><small>Management Information System</small></strong></div>
        <p className="auth-eyebrow">SECURE STAFF PORTAL</p>
        <h1>Welcome back</h1>
        <p className="auth-intro">Sign in with your hospital account to continue.</p>
        {error && <div role="alert" className="auth-error">{error}</div>}
        <form onSubmit={submit} className="auth-form">
          <label htmlFor="email">Work email</label>
          <div className="auth-input"><Mail size={17} /><input id="email" type="email" autoComplete="username" required maxLength={255} value={email} onChange={(event) => setEmail(event.target.value)} /></div>
          <div className="auth-label-row"><label htmlFor="password">Password</label><Link href="/auth/reset-password">Forgot password?</Link></div>
          <div className="auth-input"><LockKeyhole size={17} /><input id="password" type="password" autoComplete="current-password" required maxLength={1024} value={password} onChange={(event) => setPassword(event.target.value)} /></div>
          <button type="submit" disabled={pending} className="auth-submit">{pending ? 'Signing in…' : 'Sign in'}</button>
        </form>
        {demoPassword && <section className="demo-accounts" aria-label="Sample role accounts">
          <h2>Security test accounts</h2>
          <p>Development only · shared password: <code>{demoPassword}</code></p>
          <div className="demo-account-list">
            {[
              ['Super administrator', 'super_admin'], ['Administrator', 'admin'], ['Doctor', 'doctor'],
              ['Specialist', 'specialist'], ['Nurse', 'nurse'], ['Receptionist', 'receptionist'],
              ['Pharmacist', 'pharmacist'], ['Laboratory', 'laboratory'], ['Radiology', 'radiology'],
              ['Emergency', 'emergency'], ['Medical records', 'medical_records'],
              ['Health authority', 'health_authority'], ['ICT support', 'ict_support'], ['Human Resources', 'hr'],
            ].map(([label, role]) => <button type="button" key={role} onClick={() => { setEmail(`${role.replaceAll('_', '.')}@example.test`); setPassword(demoPassword); }}>
              <span>{label}</span><small>{role.replaceAll('_', ' ')}</small>
            </button>)}
          </div>
        </section>}
        <p className="auth-footnote">Access is limited to authorized care team members.</p>
      </section>
    </main>
  );
}
