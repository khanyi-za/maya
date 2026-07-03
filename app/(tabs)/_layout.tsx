import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { useCart } from '@/hooks/useCartQueries';
import { useThemeColors } from '@/lib/theme';

// YIIVA redesign — token-driven tab bar. Ink (foreground) active tint per the
// "primary stays ink, brand is for accents" rule (owner call 2026-07-02: no
// blue active tab); muted inactive, filled-on-focus icons, cart-count badge.
export default function TabLayout() {
  const colors = useThemeColors();
  // Badge counts the SERVER cart — every cart mutation writes the full cart
  // back into the ['cart'] cache, so this stays live without extra fetches.
  const cartCount = useCart().data?.cart.itemCount ?? 0;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.foreground,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Transparent on iOS to show the blur; token border.
            position: 'absolute',
            borderTopColor: colors.border,
          },
          default: {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
          },
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={28} name={focused ? 'house.fill' : 'house'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={28} name={focused ? 'bag.fill' : 'bag'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null, // Hidden from tab bar
          title: 'Explore',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="safari" color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="magnifyingglass" color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.brand,
            color: colors.brandForeground,
            fontSize: 10,
          },
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={28} name={focused ? 'cart.fill' : 'cart'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          title: 'Wishlist',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={28} name={focused ? 'bookmark.fill' : 'bookmark'} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
