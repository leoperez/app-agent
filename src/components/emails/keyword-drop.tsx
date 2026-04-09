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

export interface KeywordDropEntry {
  appTitle: string;
  keyword: string;
  locale: string;
  previousPosition: number | null;
  newPosition: number | null;
}

interface KeywordDropEmailProps {
  drops: KeywordDropEntry[];
  locale?: string;
}

export default async function KeywordDropEmail({
  drops,
  locale = 'en',
}: KeywordDropEmailProps) {
  const t = createTranslator({
    locale,
    messages: (await import(`../../../locales/${locale}.json`)).default,
    namespace: 'emails.keyword-drop',
  });
  const tCommon = createTranslator({
    locale,
    messages: (await import(`../../../locales/${locale}.json`)).default,
    namespace: 'emails.common',
  });

  const subject =
    drops.length === 1
      ? t('subject-single')
      : t('subject-plural', { count: drops.length });

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

            {drops.map((drop, i) => (
              <Section
                key={i}
                className="my-4 rounded-lg border border-solid border-gray-200 p-4"
              >
                <Text className="m-0 text-sm font-semibold text-gray-900">
                  {drop.keyword}
                </Text>
                <Text className="m-0 text-xs text-gray-500">
                  {drop.appTitle} · {drop.locale}
                </Text>
                <div
                  style={{
                    display: 'flex',
                    gap: '24px',
                    marginTop: '8px',
                  }}
                >
                  <div>
                    <Text className="m-0 text-xs text-gray-400">
                      {t('field-previous')}
                    </Text>
                    <Text className="m-0 text-sm font-medium text-gray-700">
                      {drop.previousPosition != null
                        ? `#${drop.previousPosition}`
                        : t('dropped-out')}
                    </Text>
                  </div>
                  <div>
                    <Text className="m-0 text-xs text-gray-400">
                      {t('field-new')}
                    </Text>
                    <Text className="m-0 text-sm font-medium text-red-600">
                      {drop.newPosition != null
                        ? `#${drop.newPosition}`
                        : t('dropped-out')}
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
