import {
  Button,
  Column,
  Form,
  FormButtons,
  FormField,
  FormSubmitButton,
  Heading,
  Icon,
  Loading,
  PasswordField,
  Text,
  TextField,
} from '@umami/react-zen';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useConfig, useMessages, useUpdateQuery } from '@/components/hooks';
import { Logo } from '@/components/svg';
import { setClientAuthToken } from '@/lib/client';
import { setUser } from '@/store/app';

export function LoginForm() {
  const { t, labels, getErrorMessage } = useMessages();
  const router = useRouter();
  const config = useConfig();
  const { mutateAsync, error } = useUpdateQuery('/auth/login');
  const oidcEnabled = !!config?.oidcEnabled;
  const loginDisabled = !!config?.loginDisabled;
  const ssoOnly = oidcEnabled && loginDisabled;
  const ssoLoginUrl = `${process.env.basePath || ''}/api/auth/oidc/login`;

  useEffect(() => {
    if (!ssoOnly) {
      return;
    }

    window.location.href = ssoLoginUrl;
  }, [ssoOnly, ssoLoginUrl]);

  const handleSubmit = async (data: any) => {
    await mutateAsync(data, {
      onSuccess: async (response: any) => {
        if (response.requiresTwoFactor) {
          sessionStorage.setItem('umami.partial-token', response.partialToken);
          router.push('/login/two-factor');
          return;
        }
        setClientAuthToken(response.token);
        setUser(response.user);
        router.push('/');
      },
    });
  };

  if (!config) {
    return <Loading />;
  }

  const handleSso = () => {
    window.location.href = ssoLoginUrl;
  };

  return (
    <Column justifyContent="center" alignItems="center" gap="6">
      <Icon size="lg">
        <Logo />
      </Icon>
      <Heading>umami</Heading>
      {oidcEnabled && (
        <Column alignItems="center" gap="4">
          {ssoOnly && <Text>Redirecting to your identity provider…</Text>}
          <Button variant="primary" style={{ minWidth: 300 }} onPress={handleSso}>
            Sign in with SSO
          </Button>
        </Column>
      )}
      {!ssoOnly && (
        <Form onSubmit={handleSubmit} error={getErrorMessage(error)} style={{ minWidth: 300 }}>
          <FormField
            label={t(labels.username)}
            data-test="input-username"
            name="username"
            rules={{ required: t(labels.required) }}
          >
            <TextField autoComplete="username" />
          </FormField>

          <FormField
            label={t(labels.password)}
            data-test="input-password"
            name="password"
            rules={{ required: t(labels.required) }}
          >
            <PasswordField autoComplete="current-password" />
          </FormField>
          <FormButtons>
            <FormSubmitButton
              data-test="button-submit"
              variant="primary"
              style={{ flex: 1 }}
              isDisabled={false}
            >
              {t(labels.login)}
            </FormSubmitButton>
          </FormButtons>
        </Form>
      )}
    </Column>
  );
}
