import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import StatCard from "@/components/StatCard";

type AnalyticsSummary = {
  totalEvents: number;
  byCategory: Record<string, number>;
};

type AnalyticsEvent = {
  id: string;
  action: string;
  category?: string | null;
  label?: string | null;
  value?: number | null;
  createdAt?: string | Date;
};

type AdRevenueSummary = {
  windowDays: number;
  ecpmUsd: number;
  rendered: number;
  viewableImpressions: number;
  clickSignals: number;
  clickThroughRate: number;
  viewabilityRate: number;
  renderFailures: number;
  configMissing: number;
  estimatedRevenueUsd: number;
};

type AdKpiDailySnapshot = {
  id: string;
  date: string;
  ecpmUsd: number;
  metrics: {
    rendered: number;
    viewableImpressions: number;
    clickSignals: number;
    clickThroughRate: number;
    viewabilityRate: number;
    estimatedRevenueUsd: number;
  };
};

const toLower = (value?: string | null) => String(value || "").toLowerCase();

const toCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);

export default function AnalyticsOverview() {
  const adEcpm = Number(import.meta.env.VITE_AD_ECPM_USD || 8);

  const summaryQuery = useQuery<{ summary: AnalyticsSummary }>({
    queryKey: ["/api/analytics/summary"],
    queryFn: () => apiRequest("/api/analytics/summary", { method: "GET" }) as Promise<{ summary: AnalyticsSummary }>,
  });

  const eventsQuery = useQuery<{ events: AnalyticsEvent[] }>({
    queryKey: ["/api/analytics/events"],
    queryFn: () => apiRequest("/api/analytics/events", {
      method: "POST",
      body: { limit: 10 },
    }) as Promise<{ events: AnalyticsEvent[] }>,
  });

  const adRevenueQuery = useQuery<{ summary: AdRevenueSummary }>({
    queryKey: ["/api/analytics/ad-revenue-summary", adEcpm],
    queryFn: async () => {
      try {
        return await apiRequest("/api/analytics/ad-revenue-summary", {
          method: "POST",
          body: { includeGlobal: true, ecpmUsd: adEcpm },
        }) as Promise<{ summary: AdRevenueSummary }>;
      } catch {
        return apiRequest("/api/analytics/ad-revenue-summary", {
          method: "POST",
          body: { ecpmUsd: adEcpm },
        }) as Promise<{ summary: AdRevenueSummary }>;
      }
    },
  });

  const adTrendQuery = useQuery<{ snapshots: AdKpiDailySnapshot[] }>({
    queryKey: ["/api/analytics/ad-kpi-snapshots"],
    queryFn: async () => {
      return apiRequest("/api/analytics/ad-kpi-snapshots", {
        method: "POST",
        body: { days: 14 },
      }) as Promise<{ snapshots: AdKpiDailySnapshot[] }>;
    },
    retry: false,
  });

  const summary = summaryQuery.data?.summary;
  const recentEvents = eventsQuery.data?.events || [];
  const isLoading = summaryQuery.isLoading || eventsQuery.isLoading || adRevenueQuery.isLoading;
  const isError = summaryQuery.isError || eventsQuery.isError || adRevenueQuery.isError;
  const adSummary = adRevenueQuery.data?.summary;
  const adTrendSnapshots = adTrendQuery.data?.snapshots || [];
  const adTrendUnavailable = adTrendQuery.isError;

  const campaignClicks = recentEvents.filter((event) =>
    ["affiliate_click", "outbound_click", "wishlist_click"].some((keyword) =>
      toLower(event.action).includes(keyword) || toLower(event.category).includes(keyword)
    )
  ).length;

  const campaignPurchases = recentEvents.filter((event) =>
    ["purchase", "checkout", "conversion"].some((keyword) =>
      toLower(event.action).includes(keyword) || toLower(event.category).includes(keyword)
    )
  ).length;

  const campaignCommission = recentEvents.reduce((total, event) => {
    const isCommissionEvent =
      toLower(event.action).includes("commission") || toLower(event.category).includes("commission");
    return isCommissionEvent ? total + Number(event.value || 0) : total;
  }, 0);

  const conversionRate = campaignClicks > 0 ? (campaignPurchases / campaignClicks) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analytics Overview</CardTitle>
        <CardDescription>Track clicks, purchases, and commissions across shared wishlist campaigns.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
            Loading analytics data...
          </div>
        ) : null}

        {isError ? (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            We couldn&apos;t load analytics data right now. Please try again.
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard label="Total Events" value={summary?.totalEvents ?? 0} />
          <Card className="p-4 md:col-span-2">
            <p className="text-sm text-muted-foreground mb-2">Events by Category</p>
            {summary?.byCategory && Object.keys(summary.byCategory).length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(summary.byCategory).map(([category, count]) => (
                  <div key={category} className="text-sm">
                    <span className="font-medium">{category}</span>: {count}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No category data yet.</p>
            )}
          </Card>
        </div>

        <Card className="mb-6 border-emerald-200">
          <CardHeader>
            <CardTitle>Ad-Only Monetization Snapshot</CardTitle>
            <CardDescription>
              Early revenue proxy from tracked ad impressions and interaction signals.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Viewable Impressions" value={adSummary?.viewableImpressions ?? 0} />
              <StatCard label="Rendered Slots" value={adSummary?.rendered ?? 0} />
              <StatCard label="Ad Click Signal" value={adSummary?.clickSignals ?? 0} />
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Estimated Ad Revenue</p>
                <p className="text-2xl font-bold">{toCurrency(adSummary?.estimatedRevenueUsd ?? 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Using eCPM {toCurrency(adSummary?.ecpmUsd ?? (Number.isFinite(adEcpm) ? adEcpm : 0))}
                </p>
              </Card>
              <Card className="p-4 lg:col-span-4">
                <p className="text-sm text-muted-foreground">Ad Click-Through Signal</p>
                <p className="text-2xl font-bold">{(adSummary?.clickThroughRate ?? 0).toFixed(2)}%</p>
              </Card>
              <Card className="p-4 lg:col-span-4">
                <p className="text-sm text-muted-foreground">Ad Viewability Rate</p>
                <p className="text-2xl font-bold">{(adSummary?.viewabilityRate ?? 0).toFixed(2)}%</p>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 border-emerald-100">
          <CardHeader>
            <CardTitle>Daily Ad KPI Trend (14 days)</CardTitle>
            <CardDescription>
              Snapshot history from `adKpiDaily` for weekly gate reviews.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {adTrendUnavailable ? (
              <p className="text-sm text-muted-foreground">
                Daily KPI trends are available to admin users.
              </p>
            ) : adTrendSnapshots.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No daily snapshots found yet. Run `/api/analytics/ad-kpi-snapshot` to seed data.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 text-left">Date</th>
                      <th className="py-2 text-right">Impressions</th>
                      <th className="py-2 text-right">CTR</th>
                      <th className="py-2 text-right">Viewability</th>
                      <th className="py-2 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adTrendSnapshots.map((snapshot) => (
                      <tr key={snapshot.id} className="border-b last:border-0">
                        <td className="py-2">{snapshot.date}</td>
                        <td className="py-2 text-right">{snapshot.metrics?.viewableImpressions ?? 0}</td>
                        <td className="py-2 text-right">{(snapshot.metrics?.clickThroughRate ?? 0).toFixed(2)}%</td>
                        <td className="py-2 text-right">{(snapshot.metrics?.viewabilityRate ?? 0).toFixed(2)}%</td>
                        <td className="py-2 text-right">{toCurrency(snapshot.metrics?.estimatedRevenueUsd ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard label="Weekly Clicks" value={campaignClicks} className="border-emerald-100" />
          <StatCard label="Weekly Purchases" value={campaignPurchases} className="border-emerald-100" />
          <StatCard label="Weekly Commission" value={toCurrency(campaignCommission)} className="border-emerald-100" />
          <div className="md:col-span-3">
            <StatCard label="Weekly Conversion Rate" value={`${conversionRate.toFixed(1)}%`} className="border-emerald-100" />
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Recent Events</CardTitle>
            <CardDescription>Latest tracked activity from the platform</CardDescription>
          </CardHeader>
          <CardContent>
            {recentEvents.length > 0 ? (
              <div className="space-y-2">
                {recentEvents.map((event) => (
                  <div key={event.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{event.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.category || "uncategorized"}
                        {event.label ? ` • ${event.label}` : ""}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {event.createdAt ? new Date(event.createdAt).toLocaleString() : ""}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No events tracked yet.</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <p>
            This view helps you understand what converts so you can scale the right wishlist themes:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Compare clicks against purchases to identify high-converting lists</li>
            <li>Validate which content themes drive better list engagement</li>
            <li>Spot low-performing campaigns and adjust faster</li>
            <li>Track conversion events tied to shared wishlist links</li>
            <li>Use repeat trends to plan upcoming campaign content</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
