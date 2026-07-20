import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { format } from "date-fns";
import CommissionStateBadge, { CommissionLedgerState } from "./CommissionStateBadge";

type DashboardSummary = {
  byState: Record<CommissionLedgerState, { count: number; totalUsd: number }>;
};

type LedgerEntry = {
  id: string;
  network: string;
  networkOrderId: string;
  saleAmountUsd: number | null;
  actualCommissionUsd: number | null;
  netCreatorCommissionUsd: number | null;
  state: CommissionLedgerState;
  createdAt: string;
};

const STATE_ORDER: CommissionLedgerState[] = ["Pending", "Approved", "Payable", "Paid", "Reversed"];

function formatUsd(value: number | null | undefined): string {
  return `$${(value ?? 0).toFixed(2)}`;
}

export default function CommissionStatusPanel() {
  const { data: summary, isLoading: isLoadingSummary } = useQuery<DashboardSummary>({
    queryKey: ["/api/creator/commission-summary"],
    queryFn: () => apiRequest("/api/creator/commission-summary") as Promise<DashboardSummary>,
    staleTime: 5 * 60 * 1000,
  });

  const { data: ledgerData, isLoading: isLoadingLedger } = useQuery<{ entries: LedgerEntry[] }>({
    queryKey: ["/api/creator/commission-ledger"],
    queryFn: () => apiRequest("/api/creator/commission-ledger", { body: { limit: 100 } }) as Promise<{ entries: LedgerEntry[] }>,
    staleTime: 5 * 60 * 1000,
  });

  const entries = ledgerData?.entries ?? [];
  const trendData = [...entries]
    .filter((entry) => entry.state !== "Reversed")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .reduce<Array<{ date: string; cumulativeUsd: number }>>((acc, entry) => {
      const previous = acc.length > 0 ? acc[acc.length - 1].cumulativeUsd : 0;
      acc.push({
        date: format(new Date(entry.createdAt), "MMM d"),
        cumulativeUsd: previous + (entry.netCreatorCommissionUsd ?? 0),
      });
      return acc;
    }, []);

  if (isLoadingSummary) {
    return (
      <div className="grid gap-4 md:grid-cols-5">
        {STATE_ORDER.map((state) => (
          <Skeleton key={state} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Every status kept visibly separate, per the product's own settlement
          timeline copy — an "Approved" total must never be confused with a
          "Paid" one. */}
      <div className="grid gap-4 md:grid-cols-5">
        {STATE_ORDER.map((state) => (
          <Card key={state} className="p-4">
            <CommissionStateBadge state={state} />
            <p className="mt-3 text-2xl font-bold">{formatUsd(summary?.byState?.[state]?.totalUsd)}</p>
            <p className="text-xs text-muted-foreground">
              {summary?.byState?.[state]?.count ?? 0} {(summary?.byState?.[state]?.count ?? 0) === 1 ? "item" : "items"}
            </p>
          </Card>
        ))}
      </div>

      {trendData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Commission over time</CardTitle>
            <CardDescription>Cumulative earned commission (excludes reversed entries).</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(value) => `$${value}`} />
                <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, "Cumulative"]} />
                <Line type="monotone" dataKey="cumulativeUsd" stroke="#059669" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Commission ledger</CardTitle>
          <CardDescription>Every tracked order and its current settlement state.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingLedger ? (
            <Skeleton className="h-40 w-full" />
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No commission activity yet. This fills in once a retailer report is reconciled against your tracked links.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Retailer</TableHead>
                  <TableHead className="text-right">Sale</TableHead>
                  <TableHead className="text-right">Your share</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono text-xs">{entry.networkOrderId}</TableCell>
                    <TableCell>{entry.network}</TableCell>
                    <TableCell className="text-right">{formatUsd(entry.saleAmountUsd)}</TableCell>
                    <TableCell className="text-right font-medium">{formatUsd(entry.netCreatorCommissionUsd)}</TableCell>
                    <TableCell>
                      <CommissionStateBadge state={entry.state} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
