import { type NextRequest, NextResponse } from 'next/server';
import {
  createAuthorizationRequest,
  getOidcCookieOptions,
  isOidcEnabled,
  OIDC_NONCE_COOKIE,
  OIDC_STATE_COOKIE,
} from '@/lib/oidc';
import { parseRequest } from '@/lib/request';
import { notFound, serverError } from '@/lib/response';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { error } = await parseRequest(request, null, { skipAuth: true });

  if (error) {
    return error();
  }

  if (!isOidcEnabled()) {
    return notFound();
  }

  try {
    const { url, state, nonce } = await createAuthorizationRequest(request);
    const response = NextResponse.redirect(url, 302);
    const cookieOptions = getOidcCookieOptions(request);

    response.cookies.set(OIDC_STATE_COOKIE, state, cookieOptions);
    response.cookies.set(OIDC_NONCE_COOKIE, nonce, cookieOptions);

    return response;
  } catch (err) {
    console.error('OIDC authorization request failed', err);
    return serverError('OIDC authorization request failed');
  }
}
