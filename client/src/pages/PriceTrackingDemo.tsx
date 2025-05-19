import React, { useState } from 'react';
import { PriceTrackingHelp } from '@/components/help/PriceTrackingHelp';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { 
  BadgeDollarSign, 
  Bell,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  LineChart,
  Percent,
  BarChart4,
  Clock,
  Check,
  X,
  BellRing,
  Store
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';

// Mock price tracked items for demo
const TRACKED_ITEMS = [
  {
    id: 1,
    name: "Sony WH-1000XM5 Headphones",
    imageUrl: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8aGVhZHBob25lc3xlbnwwfHwwfHx8MA%3D%3D",
    store: "Amazon",
    currentPrice: 348.99,
    originalPrice: 399.99,
    priceHistory: [
      { date: '2024-01-01', price: 399.99 },
      { date: '2024-02-01', price: 379.99 },
      { date: '2024-03-01', price: 389.99 },
      { date: '2024-04-01', price: 359.99 },
      { date: '2024-05-01', price: 348.99 },
    ],
    targetPrice: 329.99,
    alerts: true,
    lastUpdated: '2 hours ago',
    priceDropPercent: 12.8,
    similarItems: [
      { id: 101, name: "Bose Noise Cancelling 700", price: 299.99, store: "Best Buy" },
      { id: 102, name: "Apple AirPods Max", price: 449.99, store: "Apple" },
    ],
    inStock: true
  },
  {
    id: 2,
    name: "Samsung 55\" QLED 4K Smart TV",
    imageUrl: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8dGVsZXZpc2lvbnxlbnwwfHwwfHx8MA%3D%3D",
    store: "Best Buy",
    currentPrice: 799.99,
    originalPrice: 999.99,
    priceHistory: [
      { date: '2024-01-15', price: 999.99 },
      { date: '2024-02-15', price: 949.99 },
      { date: '2024-03-15', price: 899.99 },
      { date: '2024-04-15', price: 849.99 },
      { date: '2024-05-15', price: 799.99 },
    ],
    targetPrice: 749.99,
    alerts: true,
    lastUpdated: '1 day ago',
    priceDropPercent: 20,
    similarItems: [
      { id: 201, name: "LG 55\" OLED C2 Series TV", price: 899.99, store: "Amazon" },
      { id: 202, name: "Sony 55\" Bravia XR", price: 849.99, store: "Best Buy" },
    ],
    inStock: true
  },
  {
    id: 3,
    name: "Dyson V12 Detect Slim Vacuum",
    imageUrl: "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8dmFjdXVtfGVufDB8fDB8fHww",
    store: "Dyson",
    currentPrice: 549.99,
    originalPrice: 649.99,
    priceHistory: [
      { date: '2024-01-30', price: 649.99 },
      { date: '2024-02-28', price: 629.99 },
      { date: '2024-03-30', price: 599.99 },
      { date: '2024-04-30', price: 579.99 },
      { date: '2024-05-18', price: 549.99 },
    ],
    targetPrice: 499.99,
    alerts: false,
    lastUpdated: '3 days ago',
    priceDropPercent: 15.4,
    similarItems: [
      { id: 301, name: "Shark Vertex Pro", price: 399.99, store: "Target" },
      { id: 302, name: "Miele Boost CX1", price: 449.99, store: "Walmart" },
    ],
    inStock: true
  },
  {
    id: 4,
    name: "PlayStation 5 Digital Edition",
    imageUrl: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cGxheXN0YXRpb258ZW58MHx8MHx8fDA%3D",
    store: "GameStop",
    currentPrice: 399.99,
    originalPrice: 399.99,
    priceHistory: [
      { date: '2024-01-01', price: 399.99 },
      { date: '2024-02-01', price: 399.99 },
      { date: '2024-03-01', price: 399.99 },
      { date: '2024-04-01', price: 399.99 },
      { date: '2024-05-01', price: 399.99 },
    ],
    targetPrice: 349.99,
    alerts: true,
    lastUpdated: '12 hours ago',
    priceDropPercent: 0,
    similarItems: [
      { id: 401, name: "Xbox Series X", price: 499.99, store: "Microsoft" },
      { id: 402, name: "Nintendo Switch OLED", price: 349.99, store: "Target" },
    ],
    inStock: false
  }
];

// Alert preference options
const ALERT_OPTIONS = [
  { value: "any", label: "Any Price Drop" },
  { value: "percent_5", label: "5% or More Drop" },
  { value: "percent_10", label: "10% or More Drop" },
  { value: "percent_20", label: "20% or More Drop" },
  { value: "target", label: "Reaches Target Price" },
  { value: "back_in_stock", label: "Back in Stock" },
];

// Price drop chart data generator
const generateChartPoints = (priceHistory: {date: string, price: number}[]) => {
  return priceHistory.map(item => ({
    x: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    y: item.price
  }));
};

const PriceTrackingDemo = () => {
  const [selectedItem, setSelectedItem] = useState(TRACKED_ITEMS[0]);
  const [targetPrice, setTargetPrice] = useState<number | null>(selectedItem.targetPrice);
  const [alertsEnabled, setAlertsEnabled] = useState(selectedItem.alerts);
  const [alertPreference, setAlertPreference] = useState<string>("target");
  const [showPriceDialog, setShowPriceDialog] = useState(false);
  const [showSimilarItems, setShowSimilarItems] = useState(false);
  const { toast } = useToast();

  // Set up alert for price notifications
  const { mutate: setAlert, isPending: isSettingAlert } = useMutation({
    mutationFn: async ({ itemId, enabled, preference, targetPrice }: {
      itemId: number,
      enabled: boolean,
      preference: string,
      targetPrice?: number
    }) => {
      // In a real app, this would make an API call
      return await new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true, enabled, preference });
        }, 1000);
      });
    },
    onSuccess: (data, variables) => {
      toast({
        title: variables.enabled ? "Alert Set" : "Alert Disabled",
        description: variables.enabled 
          ? `You'll be notified when this item's price changes.` 
          : `Price alerts have been disabled for this item.`,
        duration: 3000
      });
    }
  });

  // Update target price
  const { mutate: updateTargetPrice, isPending: isUpdatingPrice } = useMutation({
    mutationFn: async ({ itemId, price }: { itemId: number, price: number }) => {
      // In a real app, this would make an API call
      return await new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true, price });
        }, 1000);
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Target Price Updated",
        description: `New target price set to $${data.price.toFixed(2)}.`,
        duration: 3000
      });
      setShowPriceDialog(false);
    }
  });

  // Handle alert toggle
  const handleAlertToggle = (enabled: boolean) => {
    setAlertsEnabled(enabled);
    setAlert({
      itemId: selectedItem.id,
      enabled,
      preference: alertPreference,
      targetPrice: targetPrice || undefined
    });
  };

  // Handle target price update
  const handleTargetPriceUpdate = () => {
    if (targetPrice !== null) {
      updateTargetPrice({
        itemId: selectedItem.id,
        price: targetPrice
      });
    }
  };

  // Format price as currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  // Calculate savings
  const calculateSavings = (current: number, original: number) => {
    const savings = original - current;
    return {
      amount: savings,
      percent: (savings / original) * 100
    };
  };

  const savings = calculateSavings(selectedItem.currentPrice, selectedItem.originalPrice);

  // Render price history chart
  const renderPriceChart = () => {
    const points = generateChartPoints(selectedItem.priceHistory);
    const maxPrice = Math.max(...selectedItem.priceHistory.map(p => p.price));
    const minPrice = Math.min(...selectedItem.priceHistory.map(p => p.price));
    
    return (
      <div className="h-[180px] mt-4 relative">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          {points.map((point, i) => (
            <div key={i}>{point.x}</div>
          ))}
        </div>
        <div className="h-[150px] w-full bg-slate-50 relative rounded-md overflow-hidden border">
          {/* Price lines */}
          <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
            {/* Price line */}
            <polyline
              points={points.map((point, i) => `${(i / (points.length - 1)) * 500},${150 - ((point.y - minPrice) / (maxPrice - minPrice)) * 130}`).join(' ')}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
            />
            {/* Fill area under line */}
            <polygon
              points={`${points.map((point, i) => `${(i / (points.length - 1)) * 500},${150 - ((point.y - minPrice) / (maxPrice - minPrice)) * 130}`).join(' ')} 500,150 0,150`}
              fill="hsl(var(--primary) / 0.1)"
            />
            {/* Target price line (if set) */}
            {targetPrice && (
              <line
                x1="0"
                y1={150 - ((targetPrice - minPrice) / (maxPrice - minPrice)) * 130}
                x2="500"
                y2={150 - ((targetPrice - minPrice) / (maxPrice - minPrice)) * 130}
                stroke="#e11d48"
                strokeWidth="1"
                strokeDasharray="5,5"
              />
            )}
          </svg>
          
          {/* Price range labels */}
          <div className="absolute top-2 right-2 text-xs bg-white/80 rounded-md px-2 py-1">
            <div className="font-medium">Range:</div>
            <div>{formatPrice(minPrice)} - {formatPrice(maxPrice)}</div>
          </div>
          
          {/* Target price label */}
          {targetPrice && (
            <div className="absolute left-2 text-xs bg-red-50 text-red-700 rounded-md px-2 py-1"
                style={{ top: `${150 - ((targetPrice - minPrice) / (maxPrice - minPrice)) * 130 - 10}px` }}>
              Target: {formatPrice(targetPrice)}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-center gap-3 mb-8">
        <h1 className="text-3xl font-bold text-center">Price Tracking & Alerts</h1>
        <PriceTrackingHelp />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Item Selection */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Tracked Items</CardTitle>
            <CardDescription>Monitor price changes on your wishlist items</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {TRACKED_ITEMS.map(item => (
              <div 
                key={item.id} 
                className={`border rounded-lg cursor-pointer hover:border-primary transition-colors ${selectedItem.id === item.id ? 'border-primary bg-primary/5' : ''}`}
                onClick={() => {
                  setSelectedItem(item);
                  setTargetPrice(item.targetPrice);
                  setAlertsEnabled(item.alerts);
                }}
              >
                <div className="flex gap-3 p-3">
                  <img 
                    src={item.imageUrl} 
                    alt={item.name} 
                    className="w-20 h-20 object-cover rounded-md"
                  />
                  <div className="flex-1">
                    <h3 className="font-medium">{item.name}</h3>
                    <div className="flex items-center mt-1">
                      <Store size={12} className="mr-1 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">{item.store}</p>
                    </div>
                    <div className="flex items-center mt-2 text-sm">
                      <span className="font-semibold">{formatPrice(item.currentPrice)}</span>
                      {item.currentPrice < item.originalPrice && (
                        <span className="text-muted-foreground line-through ml-2 text-xs">
                          {formatPrice(item.originalPrice)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center mt-1">
                      {item.priceDropPercent > 0 ? (
                        <span className="inline-flex items-center text-xs text-green-600 font-medium">
                          <ArrowDownRight size={12} className="mr-0.5" />
                          {item.priceDropPercent.toFixed(1)}% lower
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-xs text-muted-foreground">
                          No price change
                        </span>
                      )}
                      
                      {item.alerts && (
                        <span className="ml-auto bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full flex items-center">
                          <Bell size={10} className="mr-0.5" />
                          Alert On
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        
        {/* Price Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{selectedItem.name}</CardTitle>
                <CardDescription>
                  <span className="inline-flex items-center">
                    <Store size={14} className="mr-1" />
                    {selectedItem.store}
                  </span>
                  <span className="mx-2">•</span>
                  <span className="inline-flex items-center">
                    <Clock size={14} className="mr-1" />
                    Updated {selectedItem.lastUpdated}
                  </span>
                </CardDescription>
              </div>
              <div className="flex items-center">
                {selectedItem.inStock ? (
                  <span className="text-xs bg-green-100 text-green-700 flex items-center px-2 py-1 rounded-full">
                    <Check size={12} className="mr-1" />
                    In Stock
                  </span>
                ) : (
                  <span className="text-xs bg-red-100 text-red-700 flex items-center px-2 py-1 rounded-full">
                    <X size={12} className="mr-1" />
                    Out of Stock
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Price Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Current Price</h3>
                <div className="flex items-end">
                  <span className="text-3xl font-bold">{formatPrice(selectedItem.currentPrice)}</span>
                  {selectedItem.currentPrice < selectedItem.originalPrice && (
                    <span className="text-lg text-muted-foreground line-through ml-2 mb-0.5">
                      {formatPrice(selectedItem.originalPrice)}
                    </span>
                  )}
                </div>
                
                {savings.amount > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium flex items-center text-green-600">
                      <ArrowDownRight size={16} className="mr-1" />
                      Save {formatPrice(savings.amount)} ({savings.percent.toFixed(1)}%)
                    </span>
                  </div>
                )}
                
                <div className="flex items-center mt-4">
                  <span className="text-sm">Target Price: </span>
                  <span className="font-medium ml-2">{targetPrice ? formatPrice(targetPrice) : "Not set"}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="ml-2" 
                    onClick={() => setShowPriceDialog(true)}
                  >
                    Edit
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Price Alerts</h3>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Get notified about price changes</span>
                  <Switch 
                    checked={alertsEnabled} 
                    onCheckedChange={handleAlertToggle}
                  />
                </div>
                
                {alertsEnabled && (
                  <div className="mt-4">
                    <Label htmlFor="alert-preference" className="text-sm">Alert me when:</Label>
                    <select 
                      id="alert-preference"
                      className="w-full border rounded-md p-2 mt-1 text-sm"
                      value={alertPreference}
                      onChange={(e) => {
                        setAlertPreference(e.target.value);
                        setAlert({
                          itemId: selectedItem.id,
                          enabled: alertsEnabled,
                          preference: e.target.value,
                          targetPrice: targetPrice || undefined
                        });
                      }}
                    >
                      {ALERT_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
            
            {/* Price History */}
            <div className="space-y-2 mt-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium flex items-center">
                  <LineChart size={18} className="mr-2" />
                  Price History
                </h3>
                <span className="text-xs text-muted-foreground">Last 5 months</span>
              </div>
              
              {renderPriceChart()}
            </div>
            
            {/* Similar Items */}
            <div className="mt-8">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Similar Items</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowSimilarItems(!showSimilarItems)}
                >
                  {showSimilarItems ? "Hide" : "Show"}
                </Button>
              </div>
              
              {showSimilarItems && (
                <div className="mt-4 space-y-3">
                  {selectedItem.similarItems.map(item => (
                    <div key={item.id} className="flex justify-between items-center border rounded-lg p-3">
                      <div>
                        <h4 className="font-medium">{item.name}</h4>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Store size={12} className="mr-1" />
                          {item.store}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatPrice(item.price)}</div>
                        <div className="text-xs mt-1">
                          {item.price < selectedItem.currentPrice ? (
                            <span className="text-green-600">
                              {formatPrice(selectedItem.currentPrice - item.price)} cheaper
                            </span>
                          ) : item.price > selectedItem.currentPrice ? (
                            <span className="text-red-600">
                              {formatPrice(item.price - selectedItem.currentPrice)} more expensive
                            </span>
                          ) : (
                            <span>Same price</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => window.history.back()}>Back</Button>
            <Button onClick={() => {
              toast({
                title: "Item Added to Wishlist",
                description: `${selectedItem.name} has been added to your wishlist with price tracking enabled.`,
                duration: 3000
              });
            }}>
              <BadgeDollarSign size={16} className="mr-2" />
              Add with Price Tracking
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {/* Target Price Dialog */}
      <Dialog open={showPriceDialog} onOpenChange={setShowPriceDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Target Price</DialogTitle>
            <DialogDescription>
              We'll notify you when the price drops to or below your target
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-4">
              <div>
                <Label>Current Price: {formatPrice(selectedItem.currentPrice)}</Label>
                <div className="flex items-center mt-2">
                  <Input 
                    type="number" 
                    value={targetPrice !== null ? targetPrice : ''}
                    onChange={(e) => setTargetPrice(e.target.value ? parseFloat(e.target.value) : null)}
                    step="0.01"
                    min="0"
                    className="mr-2"
                  />
                  <Button onClick={() => setTargetPrice(selectedItem.currentPrice * 0.9)}>
                    -10%
                  </Button>
                </div>
                
                {targetPrice !== null && (
                  <div className="mt-2">
                    <Slider
                      defaultValue={[targetPrice]}
                      max={selectedItem.originalPrice * 1.1}
                      min={selectedItem.originalPrice * 0.5}
                      step={1}
                      onValueChange={(value) => setTargetPrice(value[0])}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>-50%</span>
                      <span>+10%</span>
                    </div>
                  </div>
                )}
                
                {targetPrice !== null && targetPrice < selectedItem.currentPrice && (
                  <div className="flex items-center mt-4 text-sm">
                    <span>Savings when target is reached: </span>
                    <span className="text-green-600 ml-2 font-medium">
                      {formatPrice(selectedItem.currentPrice - targetPrice)} 
                      ({((selectedItem.currentPrice - targetPrice) / selectedItem.currentPrice * 100).toFixed(1)}%)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPriceDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleTargetPriceUpdate} 
              disabled={targetPrice === null || isUpdatingPrice}
            >
              Save Target
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">How Our Price Tracking Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Automatic Price Monitoring</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Our system automatically checks prices multiple times daily across dozens of
                major retailers. We track historical price changes so you can make informed
                buying decisions at the best possible time.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Smart Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Set custom price targets and receive instant notifications when prices drop
                to your desired level. Our intelligent system can also alert you when it
                predicts a price is at its lowest point based on historical patterns.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Alternative Suggestions</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                We automatically find similar products at different price points, so you
                can compare alternatives and make the best choice. Our system considers
                features, ratings, and price history to suggest the best value.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PriceTrackingDemo;