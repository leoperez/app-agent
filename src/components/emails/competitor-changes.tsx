import {
  Body,
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

export interface CompetitorChangeEntry {
  competitorTitle: string;
  appTitle: string;
  locale: string;
  field: string;
  previousValue: string | null;
  newValue: string | null;
}

interface CompetitorChangesEmailProps {
  changes: CompetitorChangeEntry[];
  locale?: string;
}

export default async function CompetitorChangesEmail({
  changes,
  locale = 'en',
}: CompetitorChangesEmailProps) {
  const t = createTranslator({
    locale,
    messages: (await import(`../../../locales/${locale}.json`)).default,
    namespace: 'emails.competitor-changes',
  });
  const tCommon = createTranslator({
    locale,
    messages: (await import(`../../../locales/${locale}.json`)).default,
    namespace: 'emails.common',
  });

  const subject =
    changes.length === 1
      ? t('subject-single')
      : t('subject-plural', { count: changes.length });

  const fieldLabel: Record<string, string> = {
    title: t('field-title'),
    subtitle: t('field-subtitle'),
    description: t('field-description'),
  };

  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-gray-200 px-10 py-5">
            <Text className="mx-0 mb-4 mt-4 p-0 text-2xl font-semibold text-gray-900">
              {t('title')}
            </Text>
            <Text className="text-sm text-gray-600">{t('intro')}</Text>

            {changes.map((change, i) => (
              <Section
                key={i}
                className="my-4 rounded-lg border border-solid border-gray-200 p-4"
              >
                <Text className="m-0 text-sm font-semibold text-gray-900">
                  {change.competitorTitle}
                </Text>
                <Text className="m-0 text-xs text-gray-500">
                  {change.appTitle} · {change.locale} ·{' '}
                  {fieldLabel[change.field] ?? change.field} {t('changed')}
                </Text>
                {change.previousValue && (
                  <Text className="mt-2 mb-0 text-xs text-gray-500 line-through">
                    {change.previousValue.slice(0, 200)}
                    {change.previousValue.length > 200 ? '…' : ''}
                  </Text>
                )}
                <Text className="mt-1 mb-0 text-sm text-gray-900">
                  {(change.newValue ?? t('empty')).slice(0, 200)}
                  {(change.newValue ?? '').length > 200 ? '…' : ''}
                </Text>
              </Section>
            ))}

            <Section className="mt-6 text-center">
              <a
                href={`${NEXT_PUBLIC_BASE_URL}/dashboard`}
                style={{
                  display: 'inline-block',
                  padding: '10px 20px',
                  backgroundColor: '#000',
                  color: '#fff',
                  borderRadius: '6px',
                  fontSize: '13px',
                  textDecoration: 'none',
                }}
              >
                {t('cta')}
              </a>
            </Section>

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
