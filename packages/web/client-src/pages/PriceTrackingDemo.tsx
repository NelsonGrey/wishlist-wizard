import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import PriceHistory from "@/components/price-tracking/PriceHistory";
import PriceAlertForm from "@/components/price-tracking/PriceAlertForm";
import PriceAlertsList from "@/components/price-tracking/PriceAlertsList";
import { useToast } from "@/hooks/use-toast";

// Demo product data
const demoProduct = {
  id: 101,
  title: "Sony WH-1000XM5 Wireless Noise Cancelling Headphones",
  price: "$349.99",
  numericPrice: 349.99,
  imageUrl: "https://m.media-amazon.com/images/I/61+btxzpfDL._AC_SL1500_.jpg",
  store: "Amazon",
  productUrl: "https://www.amazon.com/dp/B09XS7JWHH"
};

export default function PriceTrackingDemo() {
  const { toast } = useToast();
  const [priceValue, setPriceValue] = useState(demoProduct.numericPrice);
  const [updatingPrice, setUpdatingPrice] = useState(false);
  
  // Function to simulate price updates for demo purposes
  const updatePrice = async () => {
    setUpdatingPrice(true);
    
    try {
      // In a real implementation, this would call the API to update the price
      // For demo, we'll just simulate a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Price updated",
        description: `Item price has been updated to $${priceValue.toFixed(2)}`,
      });
      
      // For demo purposes, reload the page to simulate a full refresh
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error updating price",
        description: "There was a problem updating the price.",
        variant: "destructive",
      });
    } finally {
      setUpdatingPrice(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Price Tracking Demo - Wishlist Wizard</title>
        <meta name="description" content="Demonstration of Wishlist Wizard's price tracking and alert capabilities" />
      </Helmet>

      <div className="container py-8 mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Price Tracking Demo</h1>
          <p className="mt-1 text-muted-foreground">
            See how Wishlist Wizard&apos;s price tracking and alert features work
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Demo Product</CardTitle>
              <CardDescription>
                A sample product to demonstrate price tracking features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/3 lg:w-1/4">
                  <img 
                    src={demoProduct.imageUrl} 
                    alt={demoProduct.title} 
                    className="w-full h-auto object-contain rounded-md"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://placehold.co/400x400/e2e8f0/64748b?text=Product";
                    }}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{demoProduct.title}</h3>
                  <p className="text-lg font-bold text-primary mb-4">{demoProduct.price}</p>
                  <p className="text-sm text-muted-foreground mb-2">Store: {demoProduct.store}</p>
                  
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Simulate Price Change</h4>
                    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-end max-w-md">
                      <div className="w-full">
                        <Label htmlFor="price-input">New Price ($)</Label>
                        <Input 
                          id="price-input" 
                          type="number" 
                          step="0.01" 
                          value={priceValue}
                          onChange={(e) => setPriceValue(parseFloat(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      <Button 
                        onClick={updatePrice} 
                        disabled={updatingPrice || priceValue <= 0}
                      >
                        {updatingPrice ? "Updating..." : "Update Price"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Simulate price changes to see how alerts and tracking would work
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <PriceHistory 
              itemId={demoProduct.id}
            />
          </div>
          <div>
            <PriceAlertForm 
              itemId={demoProduct.id}
              currentPrice={demoProduct.price}
              currentNumericPrice={demoProduct.numericPrice}
            />
          </div>
        </div>
        
        <Separator className="my-8" />
        
        <div className="mb-8">
          <Tabs defaultValue="alerts">
            <TabsList>
              <TabsTrigger value="alerts">Your Alerts</TabsTrigger>
              <TabsTrigger value="all">Price Tracking Features</TabsTrigger>
            </TabsList>
            <TabsContent value="alerts" className="mt-6">
              <PriceAlertsList />
            </TabsContent>
            <TabsContent value="all" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>About Price Tracking</CardTitle>
                  <CardDescription>
                    Wishlist Wizard&apos;s comprehensive price tracking capabilities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">Price History</h3>
                      <p className="text-sm text-muted-foreground">
                        Track price changes over time with interactive charts that show trends and fluctuations
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">Price Alerts</h3>
                      <p className="text-sm text-muted-foreground">
                        Set custom price alerts and get notified when prices drop to your desired level
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">Price Drop Detection</h3>
                      <p className="text-sm text-muted-foreground">
                        Automatically detect significant price drops on your wishlist items
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">Price Comparison</h3>
                      <p className="text-sm text-muted-foreground">
                        Compare prices across different stores and time periods
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">Best Time to Buy</h3>
                      <p className="text-sm text-muted-foreground">
                        Get recommendations on the best time to purchase based on historical price data
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">Price Volatility Analysis</h3>
                      <p className="text-sm text-muted-foreground">
                        See which items frequently change price to better time your purchases
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        <Card className="mb-8 bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>Try Price Tracking Today</CardTitle>
            <CardDescription>
              Never miss a price drop on your wishlist items again
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Price tracking is available for all Wishlist Wizard users. Start tracking prices and setting alerts 
              on your favorite items today to save money on your purchases.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button>Get Started</Button>
              <Button variant="outline">Learn More</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}