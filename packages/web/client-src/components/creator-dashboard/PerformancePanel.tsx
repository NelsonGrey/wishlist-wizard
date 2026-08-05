import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MousePointerClick, TrendingUp } from "lucide-react";

type AffiliateStats = {
  stats: {
    totalConversions: number;
    totalClicks: number;
    topPrograms: Array<{ program: string; conversions: number; clicks: number; revenue: number }>;
  };
};

export default function PerformancePanel() {
  const { data, isLoading, isError } = useQuery<AffiliateStats>({
    queryKey: ["/api/affiliate/stats"],
    queryFn: () => apiRequest("/api/affiliate/stats") as Promise<AffiliateStats>,
    staleTime: 5 * 60 * 1000,
  });

  const stats = data?.stats;
  const clickThroughRate =
    stats && stats.totalClicks > 0 ? ((stats.totalConversions / stats.totalClicks) * 100).toFixed(1) : "0.0";

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">Unable to load performance data right now.</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MousePointerClick className="h-4 w-4" /> Total clicks
          </div>
          <p className="mt-2 text-3xl font-bold">{stats?.totalClicks ?? 0}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" /> Tagged link conversions
          </div>
          <p className="mt-2 text-3xl font-bold">{stats?.totalConversions ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Click-through rate</p>
          <p className="mt-2 text-3xl font-bold">{clickThroughRate}%</p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Retailer breakdown</CardTitle>
          <CardDescription>Clicks and tagged conversions by retailer program.</CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.topPrograms && stats.topPrograms.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Retailer</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Conversions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.topPrograms.map((program) => (
                  <TableRow key={program.program}>
                    <TableCell className="font-medium">{program.program}</TableCell>
                    <TableCell className="text-right">{program.clicks}</TableCell>
                    <TableCell className="text-right">{program.conversions}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No clicks recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
