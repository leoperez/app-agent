import prisma from '@/lib/prisma';

export async function logCron({
  cronName,
  startTime,
  recordsProcessed = 0,
  error,
}: {
  cronName: string;
  startTime: number;
  recordsProcessed?: number;
  error?: unknown;
}) {
  const durationMs = Date.now() - startTime;
  const status = error ? 'error' : 'success';
  const errorMessage =
    error instanceof Error ? error.message : error ? String(error) : undefined;

  try {
    await prisma.cronLog.create({
      data: { cronName, status, recordsProcessed, durationMs, errorMessage },
    });
  } catch {
    // Don't let logging failures break the cron
    console.error(`[logCron] failed to log ${cronName}:`, error);
  }
}
