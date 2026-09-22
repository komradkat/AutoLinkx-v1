import type { Metadata } from 'next';

import { LoginForm } from '@/features/accounts/components/account-forms';

export const metadata: Metadata = { title: 'Sign in — AutoLinkX' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = typeof params.next === 'string' ? params.next : '';
  const notice = typeof params.notice === 'string' ? params.notice : undefined;

  return (
    <section className="section shell form-page">
      <h1>Sign in</h1>
      <LoginForm next={next} notice={notice} />
    </section>
  );
}
