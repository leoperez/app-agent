import KeywordRiseEmail, {
  KeywordRiseEntry,
} from '@/components/emails/keyword-rise';
import { sendEmail } from '@/lib/resend';
import { createTranslator } from 'next-intl';

export async function sendKeywordRiseEmail(
  to: string,
  rises: KeywordRiseEntry[],
  locale = 'en'
) {
  const messages = (await import(`../../../locales/${locale}.json`)).default;
  const t = createTranslator({
    locale,
    messages,
    namespace: 'emails.keyword-rise',
  });

  const subject =
    rises.length === 1
      ? t('subject-single')
      : t('subject-plural', { count: rises.length });

  const react = await KeywordRiseEmail({ rises, locale });

  await sendEmail({
    to,
    subject,
    react,
    system: true,
    test: process.env.NODE_ENV === 'development',
  });
}
