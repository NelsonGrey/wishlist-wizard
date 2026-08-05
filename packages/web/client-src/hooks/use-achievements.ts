import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/queryClient';

export interface AchievementState {
  earned: boolean;
  /** 0 = not earned. For tiered achievements, 1-5 = Apprentice..Wizard. For one-time achievements, 1 once earned. */
  tier: number;
  /** Raw current count backing a tiered achievement's progress display. Always 0 for one-time achievements. */
  count: number;
}

export interface AchievementsResponse {
  achievements: Record<string, AchievementState>;
  computedAt: string;
}

/** Fetches the current user's earned achievements/tiers via GET /api/achievements. */
export function useAchievements() {
  const { user } = useAuth();

  return useQuery<AchievementsResponse>({
    queryKey: ['achievements', user?.uid],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      return apiRequest('/api/achievements') as Promise<AchievementsResponse>;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}
