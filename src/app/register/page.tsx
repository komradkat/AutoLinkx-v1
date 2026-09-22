import type { Metadata } from 'next';

import { RegisterForm } from '@/features/accounts/components/account-forms';

export const metadata: Metadata = { title: 'Create account — AutoLinkX' };

export default function RegisterPage() {
  return (
    <section className="section shell form-page">
      <h1>Create your account</h1>
      <p style={{ color: 'var(--text-muted)' }}>
        One account lets you save cars, send inquiries, and sell your own.
      </p>
      <RegisterForm />
    </section>
  );
}
