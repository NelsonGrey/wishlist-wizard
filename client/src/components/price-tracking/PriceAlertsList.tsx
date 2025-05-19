import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BellRing, Trash2, AlertCircle } from "lucide-react";

interface PriceAlertsListProps {
  limit?: number;
}

export default function PriceAlertsList({ limit }: PriceAlertsListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's price alerts
  const { data: alerts, isLoading, isError } = useQuery({
    queryKey: ['/api/price-alerts'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation for deleting price alert
  const deletePriceAlertMutation = useMutation({
    mutationFn: (alertId: number) => {
      return apiRequest(`/api/price-alerts/${alertId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Price alert deleted",
        description: "Your price alert has been removed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/price-alerts'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete alert",
        description: "There was an error deleting your price alert.",
        variant: "destructive",
      });
      console.error("Error deleting price alert:", error);
    },
  });

  // Handle deleting a price alert
  const handleDeleteAlert = (alertId: number) => {
    deletePriceAlertMutation.mutate(alertId);
  };

  // Show loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BellRing className="h-5 w-5 mr-2 text-blue-500" />
            Your Price Alerts
          </CardTitle>
          <CardDescription>
            Get notified when prices drop below your targets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array(3).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BellRing className="h-5 w-5 mr-2 text-blue-500" />
            Your Price Alerts
          </CardTitle>
          <CardDescription>
            Get notified when prices drop below your targets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mr-2" />
            Unable to load your price alerts
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show empty state
  if (!alerts || alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BellRing className="h-5 w-5 mr-2 text-blue-500" />
            Your Price Alerts
          </CardTitle>
          <CardDescription>
            Get notified when prices drop below your targets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <BellRing className="h-8 w-8 mb-2 text-muted-foreground" />
            <p className="mb-2 font-medium">No price alerts set</p>
            <p className="text-sm text-muted-foreground">
              Set up price alerts on items you're interested in to be notified when prices drop.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter and sort alerts if needed
  const filteredAlerts = [...alerts];
  filteredAlerts.sort((a, b) => {
    // Sort by notified status (active alerts first)
    if (a.notified !== b.notified) {
      return a.notified ? 1 : -1;
    }
    // Then by creation date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Apply limit if specified
  const displayedAlerts = limit ? filteredAlerts.slice(0, limit) : filteredAlerts;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BellRing className="h-5 w-5 mr-2 text-blue-500" />
          Your Price Alerts
        </CardTitle>
        <CardDescription>
          Get notified when prices drop below your targets
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Current Price</TableHead>
              <TableHead>Target Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedAlerts.map((alert) => (
              <TableRow key={alert.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center">
                    {alert.item.imageUrl && (
                      <img
                        src={alert.item.imageUrl}
                        alt={alert.item.title}
                        className="w-8 h-8 object-cover rounded mr-2"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://placehold.co/80x80/e2e8f0/64748b?text=Item";
                        }}
                      />
                    )}
                    <div className="line-clamp-1 max-w-[150px]">
                      {alert.item.title}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{alert.item.price}</TableCell>
                <TableCell>${parseFloat(alert.targetPrice).toFixed(2)}</TableCell>
                <TableCell>
                  {alert.notified ? (
                    <Badge variant="success">Triggered</Badge>
                  ) : (
                    <Badge>Active</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteAlert(alert.id)}
                    disabled={deletePriceAlertMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}