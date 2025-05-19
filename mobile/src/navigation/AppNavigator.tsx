import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import WishlistsScreen from '../screens/WishlistsScreen';
import WishlistDetailScreen from '../screens/WishlistDetailScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CameraScreen from '../screens/CameraScreen';
import ARViewScreen from '../screens/ARViewScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Import icons
import Ionicons from 'react-native-vector-icons/Ionicons';

// Define the authentication stack param list
type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

// Define the main stack param list
type MainStackParamList = {
  HomeTabs: undefined;
  WishlistDetail: { id: number; name: string };
  Camera: undefined;
  ARView: { itemId: number };
  Settings: undefined;
};

// Define the tab param list
type TabParamList = {
  Home: undefined;
  Wishlists: undefined;
  Notifications: undefined;
  Profile: undefined;
};

// Create the navigators
const AuthStack = createStackNavigator<AuthStackParamList>();
const MainStack = createStackNavigator<MainStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Authentication Stack Navigator
const AuthNavigator = () => {
  const { colors } = useTheme();

  return (
    <AuthStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
};

// Tab Navigator
const HomeTabs = () => {
  const { colors, isDark } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Wishlists') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Notifications') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: '#fff',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Wishlists" component={WishlistsScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

// Main Navigator
const MainNavigator = () => {
  const { colors } = useTheme();

  return (
    <MainStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <MainStack.Screen 
        name="HomeTabs" 
        component={HomeTabs} 
        options={{ headerShown: false }}
      />
      <MainStack.Screen 
        name="WishlistDetail" 
        component={WishlistDetailScreen} 
        options={({ route }) => ({ 
          title: route.params?.name || 'Wishlist'
        })}
      />
      <MainStack.Screen 
        name="Camera" 
        component={CameraScreen} 
        options={{ 
          title: 'Add Item'
        }}
      />
      <MainStack.Screen 
        name="ARView" 
        component={ARViewScreen} 
        options={{ 
          title: 'AR Visualization'
        }}
      />
      <MainStack.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ 
          title: 'Settings'
        }}
      />
    </MainStack.Navigator>
  );
};

// App Navigator
const AppNavigator = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    // We could return a splash screen or loading indicator here
    return null;
  }

  return user ? <MainNavigator /> : <AuthNavigator />;
};

export default AppNavigator;