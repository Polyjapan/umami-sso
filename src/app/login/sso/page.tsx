import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginPageWrapper } from '@/app/login/LoginPage';
import { SsoCallbackPage } from './SsoCallbackPage';

export const dynamic = 'force-dynamic';

export default function () {
  return (
    <Suspense>
      <LoginPageWrapper>
        <SsoCallbackPage />
      </LoginPageWrapper>
    </Suspense>
  );
}

export const metadata: Metadata = {
  title: 'SSO',
};
