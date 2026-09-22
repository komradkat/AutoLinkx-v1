import type { Metadata } from 'next';

import { RecoveryForm } from '@/features/accounts/components/account-forms';

export const metadata: Metadata = { title: 'Recover your account — AutoLinkX' };

export default function ForgotPasswordPage() {
  return (
    <section className="section shell form-page">
      <h1>Recover your account</h1>
      <p style={{ color: 'var(--text-muted)' }}>
        Enter the address you signed up with and we will send a link to choose a new
        password.
      </p>
      <RecoveryForm />
    </section>
  );
}
