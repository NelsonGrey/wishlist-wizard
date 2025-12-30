import React, { useState } from 'react';
import { ARViewer } from './ARViewer';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Props for the product AR viewer
interface ARProductViewerProps {
  product?: {
    id: number;
    title: string;
    price: string;
    category?: string;
    imageUrl: string;
    modelUrl?: string;
    brand?: string;
    store?: string;
  };
  className?: string;
}

export function ARProductViewer({ product, className = "" }: ARProductViewerProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('view3d');
  
  // Determine which model type to use based on product category or title
  const getModelType = () => {
    if (!product) return 'chair';
    
    const title = product.title?.toLowerCase() || '';
    const category = product.category?.toLowerCase() || '';
    
    if (category.includes('chair') || title.includes('chair')) {
      return 'chair';
    } else if (category.includes('table') || title.includes('table')) {
      return 'table';
    } else if (category.includes('lamp') || title.includes('lamp')) {
      return 'lamp';
    }
    
    // Default to a chair
    return 'chair';
  };

  // Determine model color based on product info
  const getModelColor = () => {
    // This could be more sophisticated, extracting dominant colors from product images
    // For now using a simple mapping based on categories
    const category = product?.category?.toLowerCase() || '';
    
    if (category.includes('modern') || category.includes('contemporary')) {
      return '#424242'; // dark gray for modern furniture
    } else if (category.includes('vintage') || category.includes('antique')) {
      return '#8d6e63'; // brown for vintage
    } else if (category.includes('colorful') || category.includes('kids')) {
      return '#1e88e5'; // blue for colorful items
    }
    
    return undefined; // use default colors
  };

  // Share AR view with others
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `AR View of ${product?.title || 'Product'}`,
          text: `Check out this product in AR: ${product?.title}`,
          url: window.location.href,
        });
        toast({
          title: 'Shared!',
          description: 'AR view has been shared successfully',
        });
      } catch (error) {
        console.error('Error sharing:', error);
        toast({
          title: 'Share failed',
          description: 'Unable to share the AR view',
          variant: 'destructive',
        });
      }
    } else {
      // Fallback for browsers that don't support navigator.share
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Link copied!',
        description: 'AR view link has been copied to clipboard',
      });
    }
  };

  return (
    <Card className={`w-full overflow-hidden ${className}`}>
      <CardHeader className="pb-0">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl font-bold">
              {product?.title || 'View Product in AR'}
            </CardTitle>
            <CardDescription>
              {product?.brand ? `${product.brand} • ` : ''}
              {product?.price ? `$${product.price}` : ''}
              {product?.store && <Badge variant="outline" className="ml-2">{product.store}</Badge>}
            </CardDescription>
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" size="icon" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 pt-4">
        <Tabs defaultValue="view3d" className="w-full" value={activeTab} onValueChange={setActiveTab}>
          <div className="px-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="view3d">3D View</TabsTrigger>
              <TabsTrigger value="viewar">AR View</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="view3d" className="mt-0">
            <ARViewer 
              modelType={getModelType()}
              scale={1.5}
              color={getModelColor()}
            />
          </TabsContent>
          
          <TabsContent value="viewar" className="mt-0">
            <div className="h-[400px] bg-muted flex flex-col items-center justify-center p-6 text-center">
              <Camera className="h-16 w-16 mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">AR Experience</h3>
              <p className="text-muted-foreground mb-6">Point your camera at a flat surface to place this item in your space.</p>
              
              <Button onClick={() => {
                toast({
                  title: "AR Mode Activated",
                  description: "For full AR functionality, please use the mobile app or enable AR in your device settings.",
                });
              }}>
                Launch AR Experience
              </Button>
              
              <p className="text-xs text-muted-foreground mt-4">
                AR works best on supported mobile devices with ARCore or ARKit.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          Rotate, zoom, and move to explore the product in 3D
        </div>
      </CardFooter>
    </Card>
  );
}