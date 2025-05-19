import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Types for navigation
type RootStackParamList = {
  WishlistDetail: { id: number; name: string };
  Camera: undefined;
  ARView: { itemId: number };
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

// Mock data for recent items
const RECENT_ITEMS = [
  {
    id: 1,
    title: 'Sony WH-1000XM5 Headphones',
    price: '$349.99',
    imageUrl: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8aGVhZHBob25lc3xlbnwwfHwwfHx8MA%3D%3D',
    store: 'Amazon',
    wishlistId: 1,
    wishlistName: 'Tech Gadgets',
    priceDropAmount: 50.00,
    previousPrice: '$399.99',
  },
  {
    id: 2,
    title: 'Samsung 55" QLED 4K Smart TV',
    price: '$799.99',
    imageUrl: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8dGVsZXZpc2lvbnxlbnwwfHwwfHx8MA%3D%3D',
    store: 'Best Buy',
    wishlistId: 1,
    wishlistName: 'Tech Gadgets',
    priceDropAmount: 200.00,
    previousPrice: '$999.99',
  },
  {
    id: 3,
    title: 'Dyson V12 Detect Slim Vacuum',
    price: '$549.99',
    imageUrl: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8dmFjdXVtfGVufDB8fDB8fHww',
    store: 'Dyson',
    wishlistId: 2,
    wishlistName: 'Home Essentials',
    priceDropAmount: 100.00,
    previousPrice: '$649.99',
  },
];

// Mock data for wishlists
const WISHLISTS = [
  {
    id: 1,
    name: 'Tech Gadgets',
    itemCount: 12,
    coverImage: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8ZWxlY3Ryb25pY3N8ZW58MHx8MHx8fDA%3D',
  },
  {
    id: 2,
    name: 'Home Essentials',
    itemCount: 8,
    coverImage: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8aG9tZXxlbnwwfHwwfHx8MA%3D%3D',
  },
  {
    id: 3,
    name: 'Gift Ideas',
    itemCount: 15,
    coverImage: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTZ8fGdpZnR8ZW58MHx8MHx8fDA%3D',
  },
];

const HomeScreen: React.FC = () => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(RECENT_ITEMS);
  const [wishlists, setWishlists] = useState(WISHLISTS);

  useEffect(() => {
    // In a real app, we would fetch data from API here
    const loadData = async () => {
      try {
        // Simulating API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Set data
        setPriceAlerts(RECENT_ITEMS);
        setWishlists(WISHLISTS);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulating refresh
    await new Promise(resolve => setTimeout(resolve, 1500));
    setRefreshing(false);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContainer: {
      padding: 16,
    },
    greeting: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 5,
    },
    subGreeting: {
      fontSize: 16,
      color: colors.text + '80',
      marginBottom: 25,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 15,
      marginTop: 10,
    },
    cardContainer: {
      backgroundColor: colors.card,
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
      marginBottom: 15,
      overflow: 'hidden',
    },
    alertCard: {
      flexDirection: 'row',
      padding: 15,
    },
    itemImage: {
      width: 80,
      height: 80,
      borderRadius: 8,
    },
    itemInfo: {
      flex: 1,
      marginLeft: 15,
      justifyContent: 'space-between',
    },
    itemTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    wishlistName: {
      fontSize: 14,
      color: colors.text + '80',
    },
    itemStore: {
      fontSize: 13,
      color: colors.text + '60',
      marginBottom: 5,
    },
    priceContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    currentPrice: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.primary,
    },
    oldPrice: {
      fontSize: 14,
      color: colors.text + '60',
      textDecorationLine: 'line-through',
      marginLeft: 8,
    },
    priceDropBadge: {
      position: 'absolute',
      top: 12,
      right: 12,
      backgroundColor: colors.primary + '20',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
      flexDirection: 'row',
      alignItems: 'center',
    },
    priceDropText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: colors.primary,
      marginLeft: 3,
    },
    wishlistsContainer: {
      marginTop: 10,
    },
    wishlistCard: {
      width: 160,
      marginRight: 15,
      backgroundColor: colors.card,
      borderRadius: 12,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    wishlistCover: {
      width: '100%',
      height: 100,
    },
    wishlistInfo: {
      padding: 12,
    },
    wishlistTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
    },
    wishlistItemCount: {
      fontSize: 14,
      color: colors.text + '80',
      marginTop: 2,
    },
    quickAdd: {
      position: 'absolute',
      bottom: 20,
      right: 20,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      elevation: 5,
    },
    emptyContainer: {
      padding: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      fontSize: 16,
      color: colors.text + '80',
      textAlign: 'center',
      marginTop: 10,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 10 }}>Loading your wishlists...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        contentContainerStyle={styles.scrollContainer}
      >
        <Text style={styles.greeting}>Hello, {user?.username || 'there'}!</Text>
        <Text style={styles.subGreeting}>Track your wishlists and price drops</Text>

        {/* Price Alerts Section */}
        <Text style={styles.sectionTitle}>Recent Price Drops</Text>
        {priceAlerts.length > 0 ? (
          priceAlerts.map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.cardContainer}
              onPress={() => navigation.navigate('WishlistDetail', { id: item.wishlistId, name: item.wishlistName })}
            >
              <View style={styles.alertCard}>
                <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                <View style={styles.itemInfo}>
                  <View>
                    <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.wishlistName}>{item.wishlistName}</Text>
                    <Text style={styles.itemStore}>{item.store}</Text>
                  </View>
                  <View style={styles.priceContainer}>
                    <Text style={styles.currentPrice}>{item.price}</Text>
                    <Text style={styles.oldPrice}>{item.previousPrice}</Text>
                  </View>
                </View>
                <View style={styles.priceDropBadge}>
                  <Ionicons name="arrow-down" size={12} color={colors.primary} />
                  <Text style={styles.priceDropText}>${item.priceDropAmount}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="trending-down" size={40} color={colors.text + '40'} />
            <Text style={styles.emptyText}>No price drops detected yet. We'll notify you when prices change.</Text>
          </View>
        )}

        {/* Wishlists Section */}
        <Text style={styles.sectionTitle}>Your Wishlists</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.wishlistsContainer}
        >
          {wishlists.map(list => (
            <TouchableOpacity
              key={list.id}
              style={styles.wishlistCard}
              onPress={() => navigation.navigate('WishlistDetail', { id: list.id, name: list.name })}
            >
              <Image source={{ uri: list.coverImage }} style={styles.wishlistCover} />
              <View style={styles.wishlistInfo}>
                <Text style={styles.wishlistTitle}>{list.name}</Text>
                <Text style={styles.wishlistItemCount}>{list.itemCount} items</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>

      {/* Quick Add Button */}
      <TouchableOpacity
        style={styles.quickAdd}
        onPress={() => navigation.navigate('Camera')}
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

export default HomeScreen;