import { NextRequest, NextResponse } from 'next/server';
import {
  getAnalyticsReportRequests,
  getAnalyticsReport,
  getAnalyticsReports,
  requestReport,
  getAnalyticsReportInstances,
  readAnalyticsReport,
} from '@/lib/app-store-connect/analytics';
import prisma from '@/lib/prisma';
import {
  generateJWT,
  isAppStoreConnectJWTExpired,
} from '@/lib/app-store-connect/auth';
import { validateCronSecret } from '@/lib/utils/cron-auth';

export async function GET(request: NextRequest) {
  const authError = validateCronSecret(request);
  if (authError) return authError;

  try {
    // 1. Fetch all user apps that need analytics updates
    const userApps = await prisma.app.findMany({
      include: {
        team: {
          select: {
            id: true,
            appStoreConnectJWT: true,
            appStoreConnectJWTExpiresAt: true,
            appStoreConnectIssuerId: true,
            appStoreConnectKeyId: true,
            appStoreConnectPrivateKey: true,
          },
        },
      },
    });

    // 2. For each app, retrieve analytics
    const results = [];

    for (const app of userApps) {
      if (!app.team.appStoreConnectJWT) {
        continue;
      }

      // Refresh JWT if expired
      let jwt = app.team.appStoreConnectJWT;
      if (isAppStoreConnectJWTExpired(jwt)) {
        if (
          !app.team.appStoreConnectIssuerId ||
          !app.team.appStoreConnectKeyId ||
          !app.team.appStoreConnectPrivateKey
        ) {
          console.log(`Team ${app.team.id} missing ASC credentials, skipping`);
          continue;
        }
        jwt = await generateJWT(
          app.team.appStoreConnectIssuerId,
          app.team.appStoreConnectKeyId,
          app.team.appStoreConnectPrivateKey
        );
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 20);
        await prisma.team.update({
          where: { id: app.team.id },
          data: {
            appStoreConnectJWT: jwt,
            appStoreConnectJWTExpiresAt: expiresAt,
          },
        });
      }

      let reportRequests = await getAnalyticsReportRequests(
        jwt,
        app.storeAppId
      );
      // console.log('reportRequests', JSON.stringify(reportRequests, null, 2));
      reportRequests = reportRequests.filter(
        (report) => report.attributes.stoppedDueToInactivity === false
      );
      if (!reportRequests.length) {
        await requestReport(jwt, app.storeAppId);
        console.log('requested report, and going to get the list again');
        reportRequests = await getAnalyticsReportRequests(jwt, app.storeAppId);
      }

      if (!reportRequests.length) {
        console.log('no report requests found');
        continue;
      }

      const reportRequestId = reportRequests[0].id;

      // const analyticsReport = await getAnalyticsReport(
      //   jwt,
      //   app.storeAppId,
      //   reportRequestId
      // );
      // console.log('analyticsReport', JSON.stringify(analyticsReport, null, 2));
      const analyticsReports = await getAnalyticsReports(jwt, reportRequestId);
      console.log(`analytics reports: ${analyticsReports.length}`);

      const instances = await getAnalyticsReportInstances(
        jwt,
        analyticsReports[0].id
      );
      console.log('instances', JSON.stringify(instances, null, 2));
      console.log(`instances: ${instances.length}`);
      // console.log(
      //   'analyticsReports',
      //   JSON.stringify(analyticsReports, null, 2)
      // );

      // NOTE: download is "APP_USAGE"
      const engagementInstance = analyticsReports.find(
        (report) => report.attributes.category === 'APP_STORE_ENGAGEMENT'
      );

      if (!engagementInstance) {
        console.log('still generating report');
        continue;
      }

      console.log(
        'engagementInstance',
        JSON.stringify(engagementInstance, null, 2)
      );

      const instanceData = await readAnalyticsReport(
        jwt,
        engagementInstance.id
      );
      console.log('instanceData', JSON.stringify(instanceData, null, 2));
      // // 3. Insert into DB or update
      // const stored = await db.analytics.create({
      //   data: {
      //     appId: app.appId,
      //     userId: app.userId,
      //     date: new Date(),
      //     impressions: analyticsReports?.data?.impressions || 0,
      //     // ...
      //   },
      // });

      results.push(instanceData);
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
