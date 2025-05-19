import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ColorSchemeName, useColorScheme } from 'react-native';

// Define theme options
type ThemeType = 'light' | 'dark' | 'system';

// Define the colors for each theme
type ThemeColors = {
  background: string;
  card: string;
  text: string;
  border: string;
  primary: string;
  secondary: string;
  accent: string;
  error: string;
  success: string;
  warning: string;
  info: string;
};

// Define the theme context type
type ThemeContextType = {
  theme: ThemeType;
  colors: ThemeColors;
  setTheme: (theme: ThemeType) => void;
  isDark: boolean;
};

// Define light theme colors
const lightColors: ThemeColors = {
  background: '#FFFFFF',
  card: '#F5F5F5',
  text: '#212121',
  border: '#E0E0E0',
  primary: '#6366F1',
  secondary: '#818CF8',
  accent: '#C4B5FD',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
};

// Define dark theme colors
const darkColors: ThemeColors = {
  background: '#121212',
  card: '#1E1E1E',
  text: '#F5F5F5',
  border: '#2C2C2C',
  primary: '#818CF8',
  secondary: '#A5B4FC',
  accent: '#DDD6FE',
  error: '#F87171',
  success: '#34D399',
  warning: '#FBBF24',
  info: '#60A5FA',
};

// Create the theme context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme Provider Component
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemTheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeType>('system');
  
  // Effect to load saved theme preference
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('@theme');
        if (savedTheme) {
          setThemeState(savedTheme as ThemeType);
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      }
    };
    
    loadTheme();
  }, []);
  
  // Function to set theme and save preference
  const setTheme = async (newTheme: ThemeType) => {
    setThemeState(newTheme);
    try {
      await AsyncStorage.setItem('@theme', newTheme);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };
  
  // Determine if we're using dark mode
  const isDark = 
    theme === 'dark' || (theme === 'system' && systemTheme === 'dark');
    
  // Get the appropriate colors based on theme
  const colors = isDark ? darkColors : lightColors;
  
  return (
    <ThemeContext.Provider value={{ theme, colors, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook for using the theme context
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};