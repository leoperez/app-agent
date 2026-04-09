import InvitationEmail from '@/components/emails/invitation';
import { sendEmail } from '@/lib/resend';
import { createTranslator } from 'next-intl';

export async function sendInvitationEmail({
  to,
  inviteUrl,
  teamName,
  inviterName,
  locale = 'en',
}: {
  to: string;
  inviteUrl: string;
  teamName: string;
  inviterName?: string | null;
  locale?: string;
}) {
  const messages = (await import(`../../../locales/${locale}.json`)).default;
  const t = createTranslator({
    locale,
    messages,
    namespace: 'emails.invitation',
  });

  const react = await InvitationEmail({
    inviteUrl,
    teamName,
    inviterName,
    locale,
  });

  await sendEmail({
    to,
    subject: t('subject', { teamName }),
    react,
    system: true,
    test: process.env.NODE_ENV === 'development',
  });
}
