import CompetitorChangesEmail, {
  CompetitorChangeEntry,
} from '@/components/emails/competitor-changes';
import { sendEmail } from '@/lib/resend';
import { createTranslator } from 'next-intl';

export async function sendCompetitorChangesEmail(
  to: string,
  changes: CompetitorChangeEntry[],
  locale = 'en'
) {
  const react = await CompetitorChangesEmail({ changes, locale });

  const messages = (await import(`../../../locales/${locale}.json`)).default;
  const t = createTranslator({
    locale,
    messages,
    namespace: 'emails.competitor-changes',
  });
  const subject =
    changes.length === 1
      ? t('subject-single')
      : t('subject-plural', { count: changes.length });

  await sendEmail({
    to,
    subject,
    react,
    system: true,
    test: process.env.NODE_ENV === 'development',
  });
}
