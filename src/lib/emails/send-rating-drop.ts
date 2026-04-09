import RatingDropEmail, {
  RatingDropEntry,
} from '@/components/emails/rating-drop';
import { sendEmail } from '@/lib/resend';
import { createTranslator } from 'next-intl';

export async function sendRatingDropEmail(
  to: string,
  drops: RatingDropEntry[],
  locale = 'en'
) {
  const messages = (await import(`../../../locales/${locale}.json`)).default;
  const t = createTranslator({
    locale,
    messages,
    namespace: 'emails.rating-drop',
  });

  const subject =
    drops.length === 1
      ? t('subject-single', { app: drops[0].appTitle })
      : t('subject-plural', { count: drops.length });

  const react = await RatingDropEmail({ drops, locale });

  await sendEmail({
    to,
    subject,
    react,
    system: true,
    test: process.env.NODE_ENV === 'development',
  });
}
