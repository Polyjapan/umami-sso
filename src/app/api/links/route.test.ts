import { beforeEach, expect, test, vi } from 'vitest';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { canCreateTeamWebsite, canCreateWebsite, canViewAllResources } from '@/permissions';
import { createLink, getLinks, getUserLinks } from '@/queries/prisma';
import { GET, POST } from './route';

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
  createLink: vi.fn(),
  getLinks: vi.fn(),
  getUserLinks: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);
const getQueryFiltersMock = vi.mocked(getQueryFilters);
const canCreateTeamWebsiteMock = vi.mocked(canCreateTeamWebsite);
const canCreateWebsiteMock = vi.mocked(canCreateWebsite);
const canViewAllResourcesMock = vi.mocked(canViewAllResources);
const createLinkMock = vi.mocked(createLink);
const getLinksMock = vi.mocked(getLinks);
const getUserLinksMock = vi.mocked(getUserLinks);

beforeEach(() => {
  parseRequestMock.mockReset();
  getQueryFiltersMock.mockReset();
  canCreateTeamWebsiteMock.mockReset();
  canCreateWebsiteMock.mockReset();
  canViewAllResourcesMock.mockReset();
  createLinkMock.mockReset();
  getLinksMock.mockReset();
  getUserLinksMock.mockReset();
});

test('POST requires link slugs to be at least 8 characters so create matches edit validation', async () => {
  parseRequestMock.mockResolvedValue({
    auth: {
      user: {
        id: 'user-1',
      },
    },
    body: {
      name: 'Docs',
      url: 'https://example.com',
      slug: 'abcdefgh',
    },
    error: undefined,
  });
  canCreateWebsiteMock.mockResolvedValue(true);
  createLinkMock.mockResolvedValue({ id: 'link-1' } as any);

  const response = await POST(new Request('http://localhost/api/links', { method: 'POST' }));
  const schema = parseRequestMock.mock.calls[0][1] as {
    safeParse: (value: unknown) => { success: boolean };
  };

  expect(schema.safeParse({ name: 'Docs', url: 'https://example.com', slug: '1234567' }).success).toBe(
    false,
  );
  expect(schema.safeParse({ name: 'Docs', url: 'https://example.com', slug: '12345678' }).success).toBe(
    true,
  );
  expect(createLinkMock).toHaveBeenCalledWith({
    id: expect.any(String),
    name: 'Docs',
    url: 'https://example.com',
    slug: 'abcdefgh',
    teamId: undefined,
    userId: 'user-1',
  });
  expect(response.status).toBe(200);
});

test('GET returns the full catalog for admins', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'admin-1', role: 'admin', isAdmin: true } },
    query: {},
    error: undefined,
  });
  getQueryFiltersMock.mockResolvedValue({});
  canViewAllResourcesMock.mockReturnValue(true);
  getLinksMock.mockResolvedValue({ data: [{ id: 'link-1' }] } as any);

  const response = await GET(new Request('http://localhost/api/links'));

  expect(response.status).toBe(200);
  expect(getLinksMock).toHaveBeenCalledWith({ where: { deletedAt: null } }, {});
  expect(getUserLinksMock).not.toHaveBeenCalled();
});

test('GET returns the full catalog for view-only', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'viewer-1', role: 'view-only', isAdmin: false } },
    query: {},
    error: undefined,
  });
  getQueryFiltersMock.mockResolvedValue({});
  canViewAllResourcesMock.mockReturnValue(true);
  getLinksMock.mockResolvedValue({ data: [{ id: 'link-1' }] } as any);

  const response = await GET(new Request('http://localhost/api/links'));

  expect(response.status).toBe(200);
  expect(getLinksMock).toHaveBeenCalledWith({ where: { deletedAt: null } }, {});
  expect(getUserLinksMock).not.toHaveBeenCalled();
});

test('GET returns owned links for a user role', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1', role: 'user', isAdmin: false } },
    query: {},
    error: undefined,
  });
  getQueryFiltersMock.mockResolvedValue({});
  canViewAllResourcesMock.mockReturnValue(false);
  getUserLinksMock.mockResolvedValue({ data: [{ id: 'link-owned' }] } as any);

  const response = await GET(new Request('http://localhost/api/links'));

  expect(response.status).toBe(200);
  expect(getUserLinksMock).toHaveBeenCalledWith('user-1', {});
  expect(getLinksMock).not.toHaveBeenCalled();
});
