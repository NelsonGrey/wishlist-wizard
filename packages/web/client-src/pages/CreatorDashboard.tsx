import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Landmark, WalletCards, SlidersHorizontal, Lock } from "lucide-react";
import PerformancePanel from "@/components/creator-dashboard/PerformancePanel";
import CommissionStatusPanel from "@/components/creator-dashboard/CommissionStatusPanel";
import PayoutReadinessPanel from "@/components/creator-dashboard/PayoutReadinessPanel";
import AdjustmentsPanel from "@/components/creator-dashboard/AdjustmentsPanel";

type DashboardSummary = { byState: Record<string, { count: number; totalUsd: number }> };

function UpgradePrompt() {
  return (
    <div className="site-container py-16">
      <Card className="mx-auto max-w-xl text-center">
        <CardHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
            <Lock className="h-6 w-6" aria-hidden="true" />
          </div>
          <CardTitle className="mt-4">The creator dashboard is a Creator Pro feature</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upgrade to track performance, commission status, payout readiness, and adjustments for the retail links
            you share.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/subscriptions">Compare plans</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/creator-program">Learn about the creator program</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CreatorDashboard() {
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
      <div className="site-container space-y-4 py-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    const isPermissionDenied = (error as any)?.code === "functions/permission-denied";
    if (isPermissionDenied) {
      return <UpgradePrompt />;
    }
    return (
      <div className="site-container py-16 text-center">
        <p className="text-sm text-destructive">
          Something went wrong loading the creator dashboard. Please try again shortly.
        </p>
      </div>
    );
  }

  void data;

  return (
    <>
      <Helmet>
        <title>Creator Dashboard | Wishlist Wizard</title>
      </Helmet>

      <div className="site-container space-y-6 py-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-950" data-testid="creator-dashboard-title">
            Creator Dashboard
          </h1>
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
    </>
  );
}
