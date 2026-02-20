import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { apiRequest } from "@/lib/queryClient";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PriceAlertsList from "@/components/price-tracking/PriceAlertsList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChartIcon, TrendingDown, AlertTriangle } from "lucide-react";

// Type for price drop items
type PriceDropItem = {
  id: number;
  title: string;
  imageUrl?: string;
  price: string;
  currentPrice: string;
  previousPrice: string;
  dropPercentage: number;
  percentDrop: number;
  store?: string;
};

type PriceAlertItem = {
  id: number;
  itemId: number;
  item: {
    title: string;
    imageUrl?: string;
    store?: string;
  };
};

type PriceHistoryPoint = {
  date: string;
  price: number;
};

type VolatilityItem = {
  itemId: number;
  title: string;
  imageUrl?: string;
  store?: string;
  currentPrice: number;
  historyPoints: number;
  changeCount: number;
  volatilityPercent: number;
  avgAbsoluteChangePercent: number;
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const computeVolatility = (prices: number[]) => {
  if (prices.length < 2) {
    return { volatilityPercent: 0, avgAbsoluteChangePercent: 0, changeCount: 0 };
  }

  const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  if (mean <= 0) {
    return { volatilityPercent: 0, avgAbsoluteChangePercent: 0, changeCount: 0 };
  }

  const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);
  const volatilityPercent = (stdDev / mean) * 100;

  const percentChanges: number[] = [];
  for (let i = 1; i < prices.length; i += 1) {
    const previous = prices[i - 1];
    const current = prices[i];
    if (previous > 0) {
      percentChanges.push(Math.abs(((current - previous) / previous) * 100));
    }
  }

  const avgAbsoluteChangePercent =
    percentChanges.length > 0
      ? percentChanges.reduce((sum, change) => sum + change, 0) / percentChanges.length
      : 0;
  const changeCount = percentChanges.filter((change) => change >= 1).length;

  return { volatilityPercent, avgAbsoluteChangePercent, changeCount };
};

export default function PriceTracking() {
  // Fetch price drops
  const { data: priceDrops, isLoading: isLoadingDrops } = useQuery<PriceDropItem[]>({
    queryKey: ['/api/price-drops'],
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  const { data: alerts } = useQuery<PriceAlertItem[]>({
    queryKey: ["/api/price-alerts"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const trackedItemIds = Array.from(
    new Set((alerts || []).map((alert) => alert.itemId).filter((itemId) => Number.isFinite(itemId)))
  );

  const { data: volatileItems, isLoading: isLoadingVolatility } = useQuery<VolatilityItem[]>({
    queryKey: ["/api/price-volatility", trackedItemIds],
    enabled: trackedItemIds.length > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes
    queryFn: async () => {
      const alertByItemId = new Map((alerts || []).map((alert) => [alert.itemId, alert]));
      const results: VolatilityItem[] = [];

      for (const itemId of trackedItemIds) {
        try {
          const history = await apiRequest(`/api/items/${itemId}/price-history`) as PriceHistoryPoint[];
          const prices = (history || [])
            .map((point) => toNumber(point.price))
            .filter((price) => price > 0);

          if (prices.length < 2) {
            continue;
          }

          const { volatilityPercent, avgAbsoluteChangePercent, changeCount } = computeVolatility(prices);
          const alert = alertByItemId.get(itemId);

          results.push({
            itemId,
            title: alert?.item?.title || `Item ${itemId}`,
            imageUrl: alert?.item?.imageUrl,
            store: alert?.item?.store,
            currentPrice: prices[prices.length - 1],
            historyPoints: prices.length,
            changeCount,
            volatilityPercent,
            avgAbsoluteChangePercent,
          });
        } catch {
          // Ignore unavailable history for a specific item and continue.
        }
      }

      return results
        .filter((item) => item.volatilityPercent > 0)
        .sort((a, b) => b.volatilityPercent - a.volatilityPercent)
        .slice(0, 12);
    },
  });

  return (
    <>
      <Helmet>
        <title>Price Tracking | Wishlist Wizard</title>
        <meta name="description" content="Track prices of your wishlist items and get notified when prices drop." />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-800 to-green-800 bg-clip-text text-transparent">Price Tracking</h1>
          <p className="text-gray-600 mt-2">
            Monitor prices and set alerts for wishlist items
          </p>
        </div>

        <Tabs defaultValue="alerts" className="w-full">
          <TabsList className="mb-6 bg-gray-100">
            <TabsTrigger value="alerts" className="data-[state=active]:bg-emerald-700 data-[state=active]:text-white">Your Alerts</TabsTrigger>
            <TabsTrigger value="drops" className="data-[state=active]:bg-emerald-700 data-[state=active]:text-white">Price Drops</TabsTrigger>
          </TabsList>

          <TabsContent value="alerts" className="space-y-6">
            <PriceAlertsList />
          </TabsContent>

          <TabsContent value="drops" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingDown className="h-5 w-5 mr-2 text-green-600" />
                  Recent Price Drops
                </CardTitle>
                <CardDescription>
                  Items in your wishlists with significant price reductions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingDrops ? (
                  <div className="space-y-3">
                    {Array(3).fill(0).map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : priceDrops && priceDrops.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {priceDrops.map((item) => (
                      <Card key={item.id} className="overflow-hidden">
                        <div className="flex h-full">
                          {item.imageUrl && (
                            <div className="w-24 h-full shrink-0">
                              <img
                                src={item.imageUrl}
                                alt={item.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "https://placehold.co/120x160/e2e8f0/64748b?text=Item";
                                }}
                              />
                            </div>
                          )}
                          <div className="p-4 flex flex-col flex-1">
                            <h3 className="font-medium line-clamp-1 mb-2">{item.title}</h3>
                            <div className="flex items-center mt-auto">
                              <div className="mr-3">
                                <div className="text-sm text-muted-foreground">Previous</div>
                                <div className="text-sm line-through">{item.previousPrice}</div>
                              </div>
                              <div>
                                <div className="text-sm text-muted-foreground">Current</div>
                                <div className="text-base font-semibold text-green-600">{item.currentPrice || item.price}</div>
                              </div>
                              <div className="ml-auto">
                                <div className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 font-medium">
                                  {(item.percentDrop ?? item.dropPercentage)}% Off
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <LineChartIcon className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-1">No significant price drops found</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-md">
                      We&apos;ll continue monitoring your wishlist items and notify you when we detect price reductions.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
                  Price Volatility
                </CardTitle>
                <CardDescription>
                  Items with frequent price changes that might be due for a price drop
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingVolatility ? (
                  <div className="space-y-3">
                    {Array(3).fill(0).map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : volatileItems && volatileItems.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {volatileItems.map((item) => (
                      <Card key={item.itemId} className="overflow-hidden">
                        <div className="flex h-full">
                          {item.imageUrl && (
                            <div className="w-24 h-full shrink-0">
                              <img
                                src={item.imageUrl}
                                alt={item.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "https://placehold.co/120x160/e2e8f0/64748b?text=Item";
                                }}
                              />
                            </div>
                          )}
                          <div className="p-4 flex flex-col flex-1 gap-2">
                            <h3 className="font-medium line-clamp-1">{item.title}</h3>
                            <div className="text-sm text-muted-foreground">
                              {item.store || "Store unavailable"}
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Current</span>
                              <span className="font-semibold">${item.currentPrice.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Volatility score</span>
                              <span className="font-semibold text-amber-700">{item.volatilityPercent.toFixed(1)}%</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Avg change</span>
                              <span>{item.avgAbsoluteChangePercent.toFixed(1)}%</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Price moves</span>
                              <span>{item.changeCount} across {item.historyPoints} points</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <LineChartIcon className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-1">No volatility patterns detected yet</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-md">
                      Keep tracking items to build more history. Volatility insights appear after multiple recorded price points.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
