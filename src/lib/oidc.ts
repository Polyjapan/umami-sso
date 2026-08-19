import * as client from 'openid-client';
import { ROLES } from '@/lib/constants';
import { getBaseUrl } from '@/lib/get-base-url';
import type { Role } from '@/lib/types';

export const OIDC_STATE_COOKIE = 'umami.oidc-state';
export const OIDC_NONCE_COOKIE = 'umami.oidc-nonce';
export const OIDC_COOKIE_MAX_AGE_SECONDS = 5 * 60;
export const SEEDED_ADMIN_USER_ID = '41e2b680-648e-4b09-bcd7-3e2b10c06264';

const DEFAULT_SCOPE = 'openid profile email';
const DEFAULT_ROLES_CLAIM = 'urn:zitadel:iam:org:project:roles';
const DEFAULT_WRITE_ROLE = 'write';
const DEFAULT_VIEW_ROLE = 'view-only';

let discoveryPromise: Promise<client.Configuration> | null = null;

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export function getAppBasePath(): string {
  const raw = process.env.BASE_PATH || '';

  if (!raw || raw === '/') {
    return '';
  }

  return `/${raw.replace(/^\/+|\/+$/g, '')}`;
}

export function isOidcEnabled(): boolean {
  return Boolean(
    readEnv('OIDC_ISSUER') && readEnv('OIDC_CLIENT_ID') && readEnv('OIDC_CLIENT_SECRET'),
  );
}

function getRolesClaimName(): string {
  return readEnv('OIDC_ROLES_CLAIM') || DEFAULT_ROLES_CLAIM;
}

function getWriteRoleName(): string {
  return readEnv('OIDC_WRITE_ROLE') || DEFAULT_WRITE_ROLE;
}

function getViewRoleName(): string {
  return readEnv('OIDC_VIEW_ROLE') || DEFAULT_VIEW_ROLE;
}

// Fallback when the IdP does not gate on project roles (e.g. Zitadel grant check disabled).
function getDefaultRole(): Role | null {
  const value = readEnv('OIDC_DEFAULT_ROLE');

  if (value === ROLES.admin || value === ROLES.viewOnly) {
    return value;
  }

  return null;
}

function getScope(): string {
  return readEnv('OIDC_SCOPE') || DEFAULT_SCOPE;
}

export function getRequestOrigin(request: Request): string {
  return getBaseUrl(request.headers).origin;
}

export function getRedirectUri(request: Request): string {
  const override = readEnv('OIDC_REDIRECT_URI');

  if (override) {
    return override;
  }

  return `${getRequestOrigin(request)}${getAppBasePath()}/api/auth/oidc/callback`;
}

function isSecureRequest(request: Request): boolean {
  return getBaseUrl(request.headers).protocol === 'https:';
}

export function getOidcCookieOptions(request: Request) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isSecureRequest(request),
    maxAge: OIDC_COOKIE_MAX_AGE_SECONDS,
    path: getAppBasePath() || '/',
  };
}

async function discover(): Promise<client.Configuration> {
  const issuer = readEnv('OIDC_ISSUER');
  const clientId = readEnv('OIDC_CLIENT_ID');
  const clientSecret = readEnv('OIDC_CLIENT_SECRET');

  if (!issuer || !clientId || !clientSecret) {
    throw new Error('OIDC is not configured');
  }

  return client.discovery(new URL(issuer), clientId, clientSecret);
}

export async function getOidcConfiguration(): Promise<client.Configuration> {
  if (!discoveryPromise) {
    discoveryPromise = discover().catch(error => {
      discoveryPromise = null;
      throw error;
    });
  }

  return discoveryPromise;
}

export async function createAuthorizationRequest(request: Request): Promise<{
  url: URL;
  state: string;
  nonce: string;
}> {
  const config = await getOidcConfiguration();
  const state = client.randomState();
  const nonce = client.randomNonce();
  const url = client.buildAuthorizationUrl(config, {
    redirect_uri: getRedirectUri(request),
    scope: getScope(),
    state,
    nonce,
  });

  return { url, state, nonce };
}

function hasRolesClaim(claims: Record<string, unknown>): boolean {
  return claims[getRolesClaimName()] != null;
}

export async function handleCallback(
  request: Request,
  expectedState: string,
  expectedNonce: string,
): Promise<Record<string, unknown>> {
  const config = await getOidcConfiguration();
  const currentUrl = new URL(request.url);
  const callbackUrl = new URL(getRedirectUri(request));
  callbackUrl.search = currentUrl.search;

  const tokens = await client.authorizationCodeGrant(config, callbackUrl, {
    expectedState,
    expectedNonce,
    idTokenExpected: true,
  });

  const idClaims = tokens.claims();

  if (!idClaims) {
    throw new Error('OIDC token response did not include ID token claims');
  }

  const claims = { ...idClaims } as Record<string, unknown>;

  if (!hasRolesClaim(claims) && tokens.access_token && typeof claims.sub === 'string') {
    const userInfo = (await client.fetchUserInfo(
      config,
      tokens.access_token,
      claims.sub,
    )) as Record<string, unknown>;
    const rolesClaim = getRolesClaimName();

    if (userInfo[rolesClaim] != null) {
      claims[rolesClaim] = userInfo[rolesClaim];
    }
  }

  return claims;
}

function parseRolesClaim(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return value;
  }

  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

function collectRoleNames(value: unknown): string[] {
  const parsed = parseRolesClaim(value);

  if (parsed == null) {
    return [];
  }

  if (typeof parsed === 'string') {
    return parsed ? [parsed] : [];
  }

  if (Array.isArray(parsed)) {
    return parsed.flatMap(item => (typeof item === 'string' ? [item] : collectRoleNames(item)));
  }

  if (typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    const names = Object.keys(obj);

    for (const nested of Object.values(obj)) {
      if (typeof nested === 'string') {
        names.push(nested);
      }
    }

    return names;
  }

  return [];
}

export function extractUsername(claims: Record<string, unknown>): string {
  const email = typeof claims.email === 'string' ? claims.email.trim() : '';
  const preferred =
    typeof claims.preferred_username === 'string' ? claims.preferred_username.trim() : '';
  const sub = typeof claims.sub === 'string' ? claims.sub.trim() : '';
  const usableEmail = email && claims.email_verified !== false ? email : '';
  const username = (usableEmail || preferred || (sub ? `sso-${sub}` : '')).toLowerCase();

  if (!username) {
    throw new Error('OIDC claims did not include a usable username');
  }

  return username.slice(0, 255);
}

export function extractRoleFromClaims(
  claims: Record<string, unknown> | null | undefined,
): Role | null {
  if (!claims) {
    return null;
  }

  const roleNames = collectRoleNames(claims[getRolesClaimName()]);
  const writeRole = getWriteRoleName();
  const viewRole = getViewRoleName();

  if (roleNames.includes(writeRole)) {
    return ROLES.admin;
  }

  if (roleNames.includes(viewRole)) {
    return ROLES.viewOnly;
  }

  return getDefaultRole();
}
