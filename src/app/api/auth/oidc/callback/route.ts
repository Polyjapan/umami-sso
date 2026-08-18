import { randomBytes } from 'node:crypto';
import { type NextRequest, NextResponse } from 'next/server';
import { saveAuth } from '@/lib/auth';
import { hash, secret, uuid } from '@/lib/crypto';
import { createSecureToken } from '@/lib/jwt';
import {
  extractRoleFromClaims,
  getAppBasePath,
  getOidcCookieOptions,
  getRequestOrigin,
  handleCallback,
  isOidcEnabled,
  OIDC_NONCE_COOKIE,
  OIDC_STATE_COOKIE,
  SEEDED_ADMIN_USER_ID,
} from '@/lib/oidc';
import { hashPassword } from '@/lib/password';
import redis from '@/lib/redis';
import { parseRequest } from '@/lib/request';
import { notFound } from '@/lib/response';
import { createUser, getUserByUsername, updateUser } from '@/queries/prisma';

export const dynamic = 'force-dynamic';

function extractUsername(claims: Record<string, unknown>): string {
  const preferred =
    typeof claims.preferred_username === 'string' ? claims.preferred_username.trim() : '';
  const email = typeof claims.email === 'string' ? claims.email.trim() : '';
  const sub = typeof claims.sub === 'string' ? claims.sub.trim() : '';
  const username = (preferred || email || (sub ? `sso-${sub}` : '')).toLowerCase();

  if (!username) {
    throw new Error('OIDC claims did not include a usable username');
  }

  return username.slice(0, 255);
}

function ssoRedirect(request: NextRequest, params: Record<string, string>, hash?: string) {
  const dest = new URL(`${getAppBasePath()}/login/sso`, getRequestOrigin(request));

  for (const [key, value] of Object.entries(params)) {
    dest.searchParams.set(key, value);
  }

  if (hash) {
    dest.hash = hash;
  }

  const response = NextResponse.redirect(dest, 302);
  const cookieOptions = { ...getOidcCookieOptions(request), maxAge: 0 };

  response.cookies.set(OIDC_STATE_COOKIE, '', cookieOptions);
  response.cookies.set(OIDC_NONCE_COOKIE, '', cookieOptions);

  return response;
}

export async function GET(request: NextRequest) {
  const { error } = await parseRequest(request, null, { skipAuth: true });

  if (error) {
    return error();
  }

  if (!isOidcEnabled()) {
    return notFound();
  }

  const state = request.nextUrl.searchParams.get('state');
  const expectedState = request.cookies.get(OIDC_STATE_COOKIE)?.value;
  const expectedNonce = request.cookies.get(OIDC_NONCE_COOKIE)?.value;

  if (!state || !expectedState || state !== expectedState) {
    return ssoRedirect(request, { error: 'sso_failed' });
  }

  if (!expectedNonce) {
    console.error('OIDC callback missing nonce cookie');
    return ssoRedirect(request, { error: 'sso_failed' });
  }

  try {
    const claims = await handleCallback(request, expectedState, expectedNonce);
    const role = extractRoleFromClaims(claims);

    if (!role) {
      return ssoRedirect(request, { error: 'sso_no_role' });
    }

    const username = extractUsername(claims);
    let user = await getUserByUsername(username, { includePassword: true });

    if (!user) {
      try {
        await createUser({
          id: uuid(),
          username,
          password: hashPassword(randomBytes(24).toString('hex')),
          role,
        });
      } catch (err) {
        // Unique username collision from a concurrent callback — load the existing row.
        user = await getUserByUsername(username, { includePassword: true });

        if (!user) {
          throw err;
        }
      }

      if (!user) {
        user = await getUserByUsername(username, { includePassword: true });
      }
    }

    if (!user) {
      throw new Error('Failed to load SSO user after provision');
    }

    if (user.id === SEEDED_ADMIN_USER_ID) {
      return ssoRedirect(request, { error: 'sso_admin_reserved' });
    }

    if (user.role !== role) {
      const updated = await updateUser(user.id, { role });
      user = { ...user, role: updated.role };
    }

    const { id, role: resolvedRole } = user;
    const pwd = hash(user.password);

    let token: string;

    if (redis.enabled) {
      token = await saveAuth({ userId: id, role: resolvedRole, pwd });
    } else {
      token = createSecureToken({ userId: user.id, role: resolvedRole, pwd }, secret());
    }

    return ssoRedirect(request, {}, `token=${encodeURIComponent(token)}`);
  } catch (err) {
    console.error('OIDC callback failed', err);
    return ssoRedirect(request, { error: 'sso_failed' });
  }
}
