import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";

import MainLayout from "@/components/layout/MainLayout";
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

export default function PriceTracking() {
  // Fetch price drops
  const { data: priceDrops, isLoading: isLoadingDrops } = useQuery<PriceDropItem[]>({
    queryKey: ['/api/price-drops'],
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  return (
    <MainLayout>
      <Helmet>
        <title>Price Tracking - Wishlist Wizard</title>
        <meta name="description" content="Track prices of your wishlist items and get notified when prices drop." />
      </Helmet>

      <div className="container py-6 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Price Tracking</h1>
          <p className="text-muted-foreground mt-1">
            Monitor prices and set alerts for wishlist items
          </p>
        </div>

        <Tabs defaultValue="alerts" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="alerts">Your Alerts</TabsTrigger>
            <TabsTrigger value="drops">Price Drops</TabsTrigger>
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
                                <div className="text-base font-semibold text-green-600">{item.price}</div>
                              </div>
                              <div className="ml-auto">
                                <div className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 font-medium">
                                  {item.percentDrop}% Off
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
                      We'll continue monitoring your wishlist items and notify you when we detect price reductions.
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
                <div className="flex flex-col items-center justify-center py-12">
                  <LineChartIcon className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-1">Price volatility detection coming soon</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    We're enhancing our price tracking algorithm to detect patterns that may lead to future price drops.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}