import { describe, expect, test } from 'vitest';
import { canViewAllResources } from './user';

const adminUser = { id: 'admin-1', username: 'admin', role: 'admin', isAdmin: true };
const normalUser = { id: 'user-1', username: 'user', role: 'user', isAdmin: false };
const viewOnlyUser = { id: 'user-2', username: 'viewer', role: 'view-only', isAdmin: false };

describe('canViewAllResources', () => {
  test('allows admins', () => {
    expect(canViewAllResources({ user: adminUser })).toBe(true);
  });

  test('allows view-only', () => {
    expect(canViewAllResources({ user: viewOnlyUser })).toBe(true);
  });

  test('denies a user role', () => {
    expect(canViewAllResources({ user: normalUser })).toBe(false);
  });

  test('denies when there is no user', () => {
    expect(canViewAllResources({})).toBe(false);
  });
});
