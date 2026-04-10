import { Card, CardHeader, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { FiStar, FiUsers, FiSettings } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useTeam } from '@/context/team';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { mutate } from 'swr';

export function TeamSettings() {
  const teamInfo = useTeam();
  const router = useRouter();
  const t = useTranslations('account');
  const [savingApproval, setSavingApproval] = useState(false);

  const handleToggleApproval = async (checked: boolean) => {
    const teamId = teamInfo?.currentTeam?.id;
    if (!teamId) return;
    setSavingApproval(true);
    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requiresApproval: checked }),
      });
      if (!res.ok) throw new Error('Failed');
      await mutate('/api/teams');
      toast.success(
        checked
          ? t('approval-workflow-enabled')
          : t('approval-workflow-disabled')
      );
    } catch {
      toast.error(t('approval-workflow-save-failed'));
    } finally {
      setSavingApproval(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center space-x-2">
            <FiUsers className="h-5 w-5" />
            <h2 className="text-xl font-semibold">{t('teams')}</h2>
          </div>
          {/* <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/teams')}
            className="flex items-center space-x-2"
          >
            <FiSettings className="h-4 w-4" />
            <span>{t('manage-teams')}</span>
          </Button> */}
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">{t('select-team')}</label>
            <Select
              value={teamInfo?.currentTeam?.id}
              onValueChange={(teamId) => {
                const team = teamInfo?.teams.find((team) => team.id === teamId);
                if (team && teamInfo) {
                  teamInfo.setCurrentTeam(team);
                }
              }}
            >
              <SelectTrigger className="w-full mt-1">
                <SelectValue>
                  <div className="flex items-center space-x-2">
                    <span>{teamInfo?.currentTeam?.name}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {teamInfo?.teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    <div className="flex items-center space-x-2">
                      <span>{team.name}</span>
                      {team.id === teamInfo?.currentTeam?.id && (
                        <FiStar className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Approval workflow toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div>
              <p className="text-sm font-medium">{t('approval-workflow')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('approval-workflow-description')}
              </p>
            </div>
            <button
              role="switch"
              aria-checked={!!teamInfo?.currentTeam?.requiresApproval}
              disabled={savingApproval}
              onClick={() =>
                handleToggleApproval(!teamInfo?.currentTeam?.requiresApproval)
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                teamInfo?.currentTeam?.requiresApproval
                  ? 'bg-primary'
                  : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  teamInfo?.currentTeam?.requiresApproval
                    ? 'translate-x-6'
                    : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
