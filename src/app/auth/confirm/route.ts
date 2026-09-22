/**
 * Email confirmation link target (A-06). Developer A owns this route; the
 * account pages around it are Developer B's.
 */
import { completeAuthLink } from '@/server/auth/complete-link';

export async function GET(request: Request) {
  return completeAuthLink(request, {
    successPath: '/profile',
    successNotice: 'email_confirmed',
  });
}
