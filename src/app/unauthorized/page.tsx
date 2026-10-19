import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="auth-eyebrow">ACCESS RESTRICTED</p>
        <h1>You don’t have access to this section</h1>
        <p className="auth-intro">If you need access for your role, contact your system administrator.</p>
        <Link className="auth-submit auth-submit-link" href="/">Return to workspace</Link>
      </section>
    </main>
  );
}
