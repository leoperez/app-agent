import CompetitorChangesEmail, {
  CompetitorChangeEntry,
} from '@/components/emails/competitor-changes';
import { sendEmail } from '@/lib/resend';

export async function sendCompetitorChangesEmail(
  to: string,
  changes: CompetitorChangeEntry[],
  locale = 'en'
) {
  const react = await CompetitorChangesEmail({ changes, locale });
  const subject =
    changes.length === 1
      ? '1 competitor update detected'
      : `${changes.length} competitor updates detected`;

  await sendEmail({
    to,
    subject,
    react,
    system: true,
    test: process.env.NODE_ENV === 'development',
  });
}
