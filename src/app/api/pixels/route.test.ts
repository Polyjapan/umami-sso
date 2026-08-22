import { beforeEach, expect, test, vi } from 'vitest';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { canCreateTeamWebsite, canCreateWebsite, canViewAllResources } from '@/permissions';
import { createPixel, getPixels, getUserPixels } from '@/queries/prisma';
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
  createPixel: vi.fn(),
  getPixels: vi.fn(),
  getUserPixels: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);
const getQueryFiltersMock = vi.mocked(getQueryFilters);
const canCreateTeamWebsiteMock = vi.mocked(canCreateTeamWebsite);
const canCreateWebsiteMock = vi.mocked(canCreateWebsite);
const canViewAllResourcesMock = vi.mocked(canViewAllResources);
const createPixelMock = vi.mocked(createPixel);
const getPixelsMock = vi.mocked(getPixels);
const getUserPixelsMock = vi.mocked(getUserPixels);

beforeEach(() => {
  parseRequestMock.mockReset();
  getQueryFiltersMock.mockReset();
  canCreateTeamWebsiteMock.mockReset();
  canCreateWebsiteMock.mockReset();
  canViewAllResourcesMock.mockReset();
  createPixelMock.mockReset();
  getPixelsMock.mockReset();
  getUserPixelsMock.mockReset();
});

test('POST requires pixel slugs to be at least 8 characters so create matches edit validation', async () => {
  parseRequestMock.mockResolvedValue({
    auth: {
      user: {
        id: 'user-1',
      },
    },
    body: {
      name: 'Pixel',
      slug: 'abcdefgh',
    },
    error: undefined,
  });
  canCreateWebsiteMock.mockResolvedValue(true);
  createPixelMock.mockResolvedValue({ id: 'pixel-1' } as any);

  const response = await POST(new Request('http://localhost/api/pixels', { method: 'POST' }));
  const schema = parseRequestMock.mock.calls[0][1] as {
    safeParse: (value: unknown) => { success: boolean };
  };

  expect(schema.safeParse({ name: 'Pixel', slug: '1234567' }).success).toBe(false);
  expect(schema.safeParse({ name: 'Pixel', slug: '12345678' }).success).toBe(true);
  expect(createPixelMock).toHaveBeenCalledWith({
    id: expect.any(String),
    name: 'Pixel',
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
  getPixelsMock.mockResolvedValue({ data: [{ id: 'pixel-1' }] } as any);

  const response = await GET(new Request('http://localhost/api/pixels'));

  expect(response.status).toBe(200);
  expect(getPixelsMock).toHaveBeenCalledWith({}, {});
  expect(getUserPixelsMock).not.toHaveBeenCalled();
});

test('GET returns the full catalog for view-only', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'viewer-1', role: 'view-only', isAdmin: false } },
    query: {},
    error: undefined,
  });
  getQueryFiltersMock.mockResolvedValue({});
  canViewAllResourcesMock.mockReturnValue(true);
  getPixelsMock.mockResolvedValue({ data: [{ id: 'pixel-1' }] } as any);

  const response = await GET(new Request('http://localhost/api/pixels'));

  expect(response.status).toBe(200);
  expect(getPixelsMock).toHaveBeenCalledWith({}, {});
  expect(getUserPixelsMock).not.toHaveBeenCalled();
});

test('GET returns owned pixels for a user role', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1', role: 'user', isAdmin: false } },
    query: {},
    error: undefined,
  });
  getQueryFiltersMock.mockResolvedValue({});
  canViewAllResourcesMock.mockReturnValue(false);
  getUserPixelsMock.mockResolvedValue({ data: [{ id: 'pixel-owned' }] } as any);

  const response = await GET(new Request('http://localhost/api/pixels'));

  expect(response.status).toBe(200);
  expect(getUserPixelsMock).toHaveBeenCalledWith('user-1', {});
  expect(getPixelsMock).not.toHaveBeenCalled();
});
