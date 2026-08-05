import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Landmark, WalletCards, SlidersHorizontal } from "lucide-react";
import PerformancePanel from "@/components/creator-dashboard/PerformancePanel";
import CommissionStatusPanel from "@/components/creator-dashboard/CommissionStatusPanel";
import PayoutReadinessPanel from "@/components/creator-dashboard/PayoutReadinessPanel";
import AdjustmentsPanel from "@/components/creator-dashboard/AdjustmentsPanel";
import UpgradePrompt from "@/components/UpgradePrompt";

type DashboardSummary = { byState: Record<string, { count: number; totalUsd: number }> };

export default function CreatorOverview() {
  // The summary call doubles as the tier-gate check — assertFeatureEnabled
  // server-side throws permission-denied for non-creator tiers, which we
  // handle here as "show the upgrade prompt" rather than a broken page.
  const { data, isLoading, isError, error } = useQuery<DashboardSummary>({
    queryKey: ["/api/creator/commission-summary"],
    queryFn: () => apiRequest("/api/creator/commission-summary") as Promise<DashboardSummary>,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    // commission-summary is served by the api HTTP router (not a Firebase
    // callable — see queryClient.ts), so a tier-gate rejection surfaces as
    // an Error thrown by throwIfResNotOk with a "403: ..." message, not a
    // callable SDK error with a functions/permission-denied code.
    const isPermissionDenied = (error as Error)?.message?.startsWith("403:");
    if (isPermissionDenied) {
      return (
        <UpgradePrompt
          title="The creator dashboard is a Creator Pro feature"
          description="Upgrade to track performance, commission status, payout readiness, and adjustments for the retail links you share."
          secondaryCta={{ label: "Learn about the creator program", href: "/creator-program" }}
          className=""
        />
      );
    }
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-destructive">
          Something went wrong loading the creator dashboard. Please try again shortly.
        </p>
      </div>
    );
  }

  void data;

  return (
    <div className="space-y-6" data-testid="creator-overview">
      <div>
        <h2 className="text-2xl font-bold" data-testid="creator-overview-title">
          Creator Tools
        </h2>
        <p className="mt-1 text-muted-foreground">
          Performance, commission status, payout readiness, and adjustments — kept visibly separate.
        </p>
      </div>

      <Tabs defaultValue="performance">
        <TabsList>
          <TabsTrigger value="performance">
            <BarChart3 className="mr-2 h-4 w-4" /> Performance
          </TabsTrigger>
          <TabsTrigger value="commissions">
            <Landmark className="mr-2 h-4 w-4" /> Commission status
          </TabsTrigger>
          <TabsTrigger value="payouts">
            <WalletCards className="mr-2 h-4 w-4" /> Payout readiness
          </TabsTrigger>
          <TabsTrigger value="adjustments">
            <SlidersHorizontal className="mr-2 h-4 w-4" /> Adjustments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="mt-6">
          <PerformancePanel />
        </TabsContent>
        <TabsContent value="commissions" className="mt-6">
          <CommissionStatusPanel />
        </TabsContent>
        <TabsContent value="payouts" className="mt-6">
          <PayoutReadinessPanel />
        </TabsContent>
        <TabsContent value="adjustments" className="mt-6">
          <AdjustmentsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
