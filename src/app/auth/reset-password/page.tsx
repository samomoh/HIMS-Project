import ResetPasswordForm from './ResetPasswordForm';

export default async function PasswordResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <ResetPasswordForm token={token ?? ''} />;
}
