import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Define the navigation props
type RootStackParamList = {
  ARView: { itemId: number };
};

type ARViewScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ARView'>;
type ARViewScreenRouteProp = RouteProp<RootStackParamList, 'ARView'>;

type Props = {
  navigation: ARViewScreenNavigationProp;
  route: ARViewScreenRouteProp;
};

// Enum for AR view modes
type ARMode = 'room' | 'size' | 'fit';

// Mock product data
const MOCK_PRODUCT = {
  id: 1,
  title: 'Modern Leather Sofa',
  price: '$899.99',
  imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8c29mYXxlbnwwfHwwfHx8MA%3D%3D',
  store: 'Furniture Emporium',
  description: 'Elegant modern leather sofa with sturdy wooden frame and comfortable cushions.',
  dimensions: {
    width: 220, // cm
    height: 85, // cm
    depth: 95, // cm
    weight: 45, // kg
  },
  modelUrl: 'https://example.com/3d-models/sofa.glb', // This would be a real 3D model URL in production
};

// List of room types for Room View mode
const ROOM_TYPES = [
  { id: 'living_room', name: 'Living Room', icon: 'home' },
  { id: 'bedroom', name: 'Bedroom', icon: 'bed' },
  { id: 'dining_room', name: 'Dining Room', icon: 'restaurant' },
  { id: 'office', name: 'Office', icon: 'briefcase' },
  { id: 'bathroom', name: 'Bathroom', icon: 'water' },
];

// List of reference objects for Size Compare mode
const REFERENCE_OBJECTS = [
  { id: 'credit_card', name: 'Credit Card', dimensions: { width: 8.56, height: 5.39, depth: 0.1 } },
  { id: 'smartphone', name: 'Smartphone', dimensions: { width: 7, height: 15, depth: 0.8 } },
  { id: 'soda_can', name: 'Soda Can', dimensions: { width: 6.5, height: 12, depth: 6.5 } },
  { id: 'basketball', name: 'Basketball', dimensions: { width: 24, height: 24, depth: 24 } },
  { id: 'door', name: 'Door', dimensions: { width: 91, height: 203, depth: 4 } },
];

const ARViewScreen: React.FC<Props> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { itemId } = route.params;
  const [product, setProduct] = useState(MOCK_PRODUCT);
  const [loading, setLoading] = useState(true);
  const [arMode, setArMode] = useState<ARMode>('room');
  const [roomType, setRoomType] = useState('living_room');
  const [referenceObject, setReferenceObject] = useState('smartphone');
  const [arReady, setArReady] = useState(false);
  const [rotationDegree, setRotationDegree] = useState(0);
  const [scale, setScale] = useState(100);
  const [showDimensions, setShowDimensions] = useState(true);
  
  // Simulate fetching product data
  useEffect(() => {
    const fetchProductData = async () => {
      // In a real app, this would be an API call using the itemId
      try {
        // Simulate API request
        await new Promise(resolve => setTimeout(resolve, 1000));
        setProduct(MOCK_PRODUCT);
      } catch (error) {
        console.error('Error fetching product:', error);
        Alert.alert('Error', 'Failed to load product data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProductData();
  }, [itemId]);
  
  // Simulate AR initialization
  useEffect(() => {
    if (!loading) {
      const initAR = async () => {
        try {
          // Simulate initializing AR
          await new Promise(resolve => setTimeout(resolve, 1500));
          setArReady(true);
        } catch (error) {
          console.error('Error initializing AR:', error);
          Alert.alert('AR Error', 'Failed to initialize AR. Please check if your device supports AR.');
        }
      };
      
      initAR();
    }
  }, [loading]);
  
  // Handle rotation
  const handleRotate = (direction: 'left' | 'right') => {
    setRotationDegree(prev => {
      const newRotation = direction === 'left' ? prev - 45 : prev + 45;
      return newRotation % 360;
    });
  };
  
  // Handle scale change
  const handleScale = (newScale: number) => {
    setScale(Math.min(150, Math.max(50, newScale)));
  };
  
  // Get current room name
  const getCurrentRoomName = () => {
    const room = ROOM_TYPES.find(r => r.id === roomType);
    return room ? room.name : 'Living Room';
  };
  
  // Get current reference object name
  const getCurrentReferenceName = () => {
    const reference = REFERENCE_OBJECTS.find(r => r.id === referenceObject);
    return reference ? reference.name : 'Smartphone';
  };
  
  // Format dimensions
  const formatDimensions = (dim: { width: number; height: number; depth: number }) => {
    return `${dim.width} × ${dim.height} × ${dim.depth} cm`;
  };
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    arContainer: {
      flex: 1,
      position: 'relative',
    },
    arPreview: {
      flex: 1,
      backgroundColor: '#f0f0f0',
      justifyContent: 'center',
      alignItems: 'center',
    },
    arPreviewImage: {
      width: 250,
      height: 250,
      resizeMode: 'contain',
      opacity: 0.7,
    },
    productInfoBanner: {
      backgroundColor: colors.card,
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    productName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    productPrice: {
      fontSize: 16,
      color: colors.primary,
      marginTop: 2,
    },
    dimensionsText: {
      fontSize: 14,
      color: colors.text + '80',
      marginTop: 4,
    },
    modeSelectorContainer: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      padding: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modeButton: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 8,
    },
    modeButtonActive: {
      backgroundColor: colors.primary + '20',
    },
    modeButtonText: {
      color: colors.text,
      fontSize: 14,
      marginTop: 4,
    },
    modeButtonTextActive: {
      color: colors.primary,
      fontWeight: 'bold',
    },
    controlsContainer: {
      backgroundColor: colors.card,
      padding: 15,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    controlRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 15,
    },
    controlButton: {
      backgroundColor: colors.primary + '10',
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scaleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 15,
    },
    scaleLabel: {
      color: colors.text,
      width: 50,
    },
    scaleSlider: {
      flex: 1,
      height: 40,
    },
    scaleValue: {
      color: colors.text,
      width: 50,
      textAlign: 'right',
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    optionLabel: {
      color: colors.text,
      flex: 1,
    },
    scrollContainer: {
      maxHeight: 150,
    },
    optionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    optionItemActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '10',
    },
    optionItemText: {
      marginLeft: 10,
      color: colors.text,
    },
    dimensionsOverlay: {
      position: 'absolute',
      top: '35%',
      left: 20,
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: 10,
      borderRadius: 8,
    },
    dimensionsOverlayText: {
      color: 'white',
      fontSize: 14,
    },
    notSupportedContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: colors.background,
    },
    notSupportedTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginTop: 15,
      marginBottom: 10,
      textAlign: 'center',
    },
    notSupportedText: {
      fontSize: 16,
      color: colors.text + '90',
      textAlign: 'center',
      marginBottom: 20,
    },
    instructionsContainer: {
      position: 'absolute',
      top: 15,
      left: 0,
      right: 0,
      alignItems: 'center',
    },
    instructions: {
      backgroundColor: 'rgba(0,0,0,0.7)',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
    },
    instructionsText: {
      color: 'white',
      fontSize: 14,
    },
  });
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 15 }}>Loading product data...</Text>
      </View>
    );
  }
  
  // AR Not Supported View (Only shown in simulator/emulator or unsupported devices)
  if (Platform.OS === 'ios' && ['iPhone Simulator', 'iPad Simulator'].includes(Platform.constants.interfaceIdiom)) {
    return (
      <View style={styles.notSupportedContainer}>
        <Ionicons name="cube-outline" size={80} color={colors.primary} />
        <Text style={styles.notSupportedTitle}>AR Not Available in Simulator</Text>
        <Text style={styles.notSupportedText}>
          AR functionality requires a physical device with ARKit/ARCore support. This preview shows how the AR screen would look.
        </Text>
        
        <View style={{ width: '100%', marginTop: 20 }}>
          <View style={styles.productInfoBanner}>
            <Text style={styles.productName}>{product.title}</Text>
            <Text style={styles.productPrice}>{product.price}</Text>
            <Text style={styles.dimensionsText}>
              Dimensions: {formatDimensions(product.dimensions)}
            </Text>
          </View>
          
          <View style={styles.modeSelectorContainer}>
            {['room', 'size', 'fit'].map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.modeButton,
                  arMode === mode && styles.modeButtonActive,
                ]}
                onPress={() => setArMode(mode as ARMode)}
              >
                <Ionicons
                  name={
                    mode === 'room'
                      ? 'home'
                      : mode === 'size'
                      ? 'resize'
                      : 'scan'
                  }
                  size={20}
                  color={arMode === mode ? colors.primary : colors.text}
                />
                <Text
                  style={[
                    styles.modeButtonText,
                    arMode === mode && styles.modeButtonTextActive,
                  ]}
                >
                  {mode === 'room'
                    ? 'Room View'
                    : mode === 'size'
                    ? 'Size Compare'
                    : 'Space Fit'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {/* Product Info */}
      <View style={styles.productInfoBanner}>
        <Text style={styles.productName}>{product.title}</Text>
        <Text style={styles.productPrice}>{product.price}</Text>
        <Text style={styles.dimensionsText}>
          Dimensions: {formatDimensions(product.dimensions)}
        </Text>
      </View>
      
      {/* Mode Selector */}
      <View style={styles.modeSelectorContainer}>
        {['room', 'size', 'fit'].map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.modeButton,
              arMode === mode && styles.modeButtonActive,
            ]}
            onPress={() => setArMode(mode as ARMode)}
          >
            <Ionicons
              name={
                mode === 'room'
                  ? 'home'
                  : mode === 'size'
                  ? 'resize'
                  : 'scan'
              }
              size={20}
              color={arMode === mode ? colors.primary : colors.text}
            />
            <Text
              style={[
                styles.modeButtonText,
                arMode === mode && styles.modeButtonTextActive,
              ]}
            >
              {mode === 'room'
                ? 'Room View'
                : mode === 'size'
                ? 'Size Compare'
                : 'Space Fit'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* AR Preview */}
      <View style={styles.arContainer}>
        <View style={styles.arPreview}>
          {!arReady ? (
            <View style={{ alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ marginTop: 15, color: colors.text }}>
                Initializing AR...
              </Text>
              <Text style={{ marginTop: 5, color: colors.text + '70', fontSize: 12 }}>
                Point your camera at a flat surface
              </Text>
            </View>
          ) : (
            <>
              <Image
                source={{ uri: product.imageUrl }}
                style={[
                  styles.arPreviewImage,
                  {
                    transform: [
                      { rotate: `${rotationDegree}deg` },
                      { scale: scale / 100 },
                    ],
                  },
                ]}
              />
              <View style={styles.instructionsContainer}>
                <View style={styles.instructions}>
                  <Text style={styles.instructionsText}>
                    {arMode === 'room'
                      ? `Viewing in ${getCurrentRoomName()}`
                      : arMode === 'size'
                      ? `Comparing with ${getCurrentReferenceName()}`
                      : 'Tap to place in your space'}
                  </Text>
                </View>
              </View>
              
              {showDimensions && (
                <View style={styles.dimensionsOverlay}>
                  <Text style={styles.dimensionsOverlayText}>
                    W: {product.dimensions.width} cm
                  </Text>
                  <Text style={styles.dimensionsOverlayText}>
                    H: {product.dimensions.height} cm
                  </Text>
                  <Text style={styles.dimensionsOverlayText}>
                    D: {product.dimensions.depth} cm
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </View>
      
      {/* Controls */}
      <View style={styles.controlsContainer}>
        {/* Rotation Controls */}
        <View style={styles.controlRow}>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => handleRotate('left')}
          >
            <Ionicons name="arrow-undo" size={24} color={colors.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => setShowDimensions(!showDimensions)}
          >
            <Ionicons 
              name={showDimensions ? "contract" : "expand"} 
              size={24} 
              color={colors.primary} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => handleRotate('right')}
          >
            <Ionicons name="arrow-redo" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
        
        {/* Scale Slider */}
        <View style={styles.scaleContainer}>
          <Text style={styles.scaleLabel}>Size</Text>
          <View style={styles.scaleSlider}>
            {/* This would be a real slider component in a full implementation */}
            <View 
              style={{ 
                height: 4, 
                backgroundColor: colors.primary + '30', 
                borderRadius: 2,
                position: 'relative'
              }}
            >
              <View 
                style={{
                  position: 'absolute',
                  left: 0,
                  width: `${(scale - 50) / 100 * 100}%`,
                  height: 4,
                  backgroundColor: colors.primary,
                  borderRadius: 2
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  left: `${(scale - 50) / 100 * 100}%`,
                  top: -8,
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: colors.primary,
                  transform: [{ translateX: -10 }]
                }}
              />
            </View>
          </View>
          <Text style={styles.scaleValue}>{scale}%</Text>
        </View>
        
        {/* Mode specific options */}
        {arMode === 'room' && (
          <ScrollView style={styles.scrollContainer}>
            {ROOM_TYPES.map((room) => (
              <TouchableOpacity
                key={room.id}
                style={[
                  styles.optionItem,
                  roomType === room.id && styles.optionItemActive,
                ]}
                onPress={() => setRoomType(room.id)}
              >
                <Ionicons
                  name={room.icon}
                  size={20}
                  color={roomType === room.id ? colors.primary : colors.text}
                />
                <Text style={styles.optionItemText}>{room.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        
        {arMode === 'size' && (
          <ScrollView style={styles.scrollContainer}>
            {REFERENCE_OBJECTS.map((ref) => (
              <TouchableOpacity
                key={ref.id}
                style={[
                  styles.optionItem,
                  referenceObject === ref.id && styles.optionItemActive,
                ]}
                onPress={() => setReferenceObject(ref.id)}
              >
                <Ionicons
                  name={
                    ref.id === 'credit_card'
                      ? 'card'
                      : ref.id === 'smartphone'
                      ? 'phone-portrait'
                      : ref.id === 'soda_can'
                      ? 'cafe'
                      : ref.id === 'basketball'
                      ? 'basketball'
                      : 'resize'
                  }
                  size={20}
                  color={referenceObject === ref.id ? colors.primary : colors.text}
                />
                <Text style={styles.optionItemText}>
                  {ref.name} ({formatDimensions(ref.dimensions)})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        
        {arMode === 'fit' && (
          <View style={{ paddingVertical: 10 }}>
            <Text style={{ color: colors.text, textAlign: 'center' }}>
              Tap on your floor to place the item and see if it fits in your space.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default ARViewScreen;