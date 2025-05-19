import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Share,
  Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Define the navigation props
type RootStackParamList = {
  WishlistDetail: { id: number; name: string };
  ARView: { itemId: number };
};

type WishlistDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'WishlistDetail'>;
type WishlistDetailScreenRouteProp = RouteProp<RootStackParamList, 'WishlistDetail'>;

type Props = {
  navigation: WishlistDetailScreenNavigationProp;
  route: WishlistDetailScreenRouteProp;
};

// Mock wishlist items
const MOCK_ITEMS = [
  {
    id: 1,
    title: 'Sony WH-1000XM5 Headphones',
    price: '$349.99',
    imageUrl: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8aGVhZHBob25lc3xlbnwwfHwwfHx8MA%3D%3D',
    store: 'Amazon',
    reserved: false,
    purchased: false,
    priceHistory: [
      { date: '2023-01-05', price: 399.99 },
      { date: '2023-02-15', price: 379.99 },
      { date: '2023-03-10', price: 349.99 },
    ],
    note: 'Black color preferred',
    hasARModel: true,
  },
  {
    id: 2,
    title: 'Samsung 55" QLED 4K Smart TV',
    price: '$799.99',
    imageUrl: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8dGVsZXZpc2lvbnxlbnwwfHwwfHx8MA%3D%3D',
    store: 'Best Buy',
    reserved: true,
    purchased: false,
    reservedBy: 'Alex',
    priceHistory: [
      { date: '2023-01-02', price: 999.99 },
      { date: '2023-02-10', price: 899.99 },
      { date: '2023-03-05', price: 799.99 },
    ],
    note: 'For living room',
    hasARModel: true,
  },
  {
    id: 3,
    title: 'Dyson V12 Detect Slim Vacuum',
    price: '$549.99',
    imageUrl: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8dmFjdXVtfGVufDB8fDB8fHww',
    store: 'Dyson',
    reserved: false,
    purchased: true,
    purchasedBy: 'Maria',
    purchasedDate: '2023-04-12',
    priceHistory: [
      { date: '2023-01-10', price: 649.99 },
      { date: '2023-02-20', price: 599.99 },
      { date: '2023-03-15', price: 549.99 },
    ],
    note: 'Cordless with good battery life',
    hasARModel: true,
  },
  {
    id: 4,
    title: 'Apple iPad Pro 12.9"',
    price: '$1,099.99',
    imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8aXBhZHxlbnwwfHwwfHx8MA%3D%3D',
    store: 'Apple',
    reserved: false,
    purchased: false,
    priceHistory: [
      { date: '2023-01-15', price: 1199.99 },
      { date: '2023-02-25', price: 1149.99 },
      { date: '2023-03-20', price: 1099.99 },
    ],
    note: '256GB storage minimum',
    hasARModel: false,
  },
];

const WishlistDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { id, name } = route.params;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'name'>('date');
  const [filterBy, setFilterBy] = useState<'all' | 'available' | 'reserved' | 'purchased'>('all');
  
  useEffect(() => {
    // Update the navigation title with the wishlist name
    navigation.setOptions({
      title: name,
      headerRight: () => (
        <TouchableOpacity 
          style={{ marginRight: 15 }} 
          onPress={handleShareWishlist}
        >
          <Ionicons name="share-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      ),
    });
    
    loadItems();
  }, [id, name]);
  
  // Simulating API call to load items
  const loadItems = async () => {
    try {
      setLoading(true);
      // Simulating network request
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      let filteredItems = [...MOCK_ITEMS];
      
      // Apply filter
      if (filterBy === 'available') {
        filteredItems = filteredItems.filter(item => !item.reserved && !item.purchased);
      } else if (filterBy === 'reserved') {
        filteredItems = filteredItems.filter(item => item.reserved && !item.purchased);
      } else if (filterBy === 'purchased') {
        filteredItems = filteredItems.filter(item => item.purchased);
      }
      
      // Apply sorting
      if (sortBy === 'price') {
        filteredItems.sort((a, b) => 
          parseFloat(a.price.replace('$', '').replace(',', '')) -
          parseFloat(b.price.replace('$', '').replace(',', ''))
        );
      } else if (sortBy === 'name') {
        filteredItems.sort((a, b) => a.title.localeCompare(b.title));
      } else {
        // Default: sort by date (newest first)
        // In a real app, this would sort by item creation date
        filteredItems.sort((a, b) => b.id - a.id);
      }
      
      setItems(filteredItems);
    } catch (error) {
      console.error('Error loading items:', error);
      Alert.alert('Error', 'Failed to load wishlist items');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    loadItems();
  };
  
  const handleShareWishlist = async () => {
    try {
      await Share.share({
        message: `Check out my WishKeeper wishlist: ${name}`,
        url: `https://wishkeeper.com/shared/wishlist/${id}`,
        title: `WishKeeper - ${name}`,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share wishlist');
    }
  };
  
  const handleReserveItem = (itemId: number) => {
    Alert.alert(
      'Reserve Item',
      'Are you sure you want to reserve this item?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reserve',
          onPress: () => {
            // In a real app, this would make an API call
            setItems(items.map(item => 
              item.id === itemId 
                ? { ...item, reserved: true, reservedBy: 'You' } 
                : item
            ));
          },
        },
      ]
    );
  };
  
  const handleViewAR = (itemId: number) => {
    navigation.navigate('ARView', { itemId });
  };
  
  const renderGridItem = ({ item }) => {
    const isPriceDropped = item.priceHistory && 
      item.priceHistory.length > 1 && 
      parseFloat(item.price.replace('$', '').replace(',', '')) < 
      item.priceHistory[item.priceHistory.length - 2].price;
    
    return (
      <TouchableOpacity 
        style={[
          styles.gridItem, 
          { backgroundColor: colors.card, borderColor: colors.border }
        ]}
        onPress={() => Alert.alert('Item Details', item.title)}
      >
        <View style={styles.itemImageContainer}>
          <Image source={{ uri: item.imageUrl }} style={styles.gridItemImage} />
          {isPriceDropped && (
            <View style={[styles.priceBadge, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="arrow-down" size={12} color={colors.primary} />
              <Text style={[styles.priceBadgeText, { color: colors.primary }]}>Price Drop</Text>
            </View>
          )}
          {item.purchased && (
            <View style={[styles.statusBadge, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="checkmark-circle" size={12} color={colors.success} />
              <Text style={[styles.statusBadgeText, { color: colors.success }]}>Purchased</Text>
            </View>
          )}
          {item.reserved && !item.purchased && (
            <View style={[styles.statusBadge, { backgroundColor: colors.warning + '20' }]}>
              <Ionicons name="time" size={12} color={colors.warning} />
              <Text style={[styles.statusBadgeText, { color: colors.warning }]}>Reserved</Text>
            </View>
          )}
        </View>
        
        <View style={styles.gridItemContent}>
          <Text style={[styles.gridItemTitle, { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[styles.gridItemStore, { color: colors.text + '80' }]}>
            {item.store}
          </Text>
          <Text style={[styles.gridItemPrice, { color: colors.primary }]}>
            {item.price}
          </Text>
          
          <View style={styles.gridItemActions}>
            {!item.purchased && !item.reserved && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary + '10' }]}
                onPress={() => handleReserveItem(item.id)}
              >
                <Ionicons name="bookmark-outline" size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
            
            {item.hasARModel && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.secondary + '10' }]}
                onPress={() => handleViewAR(item.id)}
              >
                <Ionicons name="cube-outline" size={16} color={colors.secondary} />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.info + '10' }]}
              onPress={() => Alert.alert('Price History', 'Price history would be shown here')}
            >
              <Ionicons name="trending-down-outline" size={16} color={colors.info} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  
  const renderListItem = ({ item }) => {
    const isPriceDropped = item.priceHistory && 
      item.priceHistory.length > 1 && 
      parseFloat(item.price.replace('$', '').replace(',', '')) < 
      item.priceHistory[item.priceHistory.length - 2].price;
    
    return (
      <TouchableOpacity 
        style={[
          styles.listItem, 
          { backgroundColor: colors.card, borderColor: colors.border }
        ]}
        onPress={() => Alert.alert('Item Details', item.title)}
      >
        <Image source={{ uri: item.imageUrl }} style={styles.listItemImage} />
        
        <View style={styles.listItemContent}>
          <Text style={[styles.listItemTitle, { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[styles.listItemStore, { color: colors.text + '80' }]}>
            {item.store}
          </Text>
          
          <View style={styles.listItemFooter}>
            <Text style={[styles.listItemPrice, { color: colors.primary }]}>
              {item.price}
            </Text>
            
            <View style={styles.listItemActions}>
              {!item.purchased && !item.reserved && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.primary + '10' }]}
                  onPress={() => handleReserveItem(item.id)}
                >
                  <Ionicons name="bookmark-outline" size={16} color={colors.primary} />
                </TouchableOpacity>
              )}
              
              {item.hasARModel && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.secondary + '10' }]}
                  onPress={() => handleViewAR(item.id)}
                >
                  <Ionicons name="cube-outline" size={16} color={colors.secondary} />
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.info + '10' }]}
                onPress={() => Alert.alert('Price History', 'Price history would be shown here')}
              >
                <Ionicons name="trending-down-outline" size={16} color={colors.info} />
              </TouchableOpacity>
            </View>
          </View>
          
          {isPriceDropped && (
            <View style={[styles.listPriceBadge, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="arrow-down" size={12} color={colors.primary} />
              <Text style={[styles.priceBadgeText, { color: colors.primary }]}>Price Drop</Text>
            </View>
          )}
          
          {item.purchased && (
            <View style={[styles.listStatusBadge, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="checkmark-circle" size={12} color={colors.success} />
              <Text style={[styles.statusBadgeText, { color: colors.success }]}>Purchased</Text>
            </View>
          )}
          
          {item.reserved && !item.purchased && (
            <View style={[styles.listStatusBadge, { backgroundColor: colors.warning + '20' }]}>
              <Ionicons name="time" size={12} color={colors.warning} />
              <Text style={[styles.statusBadgeText, { color: colors.warning }]}>Reserved</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
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
    filtersContainer: {
      flexDirection: 'row',
      padding: 15,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    filterButton: {
      marginRight: 12,
      padding: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
    },
    filterButtonActive: {
      backgroundColor: colors.primary + '20',
      borderColor: colors.primary,
    },
    filterButtonText: {
      color: colors.text,
      fontSize: 14,
      marginLeft: 5,
    },
    filterButtonTextActive: {
      color: colors.primary,
      fontWeight: 'bold',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    emptyText: {
      fontSize: 16,
      color: colors.text + '80',
      textAlign: 'center',
      marginTop: 10,
    },
    gridContainer: {
      padding: 8,
    },
    gridItem: {
      width: '48%',
      marginHorizontal: '1%',
      marginBottom: 15,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    itemImageContainer: {
      position: 'relative',
    },
    gridItemImage: {
      width: '100%',
      height: 150,
      resizeMode: 'cover',
    },
    priceBadge: {
      position: 'absolute',
      top: 10,
      left: 10,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 12,
    },
    priceBadgeText: {
      fontSize: 10,
      fontWeight: 'bold',
      marginLeft: 3,
    },
    statusBadge: {
      position: 'absolute',
      top: 10,
      right: 10,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 12,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: 'bold',
      marginLeft: 3,
    },
    listPriceBadge: {
      position: 'absolute',
      top: 10,
      right: 10,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 12,
    },
    listStatusBadge: {
      position: 'absolute',
      top: 35,
      right: 10,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 12,
    },
    gridItemContent: {
      padding: 10,
    },
    gridItemTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    gridItemStore: {
      fontSize: 12,
      marginBottom: 4,
    },
    gridItemPrice: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    gridItemActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    actionButton: {
      width: 35,
      height: 35,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    listItem: {
      flexDirection: 'row',
      marginHorizontal: 15,
      marginBottom: 15,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    listItemImage: {
      width: 100,
      height: 100,
      resizeMode: 'cover',
    },
    listItemContent: {
      flex: 1,
      padding: 10,
      position: 'relative',
    },
    listItemTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    listItemStore: {
      fontSize: 12,
      marginBottom: 4,
    },
    listItemFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 4,
    },
    listItemPrice: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    listItemActions: {
      flexDirection: 'row',
    },
    floatingButton: {
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
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      elevation: 5,
    },
    floatingButtonText: {
      color: '#FFFFFF',
      fontSize: 24,
    },
    viewModeButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 20,
    },
  });
  
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 15 }}>Loading wishlist items...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {/* Filters */}
      <View style={styles.filtersContainer}>
        {/* View Mode Toggle */}
        <TouchableOpacity
          style={[
            styles.viewModeButton,
            { backgroundColor: colors.card }
          ]}
          onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
        >
          <Ionicons
            name={viewMode === 'grid' ? 'list' : 'grid'}
            size={22}
            color={colors.primary}
          />
        </TouchableOpacity>
        
        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterBy === 'all' && styles.filterButtonActive
            ]}
            onPress={() => {
              setFilterBy('all');
              loadItems();
            }}
          >
            <Ionicons
              name="apps"
              size={18}
              color={filterBy === 'all' ? colors.primary : colors.text}
            />
            <Text
              style={[
                styles.filterButtonText,
                filterBy === 'all' && styles.filterButtonTextActive
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterBy === 'available' && styles.filterButtonActive
            ]}
            onPress={() => {
              setFilterBy('available');
              loadItems();
            }}
          >
            <Ionicons
              name="pricetag"
              size={18}
              color={filterBy === 'available' ? colors.primary : colors.text}
            />
            <Text
              style={[
                styles.filterButtonText,
                filterBy === 'available' && styles.filterButtonTextActive
              ]}
            >
              Available
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterBy === 'reserved' && styles.filterButtonActive
            ]}
            onPress={() => {
              setFilterBy('reserved');
              loadItems();
            }}
          >
            <Ionicons
              name="bookmark"
              size={18}
              color={filterBy === 'reserved' ? colors.primary : colors.text}
            />
            <Text
              style={[
                styles.filterButtonText,
                filterBy === 'reserved' && styles.filterButtonTextActive
              ]}
            >
              Reserved
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterBy === 'purchased' && styles.filterButtonActive
            ]}
            onPress={() => {
              setFilterBy('purchased');
              loadItems();
            }}
          >
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={filterBy === 'purchased' ? colors.primary : colors.text}
            />
            <Text
              style={[
                styles.filterButtonText,
                filterBy === 'purchased' && styles.filterButtonTextActive
              ]}
            >
              Purchased
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              sortBy === 'price' && styles.filterButtonActive
            ]}
            onPress={() => {
              setSortBy('price');
              loadItems();
            }}
          >
            <Ionicons
              name="cash"
              size={18}
              color={sortBy === 'price' ? colors.primary : colors.text}
            />
            <Text
              style={[
                styles.filterButtonText,
                sortBy === 'price' && styles.filterButtonTextActive
              ]}
            >
              Price
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              sortBy === 'name' && styles.filterButtonActive
            ]}
            onPress={() => {
              setSortBy('name');
              loadItems();
            }}
          >
            <Ionicons
              name="text"
              size={18}
              color={sortBy === 'name' ? colors.primary : colors.text}
            />
            <Text
              style={[
                styles.filterButtonText,
                sortBy === 'name' && styles.filterButtonTextActive
              ]}
            >
              Name
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      
      {/* Item List */}
      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="basket-outline" size={60} color={colors.text + '40'} />
          <Text style={styles.emptyText}>No items found. Add some items to your wishlist!</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={viewMode === 'grid' ? renderGridItem : renderListItem}
          keyExtractor={(item) => item.id.toString()}
          numColumns={viewMode === 'grid' ? 2 : 1}
          key={viewMode} // Force remount on view mode change
          contentContainerStyle={viewMode === 'grid' ? styles.gridContainer : null}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        />
      )}
      
      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => Alert.alert('Add Item', 'This would open the add item screen')}
      >
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

export default WishlistDetailScreen;