import { beforeEach, expect, test, vi } from 'vitest';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { canViewAllResources } from '@/permissions';
import {
  getAllUserWebsitesIncludingTeamAccess,
  getUserWebsites,
  getWebsites,
} from '@/queries/prisma/website';
import { GET } from './route';

vi.mock('@/lib/request', () => ({
  getQueryFilters: vi.fn(),
  parseRequest: vi.fn(),
}));

vi.mock('@/permissions', () => ({
  canCreateTeamWebsite: vi.fn(),
  canCreateWebsite: vi.fn(),
  canViewAllResources: vi.fn(),
}));

vi.mock('@/queries/prisma', () => ({
  createShare: vi.fn(),
  createWebsite: vi.fn(),
  getTeamWebsiteCount: vi.fn(),
  getWebsiteCount: vi.fn(),
}));

vi.mock('@/queries/prisma/website', () => ({
  getAllUserWebsitesIncludingTeamAccess: vi.fn(),
  getUserWebsites: vi.fn(),
  getWebsites: vi.fn(),
}));

vi.mock('@/lib/load', () => ({
  fetchAccount: vi.fn(),
  fetchTeam: vi.fn(),
}));

vi.mock('@/lib/subscription', () => ({
  getCloudWebsiteLimit: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);
const getQueryFiltersMock = vi.mocked(getQueryFilters);
const canViewAllResourcesMock = vi.mocked(canViewAllResources);
const getWebsitesMock = vi.mocked(getWebsites);
const getUserWebsitesMock = vi.mocked(getUserWebsites);
const getAllUserWebsitesIncludingTeamAccessMock = vi.mocked(getAllUserWebsitesIncludingTeamAccess);

beforeEach(() => {
  parseRequestMock.mockReset();
  getQueryFiltersMock.mockReset();
  canViewAllResourcesMock.mockReset();
  getWebsitesMock.mockReset();
  getUserWebsitesMock.mockReset();
  getAllUserWebsitesIncludingTeamAccessMock.mockReset();
});

test('GET returns the full catalog for admins', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'admin-1', role: 'admin', isAdmin: true } },
    query: {},
    error: undefined,
  });
  getQueryFiltersMock.mockResolvedValue({});
  canViewAllResourcesMock.mockReturnValue(true);
  getWebsitesMock.mockResolvedValue({ data: [{ id: 'website-1' }] } as any);

  const response = await GET(new Request('http://localhost/api/websites'));

  expect(response.status).toBe(200);
  expect(getWebsitesMock).toHaveBeenCalled();
  expect(getUserWebsitesMock).not.toHaveBeenCalled();
});

test('GET returns the full catalog for view-only and ignores includeTeams', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'viewer-1', role: 'view-only', isAdmin: false } },
    query: { includeTeams: '1' },
    error: undefined,
  });
  getQueryFiltersMock.mockResolvedValue({});
  canViewAllResourcesMock.mockReturnValue(true);
  getWebsitesMock.mockResolvedValue({ data: [{ id: 'website-1' }] } as any);

  const response = await GET(new Request('http://localhost/api/websites?includeTeams=1'));

  expect(response.status).toBe(200);
  expect(getWebsitesMock).toHaveBeenCalled();
  expect(getAllUserWebsitesIncludingTeamAccessMock).not.toHaveBeenCalled();
});

test('GET returns owned websites for a user role', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1', role: 'user', isAdmin: false } },
    query: {},
    error: undefined,
  });
  getQueryFiltersMock.mockResolvedValue({});
  canViewAllResourcesMock.mockReturnValue(false);
  getUserWebsitesMock.mockResolvedValue({ data: [{ id: 'website-owned' }] } as any);

  const response = await GET(new Request('http://localhost/api/websites'));

  expect(response.status).toBe(200);
  expect(getUserWebsitesMock).toHaveBeenCalledWith('user-1', {});
  expect(getWebsitesMock).not.toHaveBeenCalled();
});
