import WeeklyDigestEmail, {
  WeeklyDigestApp,
} from '@/components/emails/weekly-digest';
import { sendEmail } from '@/lib/resend';

export async function sendWeeklyDigestEmail(
  to: string,
  teamName: string,
  apps: WeeklyDigestApp[],
  weekOf: string
) {
  const subject = `Weekly ASO digest — ${weekOf}`;
  const react = WeeklyDigestEmail({ teamName, apps, weekOf });

  await sendEmail({
    to,
    subject,
    react,
    marketing: true,
    test: process.env.NODE_ENV === 'development',
  });
}
