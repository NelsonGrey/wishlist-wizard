import React, { useState, useRef } from 'react';
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
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { 
  CameraIcon, 
  Sofa, 
  Bed, 
  Table, 
  Move3d, 
  Furniture,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Ruler,
  Check,
  X
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';

// Mock product data for our AR visualizer demo
const DEMO_PRODUCTS = [
  {
    id: 1,
    title: "Modern Sofa",
    price: "$899.99",
    imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8c29mYXxlbnwwfHwwfHx8MA%3D%3D",
    dimensions: { width: 200, height: 85, depth: 90 },
    category: "Furniture",
    hasArModel: true
  },
  {
    id: 2,
    title: "Coffee Table",
    price: "$249.99",
    imageUrl: "https://images.unsplash.com/photo-1634712282287-14ed57b9cc89?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8Y29mZmVlJTIwdGFibGV8ZW58MHx8MHx8fDA%3D",
    dimensions: { width: 120, height: 45, depth: 60 },
    category: "Furniture",
    hasArModel: true
  },
  {
    id: 3,
    title: "Floor Lamp",
    price: "$129.99",
    imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bGFtcHxlbnwwfHwwfHx8MA%3D",
    dimensions: { width: 35, height: 165, depth: 35 },
    category: "Lighting",
    hasArModel: true
  }
];

// Room types for visualization
const ROOM_TYPES = [
  { id: "living_room", name: "Living Room", icon: <Sofa size={20} /> },
  { id: "bedroom", name: "Bedroom", icon: <Bed size={20} /> },
  { id: "dining_room", name: "Dining Room", icon: <Table size={20} /> }
];

// Reference objects for size comparison
const REFERENCE_OBJECTS = [
  { id: "credit_card", name: "Credit Card", dimensions: { width: 8.56, height: 5.39, depth: 0.1 } },
  { id: "smartphone", name: "Smartphone", dimensions: { width: 7.0, height: 15.0, depth: 0.8 } },
  { id: "soda_can", name: "Soda Can", dimensions: { width: 6.5, height: 12.0, depth: 6.5 } },
  { id: "basketball", name: "Basketball", dimensions: { width: 24.0, height: 24.0, depth: 24.0 } },
  { id: "door", name: "Door", dimensions: { width: 91.0, height: 203.0, depth: 4.0 } }
];

// Mode represents the different AR visualization modes
type VisMode = 'room' | 'size' | 'fit';

const ArVisualizerDemo = () => {
  const [selectedProduct, setSelectedProduct] = useState(DEMO_PRODUCTS[0]);
  const [visMode, setVisMode] = useState<VisMode>('room');
  const [roomType, setRoomType] = useState("living_room");
  const [referenceObject, setReferenceObject] = useState("smartphone");
  const [productRotation, setProductRotation] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showDimensions, setShowDimensions] = useState(true);
  const [roomDimensions, setRoomDimensions] = useState({ 
    width: 400, // cm
    length: 500, // cm
    height: 250  // cm
  });
  const arViewRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Simulate AR session tracking
  const { mutate: trackArSession } = useMutation({
    mutationFn: async (data: any) => {
      // In a real app, this would make an API call
      toast({
        title: "AR Session Started",
        description: `Viewing ${selectedProduct.title} in ${visMode} mode`,
        duration: 3000
      });
      return { success: true, sessionId: 123 };
    }
  });

  // Start an AR visualization session
  const startArSession = () => {
    trackArSession({
      productId: selectedProduct.id,
      mode: visMode,
      deviceType: "web",
      roomType: visMode === 'room' ? roomType : null,
      referenceObject: visMode === 'size' ? referenceObject : null
    });
  };

  // Rotate product left or right
  const rotateProduct = (direction: 'left' | 'right') => {
    const amount = direction === 'left' ? -45 : 45;
    setProductRotation((current) => {
      const newRotation = (current + amount) % 360;
      return newRotation < 0 ? 360 + newRotation : newRotation;
    });
  };

  // Change zoom level
  const handleZoom = (direction: 'in' | 'out') => {
    const amount = direction === 'in' ? 10 : -10;
    setZoomLevel((current) => {
      const newZoom = Math.max(50, Math.min(150, current + amount));
      return newZoom;
    });
  };

  // Get product dimensions in user-friendly format
  const formatDimensions = (dimensions: { width: number, height: number, depth: number }) => {
    return `W: ${dimensions.width}cm × H: ${dimensions.height}cm × D: ${dimensions.depth}cm`;
  };

  // Check if product fits in room
  const checkProductFit = () => {
    const { width, height, depth } = selectedProduct.dimensions;
    const fits = {
      width: width <= roomDimensions.width,
      height: height <= roomDimensions.height,
      depth: depth <= roomDimensions.length,
      overall: (
        width <= roomDimensions.width &&
        height <= roomDimensions.height &&
        depth <= roomDimensions.length
      )
    };
    
    return fits;
  };

  // Size comparison with reference object
  const getSizeComparison = () => {
    const refObj = REFERENCE_OBJECTS.find(obj => obj.id === referenceObject);
    if (!refObj) return null;
    
    const { width, height, depth } = selectedProduct.dimensions;
    const refDim = refObj.dimensions;
    
    return {
      width: {
        ratio: width / refDim.width,
        text: `${(width / refDim.width).toFixed(1)}× wider than ${refObj.name}`
      },
      height: {
        ratio: height / refDim.height,
        text: `${(height / refDim.height).toFixed(1)}× taller than ${refObj.name}`
      },
      depth: {
        ratio: depth / refDim.depth,
        text: `${(depth / refDim.depth).toFixed(1)}× deeper than ${refObj.name}`
      }
    };
  };

  // Get room visualization image (simulated)
  const getRoomVisualizationImage = () => {
    // In a real app, this would get a rendered image from a 3D service
    // For our demo, we'll use placeholder room images
    const roomImages = {
      living_room: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bGl2aW5nJTIwcm9vbXxlbnwwfHwwfHx8MA%3D%3D",
      bedroom: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8YmVkcm9vbXxlbnwwfHwwfHx8MA%3D%3D", 
      dining_room: "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8ZGluaW5nJTIwcm9vbXxlbnwwfHwwfHx8MA%3D%3D"
    };
    
    return roomImages[roomType as keyof typeof roomImages];
  };

  // Get size comparison visualization (simulated)
  const getSizeComparisonImage = () => {
    // In a real app, this would get a rendered comparison from a 3D service
    // For our demo, we'll use the product image
    return selectedProduct.imageUrl;
  };

  const productFit = checkProductFit();
  const sizeComparison = getSizeComparison();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Augmented Reality Product Visualizer</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Product Selection */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Select a Product</CardTitle>
            <CardDescription>Choose a product to visualize in AR</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {DEMO_PRODUCTS.map(product => (
              <div 
                key={product.id} 
                className={`border rounded-lg p-2 cursor-pointer hover:border-primary transition-colors ${selectedProduct.id === product.id ? 'border-primary bg-primary/5' : ''}`}
                onClick={() => setSelectedProduct(product)}
              >
                <div className="flex gap-3">
                  <img 
                    src={product.imageUrl} 
                    alt={product.title} 
                    className="w-20 h-20 object-cover rounded-md"
                  />
                  <div>
                    <h3 className="font-medium">{product.title}</h3>
                    <p className="text-sm text-muted-foreground">{product.price}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDimensions(product.dimensions)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        
        {/* AR Visualization */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>AR Visualization</CardTitle>
                <CardDescription>See how this product looks in your space</CardDescription>
              </div>
              <Button onClick={startArSession} className="flex gap-2 items-center">
                <CameraIcon size={16} />
                View in AR
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Visualization Modes */}
            <Tabs defaultValue="room" className="mb-4" onValueChange={(value) => setVisMode(value as VisMode)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="room" className="flex gap-2 items-center">
                  <Furniture size={16} />
                  Room View
                </TabsTrigger>
                <TabsTrigger value="size" className="flex gap-2 items-center">
                  <Ruler size={16} />
                  Size Compare
                </TabsTrigger>
                <TabsTrigger value="fit" className="flex gap-2 items-center">
                  <Move3d size={16} />
                  Space Fit
                </TabsTrigger>
              </TabsList>
              
              {/* Room View Tab */}
              <TabsContent value="room">
                <div className="space-y-4">
                  <div>
                    <Label>Room Type</Label>
                    <RadioGroup 
                      className="flex justify-start space-x-4 mt-2" 
                      defaultValue={roomType}
                      onValueChange={setRoomType}
                    >
                      {ROOM_TYPES.map(room => (
                        <div key={room.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={room.id} id={room.id} />
                          <Label htmlFor={room.id} className="flex items-center gap-1 cursor-pointer">
                            {room.icon}
                            <span>{room.name}</span>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                  
                  <div className="relative h-[300px] rounded-lg overflow-hidden bg-slate-100 border flex items-center justify-center" ref={arViewRef}>
                    <img 
                      src={getRoomVisualizationImage()} 
                      alt={roomType}
                      className="w-full h-full object-cover absolute inset-0" 
                    />
                    <img 
                      src={selectedProduct.imageUrl} 
                      alt={selectedProduct.title} 
                      className="absolute w-1/3 transform-gpu transition-all duration-300 drop-shadow-lg"
                      style={{
                        transform: `rotate(${productRotation}deg) scale(${zoomLevel / 100})`,
                        bottom: '10%',
                        left: '30%',
                      }}
                    />
                    {showDimensions && (
                      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md">
                        {formatDimensions(selectedProduct.dimensions)}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between">
                    <div className="flex gap-2">
                      <Button size="icon" variant="outline" onClick={() => rotateProduct('left')}>
                        <RotateCcw size={16} />
                      </Button>
                      <Button size="icon" variant="outline" onClick={() => rotateProduct('right')}>
                        <RotateCw size={16} />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button size="icon" variant="outline" onClick={() => handleZoom('out')}>
                        <ZoomOut size={16} />
                      </Button>
                      <Button size="icon" variant="outline" onClick={() => handleZoom('in')}>
                        <ZoomIn size={16} />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={showDimensions} 
                        onCheckedChange={setShowDimensions} 
                        id="dimensions"
                      />
                      <Label htmlFor="dimensions">Show Dimensions</Label>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              {/* Size Comparison Tab */}
              <TabsContent value="size">
                <div className="space-y-4">
                  <div>
                    <Label>Compare To</Label>
                    <select 
                      className="w-full border rounded p-2 mt-2" 
                      value={referenceObject}
                      onChange={(e) => setReferenceObject(e.target.value)}
                    >
                      {REFERENCE_OBJECTS.map(obj => (
                        <option key={obj.id} value={obj.id}>
                          {obj.name} ({formatDimensions(obj.dimensions)})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="relative h-[300px] rounded-lg overflow-hidden bg-slate-100 border flex items-center justify-center">
                    <img 
                      src={getSizeComparisonImage()} 
                      alt={selectedProduct.title}
                      className="h-4/5 object-contain"
                    />
                    {sizeComparison && (
                      <div className="absolute bottom-4 left-4 right-4 bg-black/60 text-white text-sm p-3 rounded-md">
                        <p className="text-center font-medium mb-2">Size Comparison</p>
                        <p>{sizeComparison.width.text}</p>
                        <p>{sizeComparison.height.text}</p>
                        <p>{sizeComparison.depth.text}</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              {/* Space Fit Tab */}
              <TabsContent value="fit">
                <div className="space-y-4">
                  <div>
                    <Label>Your Room Dimensions (cm)</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div>
                        <Label className="text-xs">Width</Label>
                        <Input 
                          type="number" 
                          value={roomDimensions.width}
                          onChange={(e) => setRoomDimensions({...roomDimensions, width: parseFloat(e.target.value) || 0})}
                          min={0}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Length</Label>
                        <Input 
                          type="number" 
                          value={roomDimensions.length}
                          onChange={(e) => setRoomDimensions({...roomDimensions, length: parseFloat(e.target.value) || 0})}
                          min={0}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Height</Label>
                        <Input 
                          type="number" 
                          value={roomDimensions.height}
                          onChange={(e) => setRoomDimensions({...roomDimensions, height: parseFloat(e.target.value) || 0})}
                          min={0}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Card className="bg-slate-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        Will it fit?
                        {productFit.overall ? (
                          <Check className="text-green-500" size={18} />
                        ) : (
                          <X className="text-red-500" size={18} />
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span>Width: {selectedProduct.dimensions.width}cm</span>
                          <span className={productFit.width ? "text-green-600" : "text-red-600"}>
                            {productFit.width ? "Fits" : "Too wide"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Height: {selectedProduct.dimensions.height}cm</span>
                          <span className={productFit.height ? "text-green-600" : "text-red-600"}>
                            {productFit.height ? "Fits" : "Too tall"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Depth: {selectedProduct.dimensions.depth}cm</span>
                          <span className={productFit.depth ? "text-green-600" : "text-red-600"}>
                            {productFit.depth ? "Fits" : "Too deep"}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-4 p-3 rounded-md border border-dashed">
                        <p className="text-sm font-medium">Recommendation:</p>
                        <p className="text-sm mt-1">
                          {productFit.overall
                            ? `This ${selectedProduct.title.toLowerCase()} will fit in your space with room to spare.`
                            : `This ${selectedProduct.title.toLowerCase()} may be too large for your space. Consider measuring carefully or looking for a smaller size.`
                          }
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => window.history.back()}>Back</Button>
            <Button onClick={() => { 
              toast({
                title: "Item Added to Wishlist",
                description: `${selectedProduct.title} has been added to your wishlist.`,
                duration: 3000
              });
            }}>
              Add to Wishlist
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">How Our AR Technology Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Room Visualization</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                See exactly how furniture and decor will look in your actual space.
                Simply point your camera at the room and our AR technology places a 
                realistic 3D model of the product right where you want it.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Size Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Never be surprised by product dimensions again. Our size comparison
                tool lets you visualize products next to common objects so you can
                understand the true scale before purchasing.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Space Fit Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Our intelligent space analyzer measures your room and determines if
                a product will fit. Avoid the disappointment of buying something too
                large for your space with accurate fit predictions.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ArVisualizerDemo;