import CompetitorChangesEmail, {
  CompetitorChangeEntry,
} from '@/components/emails/competitor-changes';
import { sendEmail } from '@/lib/resend';

export async function sendCompetitorChangesEmail(
  to: string,
  changes: CompetitorChangeEntry[]
) {
  const react = await CompetitorChangesEmail({ changes });
  await sendEmail({
    to,
    subject: `${changes.length} competitor update${changes.length > 1 ? 's' : ''} detected`,
    react,
    system: true,
    test: process.env.NODE_ENV === 'development',
  });
}
