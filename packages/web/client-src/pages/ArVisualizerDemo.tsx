import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ARSimpleViewer } from '../components/ar-visualization/ARSimpleViewer';
import { trackEvent } from '../lib/analytics';

export default function ArVisualizerDemo() {
  const [selectedProduct, setSelectedProduct] = useState<'chair' | 'table' | 'lamp' | 'default'>('chair');
  
  const handleProductChange = (value: string) => {
    setSelectedProduct(value as 'chair' | 'table' | 'lamp' | 'default');
    trackEvent('ar_product_change', 'ar_viewer', value);
  };
  
  const handleViewButtonClick = () => {
    trackEvent('view_in_ar_clicked', 'ar_viewer', selectedProduct);
    // In a real app, this would trigger the AR view on a mobile device
    alert('In a real app, this would launch the AR view on your mobile device!');
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <Helmet>
        <title>AR Product Visualizer | Wishlist Wizard</title>
        <meta name="description" content="Try AR visualization to see how products would look in your space before adding them to your wishlist." />
      </Helmet>
      
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-2">AR Product Visualizer</h1>
        <p className="text-muted-foreground mb-8">
          See how products would look in your space before adding them to your wishlist.
        </p>
        
        <Tabs defaultValue="demo" className="mb-8">
          <TabsList className="mb-4">
            <TabsTrigger value="demo">Demo</TabsTrigger>
            <TabsTrigger value="how-it-works">How It Works</TabsTrigger>
            <TabsTrigger value="supported-products">Supported Products</TabsTrigger>
          </TabsList>
          
          <TabsContent value="demo">
            <Card>
              <CardHeader>
                <CardTitle>AR Product Preview</CardTitle>
                <CardDescription>
                  Select a product to visualize and explore it from different angles.
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Select Product</label>
                  <Select
                    value={selectedProduct}
                    onValueChange={handleProductChange}
                  >
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chair">Modern Accent Chair</SelectItem>
                      <SelectItem value="table">Coffee Table</SelectItem>
                      <SelectItem value="lamp">Floor Lamp</SelectItem>
                      <SelectItem value="default">Generic Product</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <ARSimpleViewer modelType={selectedProduct} />
              </CardContent>
              
              <CardFooter className="flex justify-between">
                <Button variant="outline">Add to Wishlist</Button>
                <Button onClick={handleViewButtonClick}>
                  View in Your Space
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="how-it-works">
            <Card>
              <CardHeader>
                <CardTitle>How AR Visualization Works</CardTitle>
                <CardDescription>
                  Understanding the technology behind our AR features
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium mb-2">Step 1: Select a Product</h3>
                      <p className="text-muted-foreground">
                        Browse through your wishlist items or search for products you&apos;re interested in.
                      </p>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium mb-2">Step 2: Preview in 3D</h3>
                      <p className="text-muted-foreground">
                        Use our interactive 3D viewer to examine the product from multiple angles before placing it.
                      </p>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium mb-2">Step 3: Launch AR View</h3>
                      <p className="text-muted-foreground">
                        On mobile devices, tap &quot;View in Your Space&quot; to open the camera and place the product in your environment.
                      </p>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium mb-2">Step 4: Adjust and Share</h3>
                      <p className="text-muted-foreground">
                        Move and scale the product to fit your space, then take screenshots to share with friends or family.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="supported-products">
            <Card>
              <CardHeader>
                <CardTitle>Supported Product Categories</CardTitle>
                <CardDescription>
                  We&apos;re continually expanding our library of AR-compatible products
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-2">Furniture</h3>
                    <ul className="list-disc pl-5 text-sm text-muted-foreground">
                      <li>Chairs & Sofas</li>
                      <li>Tables & Desks</li>
                      <li>Beds & Mattresses</li>
                      <li>Storage & Shelving</li>
                    </ul>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-2">Home Decor</h3>
                    <ul className="list-disc pl-5 text-sm text-muted-foreground">
                      <li>Lamps & Lighting</li>
                      <li>Rugs & Mats</li>
                      <li>Artwork & Mirrors</li>
                      <li>Decorative Accents</li>
                    </ul>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-2">Electronics</h3>
                    <ul className="list-disc pl-5 text-sm text-muted-foreground">
                      <li>TVs & Monitors</li>
                      <li>Speakers & Audio</li>
                      <li>Gaming Consoles</li>
                      <li>Smart Home Devices</li>
                    </ul>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-2">Kitchen</h3>
                    <ul className="list-disc pl-5 text-sm text-muted-foreground">
                      <li>Appliances</li>
                      <li>Cookware & Bakeware</li>
                      <li>Dining Sets</li>
                      <li>Storage Solutions</li>
                    </ul>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-2">Outdoor</h3>
                    <ul className="list-disc pl-5 text-sm text-muted-foreground">
                      <li>Patio Furniture</li>
                      <li>Grills & Accessories</li>
                      <li>Planters & Gardening</li>
                      <li>Outdoor Lighting</li>
                    </ul>
                  </div>
                  
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <h3 className="font-medium mb-2">Coming Soon</h3>
                    <ul className="list-disc pl-5 text-sm text-muted-foreground">
                      <li>Clothing & Accessories</li>
                      <li>Fitness Equipment</li>
                      <li>Toys & Games</li>
                      <li>Pet Supplies</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="bg-muted/30 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-3">Tips for Using AR Visualization</h2>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              <span>Ensure you have good lighting for optimal AR performance</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              <span>Clear some space to properly visualize larger items</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
              <span>Use a recent mobile device for the best AR experience</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
              <span>Take screenshots to share visualization with friends and family</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}