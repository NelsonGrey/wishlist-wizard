import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Box, RotateCw } from 'lucide-react';

// Props for the AR Viewer component
interface ARSimpleViewerProps {
  modelType?: 'chair' | 'table' | 'lamp' | 'default';
  className?: string;
}

// Simple AR Viewer component using static images
export function ARSimpleViewer({ 
  modelType = 'chair',
  className = ""
}: ARSimpleViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<'front' | 'angle' | 'side'>('angle');
  
  // Set loading state
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Get the image source based on the model type and view
  const getImageSrc = () => {
    // These would typically be paths to actual images in your project
    // For this demo, we'll use placeholder URLs
    const viewType = activeView;
    
    if (modelType === 'chair') {
      return `https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=500&h=400`;
    } else if (modelType === 'table') {
      return `https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?auto=format&fit=crop&w=500&h=400`;
    } else if (modelType === 'lamp') {
      return `https://images.unsplash.com/photo-1534291641485-883c841b6406?auto=format&fit=crop&w=500&h=400`;
    } else {
      return `https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=500&h=400`;
    }
  };
  
  return (
    <div className={`relative h-[400px] w-full rounded-md overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200 ${className}`}>
      {isLoading ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/10 backdrop-blur-sm">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-lg font-medium">Loading product viewer...</p>
        </div>
      ) : (
        <div className="relative h-full w-full">
          <div className="h-full w-full flex items-center justify-center p-4 relative">
            <img 
              src={getImageSrc()} 
              alt={`Product visualization: ${modelType}`}
              className="max-h-full max-w-full object-contain shadow-lg rounded-md"
            />
            
            {/* Product info overlay */}
            <div className="absolute top-2 right-2 flex flex-col gap-2">
              <div className="bg-black/40 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
                <div className="flex items-center gap-1">
                  <Box className="h-3 w-3" />
                  <span>Product: {modelType.charAt(0).toUpperCase() + modelType.slice(1)}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* View controls */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
            <div className="bg-white rounded-lg shadow-md flex p-1">
              <Button 
                variant={activeView === 'front' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setActiveView('front')}
                className="px-3"
              >
                Front
              </Button>
              <Button 
                variant={activeView === 'angle' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setActiveView('angle')}
                className="px-3"
              >
                Angle
              </Button>
              <Button 
                variant={activeView === 'side' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setActiveView('side')}
                className="px-3"
              >
                Side
              </Button>
            </div>
          </div>
          
          {/* Interactive hint */}
          <div className="absolute top-4 left-4 text-xs bg-white/80 px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2">
            <RotateCw className="h-3 w-3 text-muted-foreground" />
            <span>Change view to see different angles</span>
          </div>
        </div>
      )}
    </div>
  );
}