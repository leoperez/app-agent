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

export interface WeeklyDigestApp {
  title: string;
  iconUrl: string | null;
  latestRating: number | null;
  ratingTrend: number | null;
  keywordCount: number;
  top10Keywords: number;
  avgKeywordPosition: number | null;
  recentNegativeReviews: number;
}

interface WeeklyDigestEmailProps {
  teamName: string;
  apps: WeeklyDigestApp[];
  weekOf: string; // e.g. "Apr 7 – Apr 13, 2026"
}

function TrendBadge({ trend }: { trend: number | null }) {
  if (trend === null || trend === 0) return null;
  const positive = trend > 0;
  return (
    <span
      style={{
        marginLeft: 4,
        fontSize: 11,
        color: positive ? '#16a34a' : '#dc2626',
      }}
    >
      {positive ? `▲ +${trend}` : `▼ ${trend}`}
    </span>
  );
}

export default function WeeklyDigestEmail({
  teamName,
  apps,
  weekOf,
}: WeeklyDigestEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your weekly ASO digest — {weekOf}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded border border-solid border-gray-200 px-10 py-5">
            <Text className="mx-0 mb-1 mt-4 p-0 text-2xl font-semibold text-gray-900">
              Weekly ASO Digest
            </Text>
            <Text className="mt-0 text-sm text-gray-500">
              {weekOf} · {teamName}
            </Text>

            {apps.map((app, i) => (
              <Section
                key={i}
                className="my-4 rounded-lg border border-solid border-gray-100 p-4"
              >
                <Text className="m-0 text-base font-semibold text-gray-900">
                  {app.title}
                </Text>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                    marginTop: '12px',
                  }}
                >
                  <div>
                    <Text className="m-0 text-xs text-gray-400">Rating</Text>
                    <Text className="m-0 text-sm font-medium text-gray-700">
                      {app.latestRating != null
                        ? `${app.latestRating.toFixed(1)} ★`
                        : '—'}
                      <TrendBadge trend={app.ratingTrend} />
                    </Text>
                  </div>
                  <div>
                    <Text className="m-0 text-xs text-gray-400">
                      Keywords tracked
                    </Text>
                    <Text className="m-0 text-sm font-medium text-gray-700">
                      {app.keywordCount}
                    </Text>
                  </div>
                  <div>
                    <Text className="m-0 text-xs text-gray-400">Top 10</Text>
                    <Text className="m-0 text-sm font-medium text-gray-700">
                      {app.top10Keywords}
                    </Text>
                  </div>
                  <div>
                    <Text className="m-0 text-xs text-gray-400">
                      Avg position
                    </Text>
                    <Text className="m-0 text-sm font-medium text-gray-700">
                      {app.avgKeywordPosition != null
                        ? `#${app.avgKeywordPosition}`
                        : '—'}
                    </Text>
                  </div>
                  <div>
                    <Text className="m-0 text-xs text-gray-400">
                      Negative reviews (7d)
                    </Text>
                    <Text
                      className={`m-0 text-sm font-medium ${app.recentNegativeReviews > 0 ? 'text-red-600' : 'text-gray-700'}`}
                    >
                      {app.recentNegativeReviews}
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
                Open dashboard
              </a>
            </Section>

            <Hr className="mt-6" />
            <Text className="text-xs text-gray-400">
              © {new Date().getFullYear()} {WHITE_LABEL_CONFIG.appName}
              {' · '}
              You are receiving this because you are a member of{' '}
              <strong>{teamName}</strong>.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
