'use client';
import { Column, Row, Text } from '@umami/react-zen';
import { useShare } from '@/components/hooks';
import { ShareBranding } from './ShareBranding';

const TERMS_URL = 'https://chanwe.ar/es/terminos';

export function ShareFooter() {
  const share = useShare();

  return (
    <Column
      paddingX={{ base: '3', md: '6' }}
      width="100%"
      maxWidth="1320px"
      style={{ margin: '0 auto' }}
    >
      <Row border="top" justifyContent="space-between" alignItems="center" gap paddingY="4">
        <Text size="sm" color="muted">
          <a href={TERMS_URL} target="_blank" rel="noopener">
            Términos y condiciones
          </a>
        </Text>
        {share?.whiteLabel && <ShareBranding size="sm" />}
      </Row>
    </Column>
  );
}
