import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Box, RotateCw } from 'lucide-react';
import '@/styles/ar-viewer.css';

// Props for the AR Viewer component
interface ARViewerProps {
  modelType?: 'chair' | 'table' | 'lamp' | 'default';
  scale?: number;
  color?: string;
  className?: string;
}

// Main AR Viewer component with static image representation
export function ARViewer({ 
  modelType = 'chair',
  scale = 1.5,
  color,
  className = ""
}: ARViewerProps) {
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
    // These would be paths to static images in your project
    // Inline SVG fallback until model preview assets are available
    const viewType = activeView === 'front' ? 'front' : activeView === 'side' ? 'side' : 'angle';
    const label = `${modelType.charAt(0).toUpperCase() + modelType.slice(1)} ${viewType} view`;
    const normalizedColor = typeof color === 'string' && /^#?[0-9a-fA-F]{6}$/.test(color)
      ? (color.startsWith('#') ? color : `#${color}`)
      : '#e2e8f0';

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
        <rect width="400" height="300" fill="${normalizedColor}" />
        <rect x="16" y="16" width="368" height="268" rx="16" fill="rgba(255,255,255,0.7)" />
        <text x="200" y="150" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#1f2937">${label}</text>
      </svg>
    `.trim();

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };
  
  return (
    <div className={`relative h-[400px] w-full rounded-md overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200 ${className}`}>
      {isLoading ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/10 backdrop-blur-sm">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-lg font-medium">Loading 3D viewer...</p>
        </div>
      ) : (
        <div className="relative h-full w-full">
          <div className="h-full w-full flex items-center justify-center p-4 relative">
            <img 
              src={getImageSrc()} 
              alt={`3D model of ${modelType}`}
              className="max-h-full max-w-full object-contain shadow-lg rounded-md"
            />
            
            {/* 3D information overlay */}
            <div className="absolute top-2 right-2 flex flex-col gap-2">
              <div className="bg-black/40 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
                <div className="flex items-center gap-1">
                  <Box className="h-3 w-3" />
                  <span>3D Model: {modelType.charAt(0).toUpperCase() + modelType.slice(1)}</span>
                </div>
              </div>
            </div>
            
            {/* Visual depth indicator */}
            <div className="absolute top-1/2 -translate-y-1/2 left-4 flex flex-col items-center">
              <div className="h-32 w-1 bg-black/10 rounded-full relative overflow-hidden">
                <div 
                  className="ar-scale-indicator"
                  style={{ '--ar-scale-height': `${scale * 30}%` } as React.CSSProperties}
                ></div>
              </div>
              <span className="text-xs mt-1 text-muted-foreground">Depth</span>
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