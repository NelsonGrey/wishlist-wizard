import React from 'react';
import { ARProductViewer } from '@/components/ar-visualization/ARProductViewer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'wouter';
import { Cube, ShoppingBag, LayoutGrid, Phone } from 'lucide-react';

// Sample products for the AR demo
const SAMPLE_PRODUCTS = [
  {
    id: 1,
    title: 'Modern Accent Chair',
    price: '249.99',
    category: 'furniture',
    imageUrl: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1160&q=80',
    brand: 'Comfy Living',
    store: 'HomeStyle',
  },
  {
    id: 2,
    title: 'Premium Wireless Headphones',
    price: '199.99',
    category: 'electronics',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80',
    brand: 'SoundMaster',
    store: 'ElectroWorld',
  },
  {
    id: 3,
    title: 'Contemporary Coffee Table',
    price: '349.99',
    category: 'furniture',
    imageUrl: 'https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=688&q=80',
    brand: 'UrbanDwelling',
    store: 'FurnitureExpress',
  },
  {
    id: 4,
    title: 'Designer Table Lamp',
    price: '89.99',
    category: 'homeDecor',
    imageUrl: 'https://images.unsplash.com/photo-1534291641485-883c841b6406?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=627&q=80',
    brand: 'LuminaDesign',
    store: 'HomeDecorPlus',
  }
];

export default function ArVisualizerDemo() {
  const [selectedProduct, setSelectedProduct] = React.useState(SAMPLE_PRODUCTS[0]);
  
  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-600">
            AR Product Visualizer
          </h1>
          <p className="text-muted-foreground text-lg">
            See how items from your wishlist would look in your space before purchasing
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle>Visualize in 3D and AR</CardTitle>
              <CardDescription>
                Explore products from multiple angles or place them in your space with AR
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ARProductViewer product={selectedProduct} />
            </CardContent>
          </Card>
          
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>How It Works</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3 text-sm">
                  <li className="flex gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs">1</span>
                    <div>Select a product from your wishlist</div>
                  </li>
                  <li className="flex gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs">2</span>
                    <div>Explore the item in 3D from all angles</div>
                  </li>
                  <li className="flex gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs">3</span>
                    <div>Use AR mode to place it in your room</div>
                  </li>
                  <li className="flex gap-2">
                    <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs">4</span>
                    <div>Take pictures to share or save for later</div>
                  </li>
                </ol>
                
                <div className="mt-4 pt-4 border-t">
                  <Link href="/wishlist">
                    <Button className="w-full">Try with Your Wishlist</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Try More Features</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                <Link href="/mobile-app-demo">
                  <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2 items-center justify-center">
                    <Phone className="h-5 w-5" />
                    <span>Mobile App</span>
                  </Button>
                </Link>
                <Link href="/social-sharing-demo">
                  <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2 items-center justify-center">
                    <LayoutGrid className="h-5 w-5" />
                    <span>Social Sharing</span>
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Sample Products</CardTitle>
            <CardDescription>
              Select a product to visualize in 3D and AR
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {SAMPLE_PRODUCTS.map(product => (
                <div 
                  key={product.id}
                  className={`cursor-pointer border rounded-lg overflow-hidden transition-all ${selectedProduct.id === product.id ? 'ring-2 ring-primary' : 'hover:border-primary'}`}
                  onClick={() => setSelectedProduct(product)}
                >
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    <img 
                      src={product.imageUrl} 
                      alt={product.title}
                      className="object-cover w-full h-full"
                    />
                    <div className="absolute bottom-2 right-2">
                      <div className="bg-primary text-white p-1 rounded-full">
                        <Cube className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-sm line-clamp-1">{product.title}</h3>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-sm font-bold">${product.price}</span>
                      <span className="text-xs text-muted-foreground">{product.store}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}