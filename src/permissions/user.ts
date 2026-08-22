import { ROLES } from '@/lib/constants';
import type { Auth } from '@/lib/types';

export function canViewAllResources({ user }: Auth): boolean {
  return Boolean(user && (user.isAdmin || user.role === ROLES.viewOnly));
}

export async function canCreateUser({ user }: Auth) {
  return user?.isAdmin ?? false;
}

export async function canViewUser({ user }: Auth, viewedUserId: string) {
  if (!user) {
    return false;
  }

  if (user.isAdmin) {
    return true;
  }

  return user.id === viewedUserId;
}

export async function canViewUsers({ user }: Auth) {
  return user?.isAdmin ?? false;
}

export async function canUpdateUser({ user }: Auth, viewedUserId: string) {
  if (!user) {
    return false;
  }

  if (user.isAdmin) {
    return true;
  }

  return user.id === viewedUserId;
}

export async function canDeleteUser({ user }: Auth) {
  return user?.isAdmin ?? false;
}

export async function canEnforceTwoFactorAuthForEveryone({ user }: Auth) {
  return user?.isAdmin ?? false;
}

export async function canEnforceTwoFactorAuthForUser({ user }: Auth) {
  return user?.isAdmin ?? false;
}
