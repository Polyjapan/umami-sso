import { beforeEach, expect, test, vi } from 'vitest';
import { BOARD_TYPES } from '@/lib/boards';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { canViewAllResources } from '@/permissions';
import { getBoards, getUserBoards } from '@/queries/prisma';
import { GET } from './route';

vi.mock('@/lib/request', () => ({
  getQueryFilters: vi.fn(),
  parseRequest: vi.fn(),
}));

vi.mock('@/permissions', () => ({
  canCreateTeamWebsite: vi.fn(),
  canCreateWebsite: vi.fn(),
  canViewAllResources: vi.fn(),
  canViewBoardEntities: vi.fn(),
  hasValidBoardReports: vi.fn(),
}));

vi.mock('@/queries/prisma', () => ({
  createBoard: vi.fn(),
  getBoards: vi.fn(),
  getUserBoards: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);
const getQueryFiltersMock = vi.mocked(getQueryFilters);
const canViewAllResourcesMock = vi.mocked(canViewAllResources);
const getBoardsMock = vi.mocked(getBoards);
const getUserBoardsMock = vi.mocked(getUserBoards);

beforeEach(() => {
  parseRequestMock.mockReset();
  getQueryFiltersMock.mockReset();
  canViewAllResourcesMock.mockReset();
  getBoardsMock.mockReset();
  getUserBoardsMock.mockReset();
});

test('GET returns the full catalog excluding dashboards for admins', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'admin-1', role: 'admin', isAdmin: true } },
    query: {},
    error: undefined,
  });
  getQueryFiltersMock.mockResolvedValue({});
  canViewAllResourcesMock.mockReturnValue(true);
  getBoardsMock.mockResolvedValue({ data: [{ id: 'board-1' }] } as any);

  const response = await GET(new Request('http://localhost/api/boards'));

  expect(response.status).toBe(200);
  expect(getBoardsMock).toHaveBeenCalledWith(
    {
      where: {
        type: {
          not: BOARD_TYPES.dashboard,
        },
      },
    },
    {},
  );
  expect(getUserBoardsMock).not.toHaveBeenCalled();
});

test('GET returns the full catalog for view-only', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'viewer-1', role: 'view-only', isAdmin: false } },
    query: {},
    error: undefined,
  });
  getQueryFiltersMock.mockResolvedValue({});
  canViewAllResourcesMock.mockReturnValue(true);
  getBoardsMock.mockResolvedValue({ data: [{ id: 'board-1' }] } as any);

  const response = await GET(new Request('http://localhost/api/boards'));

  expect(response.status).toBe(200);
  expect(getBoardsMock).toHaveBeenCalled();
  expect(getUserBoardsMock).not.toHaveBeenCalled();
});

test('GET returns owned boards for a user role', async () => {
  parseRequestMock.mockResolvedValue({
    auth: { user: { id: 'user-1', role: 'user', isAdmin: false } },
    query: {},
    error: undefined,
  });
  getQueryFiltersMock.mockResolvedValue({});
  canViewAllResourcesMock.mockReturnValue(false);
  getUserBoardsMock.mockResolvedValue({ data: [{ id: 'board-owned' }] } as any);

  const response = await GET(new Request('http://localhost/api/boards'));

  expect(response.status).toBe(200);
  expect(getUserBoardsMock).toHaveBeenCalledWith('user-1', {});
  expect(getBoardsMock).not.toHaveBeenCalled();
});
