import React, { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useGLTF, Environment, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

// Model component to load 3D models
function Model({ url, scale = 1, position = [0, 0, 0], rotation = [0, 0, 0] }) {
  const { scene } = useGLTF(url);
  const modelRef = useRef<THREE.Group>();

  useFrame(() => {
    if (modelRef.current) {
      // Gentle rotation animation
      modelRef.current.rotation.y += 0.002;
    }
  });

  return (
    <primitive 
      ref={modelRef}
      object={scene} 
      position={position} 
      scale={[scale, scale, scale]} 
      rotation={rotation} 
    />
  );
}

// Scene setup component
function ARScene({ modelUrl, scale, position, rotation }) {
  const { camera } = useThree();
  
  // Set initial camera position
  React.useEffect(() => {
    camera.position.set(0, 1, 5);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <Suspense fallback={<ModelLoader />}>
        <Model url={modelUrl} scale={scale} position={position} rotation={rotation} />
        <Environment preset="apartment" />
      </Suspense>
      <OrbitControls />
    </>
  );
}

// Loading indicator while model loads
function ModelLoader() {
  return (
    <Html center>
      <div className="flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-sm text-muted-foreground">Loading 3D model...</p>
      </div>
    </Html>
  );
}

// Camera capture button component
function ARControls({ onCapture }) {
  return (
    <div className="absolute bottom-4 left-0 right-0 flex justify-center">
      <Button 
        onClick={onCapture}
        className="px-6 py-3 rounded-full bg-primary hover:bg-primary/90"
      >
        Capture Scene
      </Button>
    </div>
  );
}

// Props for the main AR Viewer component
interface ARViewerProps {
  modelUrl: string;
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  className?: string;
}

// Main AR Viewer component
export function ARViewer({ 
  modelUrl,
  scale = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  className = ""
}: ARViewerProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  // Function to capture the current scene as an image
  const captureScene = () => {
    try {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const imageUrl = canvas.toDataURL('image/png');
        setCapturedImage(imageUrl);
      }
    } catch (error) {
      console.error('Failed to capture AR scene:', error);
    }
  };

  // Function to reset captured image
  const resetCapture = () => {
    setCapturedImage(null);
  };

  return (
    <div className={`relative h-[500px] w-full bg-black/5 ${className}`}>
      {capturedImage ? (
        <div className="relative h-full w-full">
          <img 
            src={capturedImage} 
            alt="Captured AR Scene" 
            className="w-full h-full object-contain" 
          />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
            <Button 
              variant="outline"
              onClick={resetCapture}
              className="px-4 bg-white/80 hover:bg-white"
            >
              Return to AR View
            </Button>
            <Button 
              onClick={() => {
                const link = document.createElement('a');
                link.href = capturedImage;
                link.download = 'wishkeeper-ar-visualization.png';
                link.click();
              }}
              className="px-4 bg-primary hover:bg-primary/90"
            >
              Download Image
            </Button>
          </div>
        </div>
      ) : (
        <>
          <Canvas shadows dpr={[1, 2]}>
            <PerspectiveCamera makeDefault fov={50} position={[0, 1, 5]} />
            <ARScene 
              modelUrl={modelUrl} 
              scale={scale} 
              position={position} 
              rotation={rotation} 
            />
          </Canvas>
          <ARControls onCapture={captureScene} />
        </>
      )}
    </div>
  );
}

// Preload common models to improve performance
useGLTF.preload('/models/chair.glb');
useGLTF.preload('/models/table.glb');
useGLTF.preload('/models/sofa.glb');