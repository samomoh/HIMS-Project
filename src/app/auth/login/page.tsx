import LoginForm from './LoginForm';

export default function LoginPage() {
  const enabled = process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEMO_ACCOUNTS === 'true';
  const password = enabled ? process.env.DEMO_ACCOUNTS_PASSWORD : undefined;
  return <LoginForm demoPassword={password && password.length >= 12 ? password : null} />;
}
