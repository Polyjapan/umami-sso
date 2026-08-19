'use client';
import { Button, Column, Heading, Icon, Loading, Text } from '@umami/react-zen';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useApi } from '@/components/hooks';
import { Logo } from '@/components/svg';
import { removeClientAuthToken, setClientAuthToken } from '@/lib/client';
import { setUser } from '@/store/app';

let capturedToken: string | null = null;
let verifyStarted = false;

function getErrorMessage(code: string) {
  if (code === 'sso_no_role') {
    return 'Your account does not have an Umami role assigned. Contact your administrator.';
  }

  if (code === 'sso_failed') {
    return 'Sign-in failed. Please try again.';
  }

  if (code === 'sso_admin_reserved') {
    return 'This username is reserved for the local break-glass administrator. Log in with a different identity provider account.';
  }

  return 'Sign-in could not be completed. Please try again.';
}

export function SsoCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { post } = useApi();
  const [error, setError] = useState<string | null>(null);
  const ssoLoginUrl = `${process.env.basePath || ''}/api/auth/oidc/login`;

  useEffect(() => {
    const errorCode = searchParams.get('error');

    if (errorCode) {
      setError(errorCode);
      return;
    }

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const tokenFromHash = hashParams.get('token');

    if (tokenFromHash) {
      capturedToken = tokenFromHash;
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }

    if (!capturedToken) {
      setError('sso_failed');
      return;
    }

    if (verifyStarted) {
      return;
    }

    verifyStarted = true;
    const token = capturedToken;

    (async () => {
      try {
        setClientAuthToken(token);
        const user = await post('/auth/verify', {}, { authorization: `Bearer ${token}` });

        setUser(user);
        router.push('/');
      } catch {
        verifyStarted = false;
        removeClientAuthToken();
        setError('sso_failed');
      }
    })();
  }, [searchParams, router, post]);

  if (!error) {
    return <Loading placement="absolute" />;
  }

  return (
    <Column justifyContent="center" alignItems="center" gap="6">
      <Icon size="lg">
        <Logo />
      </Icon>
      <Heading>umami</Heading>
      <Column gap="4" alignItems="center" style={{ minWidth: 300, maxWidth: 420 }}>
        <Text>{getErrorMessage(error)}</Text>
        <Button variant="primary" onPress={() => (window.location.href = ssoLoginUrl)}>
          Sign in with SSO
        </Button>
      </Column>
    </Column>
  );
}
