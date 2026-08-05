import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

type Adjustment = {
  id: string;
  type: "return" | "chargeback" | "fraud_hold" | "manual_correction" | "network_correction";
  amountUsd: number;
  reasonCode: string;
  reasonNote: string | null;
  createdAt: string;
};

const TYPE_LABEL: Record<Adjustment["type"], string> = {
  return: "Return",
  chargeback: "Chargeback",
  fraud_hold: "Fraud hold",
  manual_correction: "Manual correction",
  network_correction: "Network correction",
};

export default function AdjustmentsPanel() {
  const { data, isLoading } = useQuery<{ adjustments: Adjustment[] }>({
    queryKey: ["/api/creator/adjustments"],
    queryFn: () => apiRequest("/api/creator/adjustments") as Promise<{ adjustments: Adjustment[] }>,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  const adjustments = data?.adjustments ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Adjustments</CardTitle>
        <CardDescription>Returns, chargebacks, fraud holds, and manual corrections — every one with a reason.</CardDescription>
      </CardHeader>
      <CardContent>
        {adjustments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No adjustments on your account.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adjustments.map((adjustment) => (
                <TableRow key={adjustment.id}>
                  <TableCell>
                    <Badge variant="outline">{TYPE_LABEL[adjustment.type] || adjustment.type}</Badge>
                  </TableCell>
                  <TableCell className={`text-right font-medium ${adjustment.amountUsd < 0 ? "text-rose-700" : ""}`}>
                    {adjustment.amountUsd < 0 ? "-" : ""}${Math.abs(adjustment.amountUsd).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>{adjustment.reasonCode.replace(/_/g, " ")}</div>
                    {adjustment.reasonNote && <div className="text-xs text-muted-foreground">{adjustment.reasonNote}</div>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(adjustment.createdAt), "MMM d, yyyy")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
