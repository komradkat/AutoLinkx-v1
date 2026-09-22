/**
 * Recovery callback (A-06). Establishes the recovery session, then sends the
 * visitor to the screen where they choose a new password.
 */
import { completeAuthLink } from '@/server/auth/complete-link';

export async function GET(request: Request) {
  return completeAuthLink(request, {
    successPath: '/reset-password',
    successNotice: 'recovery_email_sent',
  });
}
