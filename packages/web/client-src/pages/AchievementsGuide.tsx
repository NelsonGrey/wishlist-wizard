import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { ArrowLeft, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ACHIEVEMENT_DEFINITIONS, ACHIEVEMENT_TIER_NAMES, ACHIEVEMENT_TIER_BADGE_CLASSES, WIZARD_TIER } from "@/lib/achievements";
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

          const tier = state?.tier ?? 0;
          const isWizard = achievement.tiered && tier === WIZARD_TIER;

          return (
            <Card
              key={achievement.id}
              data-testid={`achievements-guide-item-${achievement.id}`}
              className={isWizard ? "bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-300 ring-1 ring-amber-300" : undefined}
            >
              <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                <span className="text-3xl leading-none" aria-hidden="true">{isWizard ? "🧙" : achievement.icon}</span>
                <div className="flex-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    {achievement.name}
                    {state?.earned && !tierName && (
                      <span className="inline-flex items-center gap-1 text-xs font-normal text-primary">
                        <Check className="h-3 w-3" />
                        Earned
                      </span>
                    )}
                    {tierName && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${ACHIEVEMENT_TIER_BADGE_CLASSES[tier]}`}
                      >
                        {isWizard ? "✨ " : ""}{tierName}
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
                      ? `${state?.count ?? 0} / ${nextThreshold} toward ${ACHIEVEMENT_TIER_NAMES[tier]}`
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
