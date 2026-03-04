import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsButton } from "@/components/analytics/AnalyticsButton";
import { AnalyticsLink } from "@/components/analytics/AnalyticsLink";
import { trackEvent } from "@/lib/analytics";
import { useState } from "react";
import { Helmet } from "react-helmet";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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

const toLower = (value?: string | null) => String(value || "").toLowerCase();

const toCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);

export default function Analytics() {
  const [tabValue, setTabValue] = useState("overview");

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

  const summary = summaryQuery.data?.summary;
  const recentEvents = eventsQuery.data?.events || [];
  const isLoading = summaryQuery.isLoading || eventsQuery.isLoading;
  const isError = summaryQuery.isError || eventsQuery.isError;

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

  // Track tab changes
  const handleTabChange = (value: string) => {
    setTabValue(value);
    trackEvent("tab_change", "analytics", value);
  };

  return (
    <>
      <Helmet>
        <title>Analytics | Wishlist Wizard</title>
        <meta name="description" content="Analytics Integration - Track user behavior and gain valuable insights into your Wishlist Wizard usage." />
      </Helmet>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-800 to-green-800 bg-clip-text text-transparent">Performance Analytics</h1>
          <p className="text-gray-600 mt-2">
            Track clicks, purchases, and commissions across shared wishlist campaigns.
          </p>
        </div>

      <Tabs defaultValue="overview" value={tabValue} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="components">Analytics Components</TabsTrigger>
          <TabsTrigger value="events">Custom Events</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Overview</CardTitle>
              <CardDescription>How analytics enhance Wishlist Wizard</CardDescription>
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
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">Total Events</p>
                  <p className="text-2xl font-bold">{summary?.totalEvents ?? 0}</p>
                </Card>
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="p-4 border-emerald-100">
                  <p className="text-sm text-muted-foreground">Weekly Clicks</p>
                  <p className="text-2xl font-bold">{campaignClicks}</p>
                </Card>
                <Card className="p-4 border-emerald-100">
                  <p className="text-sm text-muted-foreground">Weekly Purchases</p>
                  <p className="text-2xl font-bold">{campaignPurchases}</p>
                </Card>
                <Card className="p-4 border-emerald-100">
                  <p className="text-sm text-muted-foreground">Weekly Commission</p>
                  <p className="text-2xl font-bold">{toCurrency(campaignCommission)}</p>
                </Card>
                <Card className="p-4 border-emerald-100 md:col-span-3">
                  <p className="text-sm text-muted-foreground">Weekly Conversion Rate</p>
                  <p className="text-2xl font-bold">{conversionRate.toFixed(1)}%</p>
                </Card>
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
                  <li>Validate which content themes drive affiliate revenue</li>
                  <li>Spot low-performing campaigns and adjust faster</li>
                  <li>Track conversion events tied to shared wishlist links</li>
                  <li>Use repeat trends to plan upcoming campaign content</li>
                </ul>
              </div>
            </CardContent>
            <CardFooter>
              <AnalyticsButton
                category="analytics"
                action="learn_more"
                label="overview_section"
                variant="outline"
                className="mr-4"
              >
                Learn More
              </AnalyticsButton>
              
              <AnalyticsLink
                category="analytics"
                action="navigation"
                label="dashboard_from_overview"
                href="/app/dashboard"
                className="text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                Go to Dashboard
              </AnalyticsLink>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="components" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Components</CardTitle>
              <CardDescription>Ready-to-use components for tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p>
                  Wishlist Wizard includes special components with built-in analytics tracking:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <Card className="p-4">
                    <h3 className="font-medium mb-2">AnalyticsButton</h3>
                    <p className="text-sm mb-4">Tracks button clicks with detailed event data</p>
                    <AnalyticsButton
                      category="analytics"
                      action="button_click"
                      label="component_example"
                      variant="default"
                      size="sm"
                    >
                      Track This Click
                    </AnalyticsButton>
                  </Card>
                  
                  <Card className="p-4">
                    <h3 className="font-medium mb-2">AnalyticsLink</h3>
                    <p className="text-sm mb-4">Tracks navigation with detailed event data</p>
                    <AnalyticsLink
                      category="analytics"
                      action="link_click"
                      label="price_tracking"
                      href="/app/price-tracking"
                      className="text-emerald-700 hover:text-emerald-800 hover:underline"
                    >
                      Go to Price Tracking
                    </AnalyticsLink>
                  </Card>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <AnalyticsButton
                category="analytics"
                action="view_code"
                label="components_section"
                variant="outline"
              >
                View Component Code
              </AnalyticsButton>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Custom Events</CardTitle>
              <CardDescription>Track any user interaction</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p>
                  Beyond the built-in components, you can track any custom event in your application using the trackEvent function:
                </p>
                <pre className="bg-muted p-4 rounded-md overflow-x-auto">
                  {`import { trackEvent } from "@/lib/analytics";

// Track a user action
trackEvent(
  "signup_complete",  // action
  "user",             // category
  "homepage_form",    // label (optional)
  1                   // value (optional)
);`}
                </pre>
                
                <div className="mt-6">
                  <h3 className="font-medium mb-2">Common Events to Track</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Wishlist creation and sharing</li>
                    <li>Item additions to wishlists</li>
                    <li>Price alert creation</li>
                    <li>User registration and login</li>
                    <li>Feature usage (mobile app interactions)</li>
                    <li>Social sharing actions</li>
                  </ul>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <AnalyticsButton
                category="analytics"
                action="try_tracking"
                label="events_section"
                variant="default"
                onClick={() => {
                  trackEvent("custom_event_triggered", "analytics", "custom_event_example", 100);
                  alert("Custom event tracked! Check your Google Analytics dashboard.");
                }}
              >
                Try Event Tracking
              </AnalyticsButton>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </>
  );
}