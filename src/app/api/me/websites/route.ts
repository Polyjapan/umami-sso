import { z } from 'zod';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { json } from '@/lib/response';
import { pagingParams, sortingParams } from '@/lib/schema';
import { canViewAllResources } from '@/permissions';
import {
  getAllUserWebsitesIncludingTeamAccess,
  getUserWebsites,
  getWebsites,
} from '@/queries/prisma';

export async function GET(request: Request) {
  const schema = z.object({
    ...pagingParams,
    ...sortingParams,
    includeTeams: z.string().optional(),
  });

  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const filters = await getQueryFilters(query);

  if (canViewAllResources(auth)) {
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
    return json(await getAllUserWebsitesIncludingTeamAccess(auth.user.id, filters));
  }

  return json(await getUserWebsites(auth.user.id, filters));
}
