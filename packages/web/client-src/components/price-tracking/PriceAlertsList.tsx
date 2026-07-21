import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BellRing, Trash2, AlertCircle } from "lucide-react";

// Type for price alerts
type PriceAlert = {
  id: string;
  itemId: number;
  targetPrice: string;
  currentPrice: string;
  createdAt: Date;
  status: 'active' | 'triggered' | 'paused';
  notified: boolean;
  thresholdPercent?: number | null;
  thresholdAmount?: number | null;
  cooldownMinutes?: number | null;
  alertCadence?: 'high' | 'normal' | 'low' | null;
  quietHours?: {
    startHour: number;
    endHour: number;
    timezone: string;
  } | null;
  item: {
    title: string;
    price: string;
    imageUrl?: string;
    store?: string;
  };
};

const parsePrice = (value?: string): number => {
  const parsed = parseFloat(String(value || "").replace(/[$,]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

interface PriceAlertsListProps {
  limit?: number;
}

export default function PriceAlertsList({ limit }: PriceAlertsListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's price alerts
  const { data: alerts, isLoading, isError } = useQuery<PriceAlert[]>({
    queryKey: ['/api/price-alerts'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation for deleting price alert
  const deletePriceAlertMutation = useMutation({
    mutationFn: (alertId: string) => {
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
  const handleDeleteAlert = (alertId: string) => {
    deletePriceAlertMutation.mutate(alertId);
  };

  // Show loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BellRing className="h-5 w-5 mr-2 text-emerald-800" />
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
            <BellRing className="h-5 w-5 mr-2 text-emerald-800" />
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
            <BellRing className="h-5 w-5 mr-2 text-emerald-800" />
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
              Set up price alerts on items you&apos;re interested in to be notified when prices drop.
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
          <BellRing className="h-5 w-5 mr-2 text-emerald-800" />
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
              <TableHead>To Target</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedAlerts.map((alert) => (
              <TableRow key={alert.id}>
                {(() => {
                  const current = parsePrice(alert.currentPrice || alert.item.price);
                  const target = parsePrice(alert.targetPrice);
                  const diff = Number((current - target).toFixed(2));
                  const percent = target > 0 ? Number(((diff / target) * 100).toFixed(1)) : 0;
                  const isAtOrBelowTarget = current > 0 && target > 0 && current <= target;

                  return (
                    <>
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
                      <TableCell>${current.toFixed(2)}</TableCell>
                      <TableCell>${target.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {isAtOrBelowTarget ? (
                            <span className="text-green-700 text-sm font-medium">Reached</span>
                          ) : (
                            <span className="text-sm">
                              ${Math.max(0, diff).toFixed(2)} ({Math.max(0, percent).toFixed(1)}%)
                            </span>
                          )}
                          {(alert.thresholdPercent || alert.thresholdAmount || alert.cooldownMinutes || alert.alertCadence) ? (
                            <div className="text-xs text-muted-foreground">
                              {alert.thresholdPercent ? `${alert.thresholdPercent}% ` : ''}
                              {alert.thresholdAmount ? `/$${Number(alert.thresholdAmount).toFixed(2)} ` : ''}
                              {alert.cooldownMinutes ? `· ${alert.cooldownMinutes}m cooldown ` : ''}
                              {alert.alertCadence ? `· ${alert.alertCadence}` : ''}
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {alert.notified ? (
                          <Badge variant="success">Triggered</Badge>
                        ) : isAtOrBelowTarget ? (
                          <Badge variant="outline">At Target</Badge>
                        ) : (
                          <Badge>Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              window.location.href = `/app/price-tracking?tab=intelligence&itemId=${encodeURIComponent(String(alert.itemId))}`;
                            }}
                          >
                            View Intelligence
                          </Button>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Delete price alert for ${alert.item.title}`}
                                onClick={() => handleDeleteAlert(alert.id)}
                                disabled={deletePriceAlertMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete price alert</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </>
                  );
                })()}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}