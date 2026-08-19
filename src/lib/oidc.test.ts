import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { ROLES } from '@/lib/constants';
import { extractRoleFromClaims, extractUsername } from './oidc';

const DEFAULT_ROLES_CLAIM = 'urn:zitadel:iam:org:project:roles';

const originalEnv = {
  OIDC_ROLES_CLAIM: process.env.OIDC_ROLES_CLAIM,
  OIDC_WRITE_ROLE: process.env.OIDC_WRITE_ROLE,
  OIDC_VIEW_ROLE: process.env.OIDC_VIEW_ROLE,
  OIDC_DEFAULT_ROLE: process.env.OIDC_DEFAULT_ROLE,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

beforeEach(() => {
  delete process.env.OIDC_ROLES_CLAIM;
  delete process.env.OIDC_WRITE_ROLE;
  delete process.env.OIDC_VIEW_ROLE;
  delete process.env.OIDC_DEFAULT_ROLE;
});

afterEach(() => {
  restoreEnv();
});

describe('extractRoleFromClaims', () => {
  test('maps a Zitadel write object-claim to admin', () => {
    const claims = {
      [DEFAULT_ROLES_CLAIM]: {
        write: { '123': 'Acme' },
      },
    };

    expect(extractRoleFromClaims(claims)).toBe(ROLES.admin);
  });

  test('maps a Zitadel view-only object-claim to view-only', () => {
    const claims = {
      [DEFAULT_ROLES_CLAIM]: {
        'view-only': { '123': 'Acme' },
      },
    };

    expect(extractRoleFromClaims(claims)).toBe(ROLES.viewOnly);
  });

  test('prefers admin when both write and view-only are present', () => {
    const claims = {
      [DEFAULT_ROLES_CLAIM]: {
        write: { '123': 'Acme' },
        'view-only': { '456': 'Other' },
      },
    };

    expect(extractRoleFromClaims(claims)).toBe(ROLES.admin);
  });

  test('returns null for unknown roles', () => {
    const claims = {
      [DEFAULT_ROLES_CLAIM]: {
        reader: { '123': 'Acme' },
      },
    };

    expect(extractRoleFromClaims(claims)).toBeNull();
  });

  test('accepts an array-form roles claim', () => {
    expect(
      extractRoleFromClaims({
        [DEFAULT_ROLES_CLAIM]: ['write'],
      }),
    ).toBe(ROLES.admin);

    expect(
      extractRoleFromClaims({
        [DEFAULT_ROLES_CLAIM]: ['view-only'],
      }),
    ).toBe(ROLES.viewOnly);
  });

  test('honors custom roles claim and role name env overrides', () => {
    process.env.OIDC_ROLES_CLAIM = 'custom_roles';
    process.env.OIDC_WRITE_ROLE = 'editor';
    process.env.OIDC_VIEW_ROLE = 'reader';

    expect(
      extractRoleFromClaims({
        custom_roles: { editor: { '1': 'Org' } },
      }),
    ).toBe(ROLES.admin);

    expect(
      extractRoleFromClaims({
        custom_roles: ['reader'],
      }),
    ).toBe(ROLES.viewOnly);

    expect(
      extractRoleFromClaims({
        [DEFAULT_ROLES_CLAIM]: { write: { '1': 'Org' } },
      }),
    ).toBeNull();
  });

  test('returns null when the roles claim is missing', () => {
    expect(extractRoleFromClaims({})).toBeNull();
    expect(extractRoleFromClaims(null)).toBeNull();
    expect(extractRoleFromClaims(undefined)).toBeNull();
  });

  test('returns OIDC_DEFAULT_ROLE when no matching role is present', () => {
    process.env.OIDC_DEFAULT_ROLE = 'view-only';

    expect(extractRoleFromClaims({})).toBe(ROLES.viewOnly);
  });

  test('does not apply OIDC_DEFAULT_ROLE when a write or view role is present', () => {
    process.env.OIDC_DEFAULT_ROLE = 'view-only';

    expect(
      extractRoleFromClaims({
        [DEFAULT_ROLES_CLAIM]: {
          write: { '123': 'Acme' },
        },
      }),
    ).toBe(ROLES.admin);

    expect(
      extractRoleFromClaims({
        [DEFAULT_ROLES_CLAIM]: {
          'view-only': { '123': 'Acme' },
        },
      }),
    ).toBe(ROLES.viewOnly);
  });

  test('ignores invalid OIDC_DEFAULT_ROLE values', () => {
    process.env.OIDC_DEFAULT_ROLE = 'superadmin';

    expect(extractRoleFromClaims({})).toBeNull();
  });

  test('returns null when OIDC_DEFAULT_ROLE is unset and no role matches', () => {
    expect(extractRoleFromClaims({})).toBeNull();
  });
});

describe('extractUsername', () => {
  test('prefers email over preferred_username', () => {
    expect(
      extractUsername({
        email: 'user@example.com',
        preferred_username: 'nickname',
        sub: 'abc',
      }),
    ).toBe('user@example.com');
  });

  test('falls back to preferred_username when email is unverified', () => {
    expect(
      extractUsername({
        email: 'user@example.com',
        email_verified: false,
        preferred_username: 'nickname',
        sub: 'abc',
      }),
    ).toBe('nickname');
  });

  test('falls back to preferred_username when email is missing', () => {
    expect(
      extractUsername({
        preferred_username: 'nickname',
        sub: 'abc',
      }),
    ).toBe('nickname');
  });

  test('falls back to sso-<sub> when email and preferred_username are missing', () => {
    expect(extractUsername({ sub: 'abc-123' })).toBe('sso-abc-123');
  });

  test('lowercases the selected username', () => {
    expect(
      extractUsername({
        email: 'User@Example.COM',
        preferred_username: 'Nickname',
      }),
    ).toBe('user@example.com');
  });

  test('throws when no usable username can be derived', () => {
    expect(() => extractUsername({})).toThrow('OIDC claims did not include a usable username');
  });
});
