import { z } from 'zod';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { pagingParams, searchParams, sortingParams } from '@/lib/schema';
import { canViewAllResources } from '@/permissions';
import {
  getAllUserWebsitesIncludingTeamAccess,
  getUserWebsites,
  getWebsites,
} from '@/queries/prisma/website';

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const schema = z.object({
    ...pagingParams,
    ...searchParams,
    ...sortingParams,
    includeTeams: z.string().optional(),
  });

  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { userId } = await params;

  if (!auth.user.isAdmin && auth.user.id !== userId) {
    return unauthorized();
  }

  const filters = await getQueryFilters(query);

  if (canViewAllResources(auth) && auth.user.id === userId) {
    return json(
      await getWebsites(
        {
          include: {
            user: {
              select: {
                username: true,
                id: true,
              },
            },
          },
        },
        filters,
      ),
    );
  }

  if (query.includeTeams) {
    return json(await getAllUserWebsitesIncludingTeamAccess(userId, filters));
  }

  return json(await getUserWebsites(userId, filters));
}
