import KeywordDropEmail, {
  KeywordDropEntry,
} from '@/components/emails/keyword-drop';
import { sendEmail } from '@/lib/resend';
import { createTranslator } from 'next-intl';

export async function sendKeywordDropEmail(
  to: string,
  drops: KeywordDropEntry[],
  locale = 'en'
) {
  const messages = (await import(`../../../locales/${locale}.json`)).default;
  const t = createTranslator({
    locale,
    messages,
    namespace: 'emails.keyword-drop',
  });

  const subject =
    drops.length === 1
      ? t('subject-single')
      : t('subject-plural', { count: drops.length });

  const react = await KeywordDropEmail({ drops, locale });

  await sendEmail({
    to,
    subject,
    react,
    system: true,
    test: process.env.NODE_ENV === 'development',
  });
}
