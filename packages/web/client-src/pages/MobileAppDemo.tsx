import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  QrCode, 
  BellRing, 
  User, 
  Home,
  Heart,
  Wifi,
  WifiOff,
  Share2
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

// Define interface for pending actions
interface PendingAction {
  type: string;
  barcode?: string;
  timestamp: string;
}

// Define interface for barcode scan response
interface BarcodeScanResponse {
  found: boolean;
  product?: {
    title: string;
    price: string;
    store?: string;
  };
}

// Mobile device screens/modes
type ScreenMode = 'home' | 'scan' | 'wishlist' | 'profile' | 'notifications';

// Mock product data for barcode scanning
const SAMPLE_BARCODE = "0123456789";

const MobileAppDemo = () => {
  const [activeScreen, setActiveScreen] = useState<ScreenMode>('home');
  const [barcode, setBarcode] = useState(SAMPLE_BARCODE);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const { toast } = useToast();

  // Simulate scanning a barcode
  const { mutate: scanBarcode, isPending: isScanning } = useMutation<BarcodeScanResponse>({
    mutationFn: async (): Promise<BarcodeScanResponse> => {
      if (!isOnline) {
        // Simulate offline behavior
        toast({
          title: "Offline Mode",
          description: "Product added to pending actions. Will sync when online.",
          duration: 3000
        });
        
        setPendingActions([
          ...pendingActions, 
          { 
            type: 'scan_barcode', 
            barcode, 
            timestamp: new Date().toISOString() 
          }
        ]);
        
        // Return mock data in offline mode
        return {
          found: true,
          product: {
            title: "Offline Product",
            price: "$XX.XX",
            store: "Scanned while offline"
          }
        };
      }
      
      // In a real implementation, this would be a real API call
      return apiRequest(`/api/mobile/barcode/${barcode}`, {
        method: 'GET'
      }) as Promise<BarcodeScanResponse>;
    },
    onSuccess: (data) => {
      if (data.found && data.product) {
        toast({
          title: "Product Found",
          description: `Found: ${data.product.title} - ${data.product.price}`,
          duration: 3000
        });
      } else {
        toast({
          title: "Product Not Found",
          description: "Product not found. You can add it manually.",
          duration: 3000
        });
      }
    },
    onError: () => {
      toast({
        title: "Scan Error",
        description: "Could not process barcode scan.",
        variant: "destructive",
        duration: 3000
      });
    }
  });

  // Simulate syncing pending actions
  const { mutate: syncData, isPending: isSyncing } = useMutation({
    mutationFn: async () => {
      // In a real implementation, this would be a real API call
      return apiRequest('/api/mobile/sync', {
        method: 'POST',
        body: {
          deviceId: 'demo-device-123',
          lastSyncTime: new Date(Date.now() - 3600000).toISOString(),
          offlineActions: pendingActions
        }
      });
    },
    onSuccess: () => {
      toast({
        title: "Sync Complete",
        description: `${pendingActions.length} actions synced successfully.`,
        duration: 3000
      });
      setPendingActions([]);
    }
  });

  // Toggle online/offline mode for demo
  const toggleNetworkStatus = () => {
    setIsOnline(!isOnline);
    toast({
      title: isOnline ? "Offline Mode" : "Online Mode",
      description: isOnline 
        ? "App is now in offline mode. Actions will be saved locally."
        : "App is now connected to the network.",
      duration: 3000
    });
  };
  
  // Demo wishlists data
  const wishlists = [
    { id: 1, name: "Birthday Wishlist", itemCount: 12 },
    { id: 2, name: "Holiday Gifts", itemCount: 8 },
    { id: 3, name: "Home Decor Ideas", itemCount: 5 }
  ];
  
  // Demo notification data
  const notifications = [
    { id: 1, title: "Price Drop Alert", message: "Wireless Headphones price dropped by 15%!" },
    { id: 2, title: "New Recommendation", message: "We found 3 items you might like based on your preferences" },
    { id: 3, title: "Wishlist Reminder", message: "Mom's birthday is in 2 weeks" }
  ];

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Wishlist Wizard Mobile App Demo</h1>
      
      <div className="flex flex-col items-center">
        <Card className="w-full max-w-sm shadow-lg border-2 relative">
          {/* Status Bar */}
          <div className="bg-slate-800 text-white p-2 flex justify-between items-center text-xs">
            <span>12:34 PM</span>
            <div className="flex items-center gap-1">
              {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
              <span className="ml-1">{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
          
          {/* Main Content Area */}
          <CardContent className="p-4 h-[500px] overflow-y-auto">
            {activeScreen === 'home' && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Welcome Back!</h2>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Your Wishlists</h3>
                  {wishlists.map(list => (
                    <Card key={list.id} className="mb-2 cursor-pointer hover:bg-slate-50">
                      <CardContent className="p-3 flex justify-between items-center">
                        <div>
                          <p className="font-medium">{list.name}</p>
                          <p className="text-sm text-slate-500">{list.itemCount} items</p>
                        </div>
                        <Button variant="ghost" size="icon">
                          <Share2 size={16} />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Recent Activity</h3>
                  <Card className="mb-2">
                    <CardContent className="p-3">
                      <p className="text-sm font-medium">Price tracking activated</p>
                      <p className="text-xs text-slate-500">Wireless Headphones</p>
                    </CardContent>
                  </Card>
                  <Card className="mb-2">
                    <CardContent className="p-3">
                      <p className="text-sm font-medium">New item added to wishlist</p>
                      <p className="text-xs text-slate-500">Smart Watch - Tech World</p>
                    </CardContent>
                  </Card>
                  <Card className="mb-2">
                    <CardContent className="p-3">
                      <p className="text-sm font-medium">Calendar reminder set</p>
                      <p className="text-xs text-slate-500">Mom&apos;s Birthday: July 15th</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
            
            {activeScreen === 'scan' && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Scan Product</h2>
                <div className="rounded-md border-2 border-dashed border-gray-300 p-6 mb-4 flex flex-col items-center justify-center bg-gray-50">
                  <QrCode size={80} className="mb-2 text-gray-400" />
                  <p className="text-center text-sm text-gray-500">
                    Point your camera at a product barcode to scan
                  </p>
                </div>
                
                <div className="mb-4">
                  <Label htmlFor="barcode">Manual Barcode Entry</Label>
                  <div className="flex gap-2 mt-1">
                    <Input 
                      id="barcode" 
                      placeholder="Enter barcode..." 
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                    />
                    <Button onClick={() => scanBarcode()} disabled={isScanning}>
                      {isScanning ? "Scanning..." : "Scan"}
                    </Button>
                  </div>
                </div>
                
                <h3 className="text-lg font-semibold mb-2">Recent Scans</h3>
                <div className="space-y-2">
                  <Card>
                    <CardContent className="p-3">
                      <p className="font-medium">Bluetooth Speaker</p>
                      <p className="text-sm text-slate-500">$39.99 - Electronics Emporium</p>
                      <div className="flex justify-end mt-2">
                        <Button size="sm" variant="outline">Add to Wishlist</Button>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <p className="font-medium">Coffee Maker</p>
                      <p className="text-sm text-slate-500">$49.99 - Home Goods</p>
                      <div className="flex justify-end mt-2">
                        <Button size="sm" variant="outline">Add to Wishlist</Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
            
            {activeScreen === 'wishlist' && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Wishlists</h2>
                
                <Tabs defaultValue="all">
                  <TabsList className="w-full mb-4">
                    <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
                    <TabsTrigger value="mine" className="flex-1">Mine</TabsTrigger>
                    <TabsTrigger value="shared" className="flex-1">Shared</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="all">
                    <div className="space-y-3">
                      {wishlists.map(list => (
                        <Card key={list.id} className="cursor-pointer hover:bg-slate-50">
                          <CardContent className="p-3">
                            <p className="font-medium">{list.name}</p>
                            <p className="text-sm text-slate-500">{list.itemCount} items</p>
                            <div className="flex justify-end gap-2 mt-2">
                              <Button size="sm" variant="outline">View</Button>
                              <Button size="sm">Add Item</Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="mine">
                    <div className="space-y-3">
                      <Card className="cursor-pointer hover:bg-slate-50">
                        <CardContent className="p-3">
                          <p className="font-medium">Birthday Wishlist</p>
                          <p className="text-sm text-slate-500">12 items</p>
                          <div className="flex justify-end gap-2 mt-2">
                            <Button size="sm" variant="outline">View</Button>
                            <Button size="sm">Add Item</Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="shared">
                    <div className="space-y-3">
                      <Card className="cursor-pointer hover:bg-slate-50">
                        <CardContent className="p-3">
                          <p className="font-medium">Holiday Gifts</p>
                          <p className="text-sm text-slate-500">8 items</p>
                          <div className="flex justify-end gap-2 mt-2">
                            <Button size="sm" variant="outline">View</Button>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="cursor-pointer hover:bg-slate-50">
                        <CardContent className="p-3">
                          <p className="font-medium">Home Decor Ideas</p>
                          <p className="text-sm text-slate-500">5 items</p>
                          <div className="flex justify-end gap-2 mt-2">
                            <Button size="sm" variant="outline">View</Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
                
                <div className="mt-4">
                  <Button className="w-full">Create New Wishlist</Button>
                </div>
              </div>
            )}
            
            {activeScreen === 'notifications' && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Notifications</h2>
                <div className="space-y-3">
                  {notifications.map(notification => (
                    <Card key={notification.id} className="cursor-pointer hover:bg-slate-50">
                      <CardContent className="p-3">
                        <div className="flex gap-3 items-start">
                          <BellRing className="mt-1 text-primary" size={16} />
                          <div>
                            <p className="font-medium">{notification.title}</p>
                            <p className="text-sm text-slate-500">{notification.message}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <div className="mt-4">
                  <Button variant="outline" className="w-full">Mark All as Read</Button>
                </div>
              </div>
            )}
            
            {activeScreen === 'profile' && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Profile</h2>
                <div className="flex items-center justify-center mb-6">
                  <div className="h-24 w-24 rounded-full bg-slate-200 flex items-center justify-center">
                    <User size={40} className="text-slate-400" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" value="johndoe" readOnly className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value="john.doe@example.com" readOnly className="mt-1" />
                  </div>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Sync Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">Last synced: 5 minutes ago</p>
                          <p className="text-sm text-slate-500">
                            {pendingActions.length > 0 
                              ? `${pendingActions.length} actions pending sync` 
                              : 'All data is synced'}
                          </p>
                        </div>
                        <Button 
                          onClick={() => syncData()} 
                          disabled={isSyncing || pendingActions.length === 0 || !isOnline}
                          size="sm"
                        >
                          {isSyncing ? "Syncing..." : "Sync Now"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="flex justify-between items-center">
                    <Label>Network Status</Label>
                    <Button 
                      variant={isOnline ? "default" : "outline"} 
                      onClick={toggleNetworkStatus}
                      size="sm"
                    >
                      {isOnline ? "Go Offline" : "Go Online"}
                    </Button>
                  </div>
                  
                  <div className="pt-4">
                    <Button variant="destructive" className="w-full">Sign Out</Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          
          {/* Mobile Navigation */}
          <div className="bg-slate-50 p-2 border-t">
            <div className="flex justify-between">
              <Button 
                variant={activeScreen === 'home' ? "default" : "ghost"} 
                className="flex-1 flex flex-col items-center py-2"
                onClick={() => setActiveScreen('home')}
              >
                <Home size={20} />
                <span className="text-xs mt-1">Home</span>
              </Button>
              <Button 
                variant={activeScreen === 'scan' ? "default" : "ghost"} 
                className="flex-1 flex flex-col items-center py-2"
                onClick={() => setActiveScreen('scan')}
              >
                <QrCode size={20} />
                <span className="text-xs mt-1">Scan</span>
              </Button>
              <Button 
                variant={activeScreen === 'wishlist' ? "default" : "ghost"} 
                className="flex-1 flex flex-col items-center py-2"
                onClick={() => setActiveScreen('wishlist')}
              >
                <Heart size={20} />
                <span className="text-xs mt-1">Wishlists</span>
              </Button>
              <Button 
                variant={activeScreen === 'notifications' ? "default" : "ghost"} 
                className="flex-1 flex flex-col items-center py-2"
                onClick={() => setActiveScreen('notifications')}
              >
                <BellRing size={20} />
                <span className="text-xs mt-1">Alerts</span>
              </Button>
              <Button 
                variant={activeScreen === 'profile' ? "default" : "ghost"} 
                className="flex-1 flex flex-col items-center py-2"
                onClick={() => setActiveScreen('profile')}
              >
                <User size={20} />
                <span className="text-xs mt-1">Profile</span>
              </Button>
            </div>
          </div>
        </Card>
        
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Mobile App Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Offline Mode</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Wishlist Wizard mobile app works even without an internet connection. 
                  All your changes are stored locally and automatically synced when 
                  you&apos;re back online.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Barcode Scanning</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Quickly add items to your wishlists by scanning product barcodes 
                  while shopping in physical stores. Product details are automatically 
                  populated.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Push Notifications</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Get instant alerts for price drops, wishlist updates, and approaching 
                  occasions. Stay on top of gift-giving without constantly checking the app.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileAppDemo;