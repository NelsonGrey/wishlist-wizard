import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { LayoutDashboard, BarChart3, WalletCards, Shield, Gift, Trophy, CalendarDays, List } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/StatCard";
import AnalyticsOverview from "@/components/dashboard/AnalyticsOverview";
import CreatorOverview from "@/components/dashboard/CreatorOverview";
import AdminOverview from "@/components/dashboard/AdminOverview";
import { useSubscriptionStatus } from "@/hooks/use-subscription-status";
import { useAchievements } from "@/hooks/use-achievements";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { ACHIEVEMENT_DEFINITIONS } from "@/lib/achievements";

type DashboardTab = 'overview' | 'analytics' | 'creator' | 'admin';
const BASE_VALID_TABS: DashboardTab[] = ['overview', 'analytics', 'creator', 'admin'];

function getTabFromUrl(): DashboardTab {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  return BASE_VALID_TABS.includes(tab as DashboardTab) ? (tab as DashboardTab) : 'overview';
}

export default function Dashboard() {
  const [selectedTab, setSelectedTab] = useState<DashboardTab>(getTabFromUrl);
  const { data: subStatus } = useSubscriptionStatus();
  const { data: achievementsData } = useAchievements();
  const isAdmin = useIsAdmin();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', selectedTab);
    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', nextUrl);
  }, [selectedTab]);

  useEffect(() => {
    const onPopState = () => setSelectedTab(getTabFromUrl());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Land back on Overview if a stale ?tab=admin URL is opened by a non-admin.
  useEffect(() => {
    if (selectedTab === 'admin' && isAdmin === false) {
      setSelectedTab('overview');
    }
  }, [selectedTab, isAdmin]);

  const showCreatorTab = subStatus?.limits?.creatorDashboardEnabled ?? false;
  const earnedAchievementCount = ACHIEVEMENT_DEFINITIONS.filter(
    (achievement) => achievementsData?.achievements?.[achievement.id]?.earned
  ).length;

  const tabs: Array<{ id: DashboardTab; label: string; icon: React.ReactNode; badge?: string }> = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} aria-hidden="true" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} aria-hidden="true" /> },
    {
      id: 'creator',
      label: 'Creator',
      icon: <WalletCards size={18} aria-hidden="true" />,
      badge: showCreatorTab ? undefined : 'Pro',
    },
    ...(isAdmin ? [{ id: 'admin' as DashboardTab, label: 'Admin', icon: <Shield size={18} aria-hidden="true" /> }] : []),
  ];

  return (
    <>
      <Helmet>
        <title>Dashboard | Wishlist Wizard</title>
        <meta name="description" content="Your account overview, analytics, and creator tools in one place." />
      </Helmet>
      <div data-testid="dashboard-page" className="container mx-auto px-4 py-6 2xl:py-8 max-w-7xl">
        <h1 data-testid="dashboard-title" className="text-4xl font-bold bg-gradient-to-r from-emerald-800 to-green-800 bg-clip-text text-transparent mb-8">
          Dashboard
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-0">
                <nav className="flex flex-col" aria-label="Dashboard sections">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      data-testid={`dashboard-tab-${tab.id}`}
                      className={`flex items-center gap-3 p-4 text-left transition-colors hover:bg-muted ${selectedTab === tab.id ? 'bg-muted font-medium' : ''}`}
                      onClick={() => setSelectedTab(tab.id)}
                      aria-pressed={selectedTab === tab.id}
                      aria-label={`Open ${tab.label} section`}
                    >
                      {tab.icon}
                      <span className="flex-1">{tab.label}</span>
                      {tab.badge && (
                        <Badge variant="outline" className="text-xs">{tab.badge}</Badge>
                      )}
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            {selectedTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <StatCard
                    label="Wishlists"
                    value={subStatus?.usage?.wishlistsOwned ?? 0}
                    icon={<Gift className="h-4 w-4" />}
                  />
                  <StatCard
                    label="Achievements Earned"
                    value={`${earnedAchievementCount} of ${ACHIEVEMENT_DEFINITIONS.length}`}
                    icon={<Trophy className="h-4 w-4" />}
                  />
                </div>
                <Card>
                  <CardContent className="pt-6 flex flex-wrap gap-3">
                    <Button asChild>
                      <Link href="/app/wishlists">
                        <List className="h-4 w-4 mr-2" />
                        Open Wishlists
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href="/app/calendar">
                        <CalendarDays className="h-4 w-4 mr-2" />
                        Open Calendar
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href="/app/achievements">
                        <Trophy className="h-4 w-4 mr-2" />
                        View Achievements
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {selectedTab === 'analytics' && <AnalyticsOverview />}

            {selectedTab === 'creator' && <CreatorOverview />}

            {selectedTab === 'admin' && isAdmin && <AdminOverview />}
          </div>
        </div>
      </div>
    </>
  );
}
