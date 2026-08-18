import type { Metadata } from 'next';
import { isOidcEnabled } from '@/lib/oidc';
import { LogoutPage } from './LogoutPage';

export const dynamic = 'force-dynamic';

export default function () {
  if (process.env.CLOUD_MODE) {
    return null;
  }

  if (process.env.DISABLE_LOGIN && !isOidcEnabled()) {
    return null;
  }

  return <LogoutPage />;
}

export const metadata: Metadata = {
  title: 'Logout',
};
