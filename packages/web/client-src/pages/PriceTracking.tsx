import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { apiRequest } from "@/lib/queryClient";
import { useEffect, useMemo, useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PriceAlertsList from "@/components/price-tracking/PriceAlertsList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

type WishlistItem = {
  id: string;
  title: string;
  price?: string | number | null;
  store?: string | null;
  imageUrl?: string | null;
  isRetailerSpecific?: boolean;
};

type IntelligenceOffer = {
  id: string;
  store?: string | null;
  price?: number | null;
  landedPrice?: number | null;
  shippingCost?: number | null;
  fees?: number | null;
  discountAmount?: number | null;
  inStock?: boolean;
  availability?: string | null;
  productUrl?: string | null;
  matchType?: string | null;
  confidenceScore?: number | null;
};

type IntelligenceAlternative = {
  id: string;
  title?: string | null;
  store?: string | null;
  landedPrice?: number | null;
  similarityScore?: number | null;
  qualityBand?: string | null;
  rationale?: string | null;
  inStock?: boolean;
};

type PriceIntelligenceResponse = {
  itemId: string;
  title?: string | null;
  basePrice?: number | null;
  isRetailerSpecific?: boolean;
  sourceRetailer?: string | null;
  sections: {
    bestIdenticalOffer?: IntelligenceOffer | null;
    identicalOffers?: IntelligenceOffer[];
    alternatives?: IntelligenceAlternative[];
  };
  confidencePolicy?: {
    bestDealEligibleMatchTypes?: string[];
    probableShownSeparately?: boolean;
  };
  metadata?: {
    checkedAt?: string;
    offersConsidered?: number;
    alternativesConsidered?: number;
    retailerScopeMode?: "source-only" | "all-retailers";
    scopedRetailerCount?: number;
    hasExternalMarketOffers?: boolean;
    hasSyntheticSourceBaseline?: boolean;
    marketCoverage?: "multi-retailer" | "single-retailer" | "baseline-only" | "no-offers";
    webMarketRefreshTriggered?: boolean;
    forceRefreshRequested?: boolean;
  };
};

type PriceTrackingTab = "alerts" | "drops" | "intelligence";

const isPriceTrackingTab = (value: string): value is PriceTrackingTab => {
  return value === "alerts" || value === "drops" || value === "intelligence";
};

const formatMoney = (value: unknown): string => {
  const amount = toNumber(value);
  if (amount <= 0) {
    return "—";
  }
  return `$${amount.toFixed(2)}`;
};

const formatMatchType = (value?: string | null): string => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "unknown";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
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
  const initialTab = useMemo<PriceTrackingTab>(() => {
    if (typeof window === "undefined") {
      return "alerts";
    }

    const value = String(new URLSearchParams(window.location.search).get("tab") || "").trim().toLowerCase();
    return isPriceTrackingTab(value) ? value : "alerts";
  }, []);

  const initialItemIdFromQuery = useMemo<string>(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return String(new URLSearchParams(window.location.search).get("itemId") || "").trim();
  }, []);

  const [activeTab, setActiveTab] = useState<PriceTrackingTab>(initialTab);
  const [selectedItemId, setSelectedItemId] = useState<string>("");

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

  const { data: wishlistItems, isLoading: isLoadingItems, error: wishlistItemsError } = useQuery<WishlistItem[]>({
    queryKey: ["/api/wishlist-items"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => apiRequest("/api/wishlist-items") as Promise<WishlistItem[]>,
  });

  const sortedWishlistItems = useMemo(() => {
    return [...(wishlistItems || [])].sort((left, right) => String(left.title || "").localeCompare(String(right.title || "")));
  }, [wishlistItems]);

  useEffect(() => {
    if (sortedWishlistItems.length === 0) {
      return;
    }

    setSelectedItemId((current) => {
      if (current) {
        return current;
      }

      if (initialItemIdFromQuery) {
        const exists = sortedWishlistItems.some((item) => String(item.id) === initialItemIdFromQuery);
        if (exists) {
          return initialItemIdFromQuery;
        }
      }

      return String(sortedWishlistItems[0].id);
    });
  }, [initialItemIdFromQuery, sortedWishlistItems]);

  const {
    data: intelligence,
    isLoading: isLoadingIntelligence,
    isFetching: isFetchingIntelligence,
    error: intelligenceError,
    refetch: refetchIntelligence,
  } = useQuery<PriceIntelligenceResponse>({
    queryKey: ["/api/items", selectedItemId, "price-intelligence"],
    enabled: Boolean(selectedItemId),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      return apiRequest(`/api/items/${selectedItemId}/price-intelligence`) as Promise<PriceIntelligenceResponse>;
    },
  });

  const bestIdenticalOffer = intelligence?.sections?.bestIdenticalOffer;
  const identicalOffers = intelligence?.sections?.identicalOffers || [];
  const probableOffers = identicalOffers.filter((offer) => String(offer.matchType || "").toLowerCase() === "probable");
  const alternatives = intelligence?.sections?.alternatives || [];
  const marketCoverage = intelligence?.metadata?.marketCoverage;
  const retailerScopeMode = intelligence?.metadata?.retailerScopeMode;

  const refreshMarketOffers = async () => {
    if (!selectedItemId) return;
    await apiRequest(`/api/items/${selectedItemId}/price-intelligence?refresh=true`) as Promise<PriceIntelligenceResponse>;
    await refetchIntelligence();
  };

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

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(isPriceTrackingTab(value) ? value : "alerts")} className="w-full">
          <TabsList className="mb-6 bg-gray-100">
            <TabsTrigger value="alerts" className="data-[state=active]:bg-emerald-700 data-[state=active]:text-white">Your Alerts</TabsTrigger>
            <TabsTrigger value="drops" className="data-[state=active]:bg-emerald-700 data-[state=active]:text-white">Price Drops</TabsTrigger>
            <TabsTrigger value="intelligence" className="data-[state=active]:bg-emerald-700 data-[state=active]:text-white">Intelligence</TabsTrigger>
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

          <TabsContent value="intelligence" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Price Intelligence</CardTitle>
                <CardDescription>
                  Compare identical offers, enforce retailer exclusives, and surface close alternatives.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingItems ? (
                  <Skeleton className="h-10 w-full" />
                ) : sortedWishlistItems.length > 0 ? (
                  <div className="space-y-3">
                    <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a wishlist item" />
                      </SelectTrigger>
                      <SelectContent>
                        {sortedWishlistItems.map((item) => (
                          <SelectItem key={item.id} value={String(item.id)}>
                            {item.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={refreshMarketOffers}
                      disabled={!selectedItemId || isFetchingIntelligence}
                    >
                      {isFetchingIntelligence ? "Refreshing offers..." : "Refresh Market Offers"}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No wishlist items found yet. Add items to start intelligence comparisons.</p>
                )}

                {wishlistItemsError && (
                  <p className="text-sm text-red-700">
                    Unable to load wishlist items for intelligence. Please refresh and try again.
                  </p>
                )}

                {selectedItemId && isLoadingIntelligence && (
                  <div className="space-y-3">
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                  </div>
                )}

                {selectedItemId && !isLoadingIntelligence && intelligence && marketCoverage === "baseline-only" && (
                  <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    Showing baseline price from the source retailer only. Competitive cross-retailer offers are not yet available for this item.
                  </p>
                )}

                {selectedItemId && !isLoadingIntelligence && intelligence && marketCoverage === "no-offers" && (
                  <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    No offer data is available yet for this item. Intelligence will expand as market offers are collected.
                  </p>
                )}

                {selectedItemId && !isLoadingIntelligence && intelligence && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Best Identical Deal</CardTitle>
                          <CardDescription>
                            High-confidence identical match (exact/strong) using landed price.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {bestIdenticalOffer ? (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Store</span>
                                <span className="font-medium">{bestIdenticalOffer.store || "Unknown"}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Landed Price</span>
                                <span className="font-semibold text-emerald-700">{formatMoney(bestIdenticalOffer.landedPrice)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Match</span>
                                <Badge variant="secondary">{formatMatchType(bestIdenticalOffer.matchType)}</Badge>
                              </div>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">No high-confidence identical offers available yet.</p>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Retailer Scope</CardTitle>
                          <CardDescription>
                            Exclusive items are scoped to the source retailer when comparing identical offers.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Retailer-specific</span>
                            <Badge variant={intelligence.isRetailerSpecific ? "default" : "secondary"}>
                              {intelligence.isRetailerSpecific ? "Yes" : "No"}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Scope mode</span>
                            <span className="font-medium">{retailerScopeMode === "source-only" ? "Source retailer only" : "All retailers"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Source retailer</span>
                            <span className="font-medium">{intelligence.sourceRetailer || "Any retailer"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Offers considered</span>
                            <span>{intelligence.metadata?.offersConsidered ?? 0}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Probable Matches</CardTitle>
                        <CardDescription>
                          Lower-confidence identical candidates shown separately from best-deal picks.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {probableOffers.length > 0 ? (
                          <div className="space-y-2">
                            {probableOffers.slice(0, 6).map((offer) => (
                              <div key={offer.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                                <div>
                                  <div className="font-medium text-sm">{offer.store || "Unknown store"}</div>
                                  <div className="text-xs text-muted-foreground">{formatMatchType(offer.matchType)}</div>
                                </div>
                                <div className="font-medium">{formatMoney(offer.landedPrice)}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No probable identical matches found.</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Alternatives</CardTitle>
                        <CardDescription>
                          Similar items ranked by similarity score and landed price.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {alternatives.length > 0 ? (
                          <div className="space-y-2">
                            {alternatives.slice(0, 8).map((alt) => (
                              <div key={alt.id} className="flex items-start justify-between border rounded-md px-3 py-2 gap-3">
                                <div className="min-w-0">
                                  <div className="font-medium text-sm line-clamp-1">{alt.title || "Alternative item"}</div>
                                  <div className="text-xs text-muted-foreground line-clamp-1">
                                    {alt.store || "Unknown store"} • {alt.qualityBand || "comparable"}
                                  </div>
                                  <div className="text-xs text-muted-foreground line-clamp-1">{alt.rationale || "Similar specs and value profile"}</div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="font-medium">{formatMoney(alt.landedPrice)}</div>
                                  <div className="text-xs text-muted-foreground">Similarity {(toNumber(alt.similarityScore) * 100).toFixed(0)}%</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No alternatives found yet for this item.</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {selectedItemId && !isLoadingIntelligence && intelligenceError && (
                  <p className="text-sm text-red-700">
                    Unable to load price intelligence for this item right now. Please try again shortly.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
