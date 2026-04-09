import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';
import { NEXT_PUBLIC_BASE_URL, WHITE_LABEL_CONFIG } from '@/lib/config';
import { createTranslator } from 'next-intl';

interface InvitationEmailProps {
  inviteUrl: string;
  teamName: string;
  inviterName?: string | null;
  locale?: string;
}

export default async function InvitationEmail({
  inviteUrl,
  teamName,
  inviterName,
  locale = 'en',
}: InvitationEmailProps) {
  const t = createTranslator({
    locale,
    messages: (await import(`../../../locales/${locale}.json`)).default,
    namespace: 'emails.invitation',
  });
  const tCommon = createTranslator({
    locale,
    messages: (await import(`../../../locales/${locale}.json`)).default,
    namespace: 'emails.common',
  });

  const subject = t('subject', { teamName });

  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[500px] rounded border border-solid border-gray-200 px-10 py-5">
            <Text className="mx-0 mb-4 mt-4 p-0 text-2xl font-semibold text-gray-900">
              {t('title')}
            </Text>
            <Text className="text-sm text-gray-600">
              {t('intro', {
                inviter: inviterName || WHITE_LABEL_CONFIG.appName,
                teamName,
              })}
            </Text>
            <Text className="text-sm text-gray-600">{t('description')}</Text>
            <Section className="mb-8 mt-6 text-center">
              <Button
                className="rounded bg-black text-center text-xs font-semibold text-white no-underline"
                href={inviteUrl}
                style={{ padding: '12px 20px' }}
              >
                {t('cta')}
              </Button>
            </Section>
            <Text className="text-xs text-gray-400">
              {t('link-note')}
              <br />
              {inviteUrl}
            </Text>
            <Hr className="mt-6" />
            <Text className="text-xs text-gray-400">
              © {new Date().getFullYear()} {WHITE_LABEL_CONFIG.appName}
              {' · '}
              {tCommon('questions')}
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
