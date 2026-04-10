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

export interface KeywordRiseEntry {
  appTitle: string;
  keyword: string;
  locale: string;
  previousPosition: number | null; // null = was unranked
  newPosition: number;
}

interface KeywordRiseEmailProps {
  rises: KeywordRiseEntry[];
  locale?: string;
}

export default async function KeywordRiseEmail({
  rises,
  locale = 'en',
}: KeywordRiseEmailProps) {
  const t = createTranslator({
    locale,
    messages: (await import(`../../../locales/${locale}.json`)).default,
    namespace: 'emails.keyword-rise',
  });
  const tCommon = createTranslator({
    locale,
    messages: (await import(`../../../locales/${locale}.json`)).default,
    namespace: 'emails.common',
  });

  const subject =
    rises.length === 1
      ? t('subject-single')
      : t('subject-plural', { count: rises.length });

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

            {rises.map((rise, i) => (
              <Section
                key={i}
                className="my-4 rounded-lg border border-solid border-green-200 p-4"
                style={{ backgroundColor: '#f0fdf4' }}
              >
                <Text className="m-0 text-sm font-semibold text-gray-900">
                  {rise.keyword}
                </Text>
                <Text className="m-0 text-xs text-gray-500">
                  {rise.appTitle} · {rise.locale}
                </Text>
                <div style={{ display: 'flex', gap: '24px', marginTop: '8px' }}>
                  <div>
                    <Text className="m-0 text-xs text-gray-400">
                      {t('field-previous')}
                    </Text>
                    <Text className="m-0 text-sm font-medium text-gray-500">
                      {rise.previousPosition != null
                        ? `#${rise.previousPosition}`
                        : t('new-entry')}
                    </Text>
                  </div>
                  <div>
                    <Text className="m-0 text-xs text-gray-400">
                      {t('field-new')}
                    </Text>
                    <Text className="m-0 text-sm font-bold text-green-600">
                      #{rise.newPosition}
                    </Text>
                  </div>
                </div>
              </Section>
            ))}

            <Section className="mt-6 text-center">
              <a
                href={`${NEXT_PUBLIC_BASE_URL}/dashboard`}
                style={{
                  display: 'inline-block',
                  padding: '10px 20px',
                  backgroundColor: '#16a34a',
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
