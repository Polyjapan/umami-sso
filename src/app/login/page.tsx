import type { Metadata } from 'next';
import { isOidcEnabled } from '@/lib/oidc';
import { LoginPage } from './LoginPage';

export const dynamic = 'force-dynamic';

export default async function () {
  if (process.env.CLOUD_MODE) {
    return null;
  }

  if (process.env.DISABLE_LOGIN && !isOidcEnabled()) {
    return null;
  }

  return <LoginPage />;
}

export const metadata: Metadata = {
  title: 'Login',
};
