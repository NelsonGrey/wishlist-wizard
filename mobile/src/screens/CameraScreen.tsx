import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../contexts/ThemeContext';
import Ionicons from 'react-native-vector-icons/Ionicons';

type RootStackParamList = {
  HomeTabs: undefined;
  Camera: undefined;
};

type CameraScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Camera'>;

type Props = {
  navigation: CameraScreenNavigationProp;
};

// Mock wishlists
const MOCK_WISHLISTS = [
  { id: 1, name: 'Tech Gadgets' },
  { id: 2, name: 'Home Essentials' },
  { id: 3, name: 'Gift Ideas' },
];

const CameraScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [flashMode, setFlashMode] = useState('off');
  const [imageSource, setImageSource] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [productData, setProductData] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [store, setStore] = useState('');
  const [note, setNote] = useState('');
  const [selectedWishlist, setSelectedWishlist] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef(null);
  
  // Request camera permission
  useEffect(() => {
    const requestCameraPermission = async () => {
      try {
        // In a real app, we would use the Camera API to request permissions
        // For simulation, we'll just set it to true after a delay
        setTimeout(() => {
          setCameraPermission(true);
        }, 1000);
      } catch (error) {
        console.error('Failed to request camera permission:', error);
      }
    };
    
    requestCameraPermission();
  }, []);
  
  // Simulate taking a photo
  const takePicture = async () => {
    try {
      setScanning(true);
      
      // Simulate camera capture delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock image capture - in a real app this would use the camera
      const mockImageUrl = 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=500';
      setImageSource(mockImageUrl);
      setPreviewMode(true);
      
      // Simulate product recognition
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock recognized product
      const mockProduct = {
        title: 'Sony WH-1000XM5 Headphones',
        price: '349.99',
        store: 'Amazon',
        imageUrl: mockImageUrl,
      };
      
      setTitle(mockProduct.title);
      setPrice(mockProduct.price);
      setStore(mockProduct.store);
      setProductData(mockProduct);
      setScanning(false);
    } catch (error) {
      console.error('Failed to take picture:', error);
      setScanning(false);
      Alert.alert('Error', 'Failed to capture image');
    }
  };
  
  // Switch to manual entry mode
  const switchToManualEntry = () => {
    setPreviewMode(true);
    setScanning(false);
    setProductData(null);
    setTitle('');
    setPrice('');
    setStore('');
  };
  
  // Add item to wishlist
  const addToWishlist = async () => {
    if (!selectedWishlist) {
      Alert.alert('Error', 'Please select a wishlist');
      return;
    }
    
    if (!title || !price) {
      Alert.alert('Error', 'Title and price are required');
      return;
    }
    
    setLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Success
      Alert.alert(
        'Success',
        'Item added to your wishlist',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('HomeTabs'),
          },
        ]
      );
    } catch (error) {
      console.error('Failed to add item:', error);
      Alert.alert('Error', 'Failed to add item to wishlist');
    } finally {
      setLoading(false);
    }
  };
  
  // Reset camera
  const resetCamera = () => {
    setPreviewMode(false);
    setImageSource(null);
    setProductData(null);
    setTitle('');
    setPrice('');
    setStore('');
    setNote('');
    setSelectedWishlist(null);
    setScanning(false);
  };
  
  // Toggle flash mode
  const toggleFlash = () => {
    setFlashMode(flashMode === 'off' ? 'on' : 'off');
  };
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    cameraContainer: {
      flex: 1,
      position: 'relative',
    },
    cameraMock: {
      flex: 1,
      backgroundColor: '#000',
      justifyContent: 'center',
      alignItems: 'center',
    },
    cameraMockText: {
      color: '#fff',
      fontSize: 16,
      textAlign: 'center',
      padding: 20,
    },
    previewContainer: {
      flex: 1,
    },
    imagePreview: {
      width: '100%',
      height: 250,
      resizeMode: 'cover',
    },
    formContainer: {
      padding: 15,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 5,
    },
    input: {
      backgroundColor: colors.card,
      borderRadius: 8,
      padding: 12,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
    },
    wishlistSelector: {
      marginTop: 10,
      marginBottom: 20,
    },
    wishlistLabel: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 10,
    },
    wishlistOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    wishlistOption: {
      marginRight: 10,
      marginBottom: 10,
      paddingVertical: 8,
      paddingHorizontal: 15,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    wishlistOptionSelected: {
      backgroundColor: colors.primary + '20',
      borderColor: colors.primary,
    },
    wishlistOptionText: {
      color: colors.text,
    },
    wishlistOptionTextSelected: {
      color: colors.primary,
      fontWeight: 'bold',
    },
    actionButton: {
      backgroundColor: colors.primary,
      padding: 15,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 10,
    },
    actionButtonText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
      fontSize: 16,
    },
    cancelButton: {
      padding: 15,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 10,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelButtonText: {
      color: colors.text,
      fontSize: 16,
    },
    cameraControls: {
      position: 'absolute',
      bottom: 30,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
    },
    captureButton: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: '#FFFFFF',
      justifyContent: 'center',
      alignItems: 'center',
    },
    captureButtonInner: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: '#FFFFFF',
      borderWidth: 2,
      borderColor: '#000',
    },
    controlButton: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: 'rgba(0,0,0,0.3)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    scanningOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    scanningText: {
      color: '#FFFFFF',
      marginTop: 20,
      fontSize: 16,
    },
    recognizedDataContainer: {
      backgroundColor: colors.card,
      padding: 15,
      borderRadius: 8,
      marginTop: 15,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: colors.border,
    },
    recognizedTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 10,
    },
    recognizedItem: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    recognizedLabel: {
      width: 80,
      fontSize: 14,
      color: colors.text + '80',
    },
    recognizedValue: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
      fontWeight: 'bold',
    },
    manualEntryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 10,
      borderRadius: 8,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 10,
    },
    manualEntryText: {
      color: colors.text,
      marginLeft: 8,
    },
    permissionContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    permissionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginTop: 15,
      marginBottom: 10,
      textAlign: 'center',
    },
    permissionText: {
      fontSize: 16,
      color: colors.text + '90',
      textAlign: 'center',
      marginBottom: 20,
    },
  });
  
  if (cameraPermission === null) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 15 }}>Requesting camera permission...</Text>
      </View>
    );
  }
  
  if (cameraPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-off-outline" size={80} color={colors.text + '80'} />
        <Text style={styles.permissionTitle}>Camera Permission Required</Text>
        <Text style={styles.permissionText}>
          We need camera access to scan product details. Please enable camera permissions in your device settings.
        </Text>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.actionButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  if (!previewMode) {
    return (
      <View style={styles.container}>
        {/* Camera Preview Mock */}
        <View style={styles.cameraContainer}>
          <View style={styles.cameraMock}>
            <Text style={styles.cameraMockText}>
              Camera Preview
              {'\n\n'}
              (This is a simulation - in a real app this would show the device camera)
            </Text>
            
            {scanning && (
              <View style={styles.scanningOverlay}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.scanningText}>Scanning product...</Text>
              </View>
            )}
          </View>
          
          {/* Camera Controls */}
          <View style={styles.cameraControls}>
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={toggleFlash}
            >
              <Ionicons 
                name={flashMode === 'on' ? 'flash' : 'flash-off'} 
                size={24} 
                color="#FFFFFF" 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.captureButton}
              onPress={takePicture}
              disabled={scanning}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={switchToManualEntry}
            >
              <Ionicons name="create-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Image Preview */}
        {imageSource && (
          <Image source={{ uri: imageSource }} style={styles.imagePreview} />
        )}
        
        {/* Product Data Form */}
        <View style={styles.formContainer}>
          {/* Recognized Data Block */}
          {productData && (
            <View style={styles.recognizedDataContainer}>
              <Text style={styles.recognizedTitle}>Product Recognized</Text>
              <View style={styles.recognizedItem}>
                <Text style={styles.recognizedLabel}>Title:</Text>
                <Text style={styles.recognizedValue}>{productData.title}</Text>
              </View>
              <View style={styles.recognizedItem}>
                <Text style={styles.recognizedLabel}>Price:</Text>
                <Text style={styles.recognizedValue}>${productData.price}</Text>
              </View>
              <View style={styles.recognizedItem}>
                <Text style={styles.recognizedLabel}>Store:</Text>
                <Text style={styles.recognizedValue}>{productData.store}</Text>
              </View>
              
              <TouchableOpacity 
                style={styles.manualEntryButton}
                onPress={() => setProductData(null)}
              >
                <Ionicons name="create-outline" size={20} color={colors.text} />
                <Text style={styles.manualEntryText}>Edit details manually</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Manual Entry Form */}
          {!productData && (
            <>
              <Text style={styles.inputLabel}>Product Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter product title"
                placeholderTextColor={colors.text + '50'}
                value={title}
                onChangeText={setTitle}
              />
              
              <Text style={styles.inputLabel}>Price</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter price"
                placeholderTextColor={colors.text + '50'}
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
              />
              
              <Text style={styles.inputLabel}>Store</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter store name"
                placeholderTextColor={colors.text + '50'}
                value={store}
                onChangeText={setStore}
              />
            </>
          )}
          
          <Text style={styles.inputLabel}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            placeholder="Add notes about this item"
            placeholderTextColor={colors.text + '50'}
            value={note}
            onChangeText={setNote}
            multiline
          />
          
          {/* Wishlist Selector */}
          <View style={styles.wishlistSelector}>
            <Text style={styles.wishlistLabel}>Select Wishlist</Text>
            <View style={styles.wishlistOptions}>
              {MOCK_WISHLISTS.map((wishlist) => (
                <TouchableOpacity
                  key={wishlist.id}
                  style={[
                    styles.wishlistOption,
                    selectedWishlist === wishlist.id && styles.wishlistOptionSelected,
                  ]}
                  onPress={() => setSelectedWishlist(wishlist.id)}
                >
                  <Text
                    style={[
                      styles.wishlistOptionText,
                      selectedWishlist === wishlist.id && styles.wishlistOptionTextSelected,
                    ]}
                  >
                    {wishlist.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Action Buttons */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={addToWishlist}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.actionButtonText}>Add to Wishlist</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={resetCamera}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default CameraScreen;