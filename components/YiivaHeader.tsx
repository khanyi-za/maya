import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { IconSymbol } from './ui/IconSymbol';

interface YiivaHeaderProps {
  onMenuPress: () => void;
  onCartPress: () => void;
  onNotificationsPress: () => void;
  /** Unread notification count; renders a badge on the bell when > 0. */
  unreadCount?: number;
}

export function YiivaHeader({
  onMenuPress,
  onCartPress,
  onNotificationsPress,
  unreadCount = 0,
}: YiivaHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
        <View style={styles.menuIcon}>
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
        </View>
      </TouchableOpacity>
      
      <Image 
        source={require('@/assets/images/ICON_BLACK.png')} 
        style={styles.logo} 
        resizeMode="contain"
      />
      
      <View style={styles.rightActions}>
        <TouchableOpacity onPress={onNotificationsPress} style={styles.notificationsButton}>
          <IconSymbol size={24} name="bell" color="#333" />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <ThemedText style={styles.badgeText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </ThemedText>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={onCartPress} style={styles.cartButton}>
          <IconSymbol size={24} name="cart" color="#333" />
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
    backgroundColor: '#fff',
  },
  menuButton: {
    padding: 8,
  },
  menuIcon: {
    gap: 3,
  },
  menuLine: {
    width: 20,
    height: 2,
    backgroundColor: '#333',
    borderRadius: 1,
  },
  logo: {
    height: 32,
    width: 120,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationsButton: {
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#e53935',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
  },
  cartButton: {
    padding: 8,
  },
});