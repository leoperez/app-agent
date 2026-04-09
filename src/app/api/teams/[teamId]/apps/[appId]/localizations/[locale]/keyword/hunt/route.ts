import prisma from '@/lib/prisma';
import { validateTeamAccess } from '@/lib/auth';
import {
  AppNotFoundError,
  handleAppError,
  InvalidParamsError,
} from '@/types/errors';
import { googlePlayToAppStore } from '@/lib/utils/locale';
import { draftVersion, publicVersion } from '@/lib/utils/versions';
import { Store } from '@/types/aso';
import { selectAndScoreKeywords } from '@/lib/aso/keyword-hunt/select-and-score-keywords';
import { createStreamingResponse } from '@/lib/utils/streaming';
import { checkRateLimit } from '@/lib/utils/rate-limit';

export const maxDuration = 300;

// Run keyword research and make suggestion
export async function POST(
  request: Request,
  { params }: { params: { teamId: string; appId: string; locale: string } }
) {
  try {
    const { teamId, userId } = await validateTeamAccess(request);
    await checkRateLimit(`keyword-hunt:${userId}`, 3, '1 h');

    const { appId, locale } = params;
    const data = await request.json();

    if (!data.shortDescription || !data.store || !data.platform) {
      throw new InvalidParamsError('Missing required fields');
    }

    // Verify app belongs to team
    const app = await prisma.app.findFirst({
      where: { id: appId, teamId },
      include: {
        versions: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    if (!app) {
      throw new AppNotFoundError(`App ${appId} not found`);
    }

    let appVersion = app.versions.find((v) => v.state && draftVersion(v.state));

    if (!appVersion && app.store === Store.GOOGLEPLAY) {
      appVersion = app.versions.find((v) => v.state && publicVersion(v.state));
    }

    if (!appVersion) {
      throw new InvalidParamsError(
        app.store === Store.GOOGLEPLAY
          ? 'No version found for this app'
          : 'No draft version found for this app'
      );
    }

    await prisma.app.update({
      where: { id: appId },
      data: { shortDescription: data.shortDescription },
    });

    const appStoreLocale = googlePlayToAppStore(locale);

    return createStreamingResponse(async (writer) => {
      await selectAndScoreKeywords(
        appId,
        appStoreLocale,
        data.shortDescription,
        data.store,
        data.platform,
        writer,
        locale
      );
    });
  } catch (error) {
    return handleAppError(error as Error);
  }
}
