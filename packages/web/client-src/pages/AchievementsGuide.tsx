import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { ArrowLeft, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ACHIEVEMENT_DEFINITIONS, ACHIEVEMENT_TIER_NAMES } from "@/lib/achievements";
import { useAchievements } from "@/hooks/use-achievements";

export default function AchievementsGuide() {
  const { data } = useAchievements();
  const achievements = data?.achievements ?? {};

  return (
    <div className="container mx-auto px-4 py-6 2xl:py-8 max-w-3xl" data-testid="achievements-guide-page">
      <Helmet>
        <title>Achievements Guide | Wishlist Wizard</title>
      </Helmet>

      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
        <Link href="/app/user-profile">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Profile
        </Link>
      </Button>

      <h1 className="text-2xl font-bold mb-1">Achievements Guide</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Here's how each achievement badge is earned.
      </p>

      <div className="space-y-3">
        {ACHIEVEMENT_DEFINITIONS.map((achievement) => {
          const state = achievements[achievement.id];
          const tierName = state && state.tier > 0 ? ACHIEVEMENT_TIER_NAMES[state.tier - 1] : null;
          const nextThreshold =
            achievement.tiered && state && state.tier < 5 ? achievement.thresholds?.[state.tier] : undefined;

          return (
            <Card key={achievement.id} data-testid={`achievements-guide-item-${achievement.id}`}>
              <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                <span className="text-3xl leading-none" aria-hidden="true">{achievement.icon}</span>
                <div className="flex-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    {achievement.name}
                    {state?.earned && (
                      <span className="inline-flex items-center gap-1 text-xs font-normal text-primary">
                        <Check className="h-3 w-3" />
                        {tierName ? `${tierName}` : "Earned"}
                      </span>
                    )}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">{achievement.description}</p>
                {achievement.tiered && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {nextThreshold !== undefined
                      ? `${state?.count ?? 0} / ${nextThreshold} toward ${ACHIEVEMENT_TIER_NAMES[(state?.tier ?? 0)]}`
                      : `${state?.count ?? 0} — Wizard tier reached`}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
