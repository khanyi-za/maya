import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useFilter } from '@/contexts/FilterContext';

interface FeedTabsProps {
  onTabChange?: (tab: 'men' | 'women' | 'home-lifestyle') => void;
}

export function FeedTabs({ onTabChange }: FeedTabsProps) {
  const { activePrimaryFilter, setActivePrimaryFilter } = useFilter();

  const handleTabPress = (tab: 'men' | 'women' | 'home-lifestyle') => {
    setActivePrimaryFilter(tab);
    onTabChange?.(tab);
  };

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity 
        style={styles.tab}
        onPress={() => handleTabPress('women')}
      >
        <ThemedText style={[
          styles.tabText, 
          activePrimaryFilter === 'women' && styles.activeTabText
        ]}>
          Women
        </ThemedText>
        {activePrimaryFilter === 'women' && <View style={styles.activeIndicator} />}
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.tab}
        onPress={() => handleTabPress('men')}
      >
        <ThemedText style={[
          styles.tabText, 
          activePrimaryFilter === 'men' && styles.activeTabText
        ]}>
          Men
        </ThemedText>
        {activePrimaryFilter === 'men' && <View style={styles.activeIndicator} />}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.tab}
        onPress={() => handleTabPress('home-lifestyle')}
      >
        <ThemedText style={[
          styles.tabText, 
          activePrimaryFilter === 'home-lifestyle' && styles.activeTabText
        ]}>
          Home & Lifestyle
        </ThemedText>
        {activePrimaryFilter === 'home-lifestyle' && <View style={styles.activeIndicator} />}
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 9,
    backgroundColor: '#fff',
    gap: 30,
    justifyContent: 'center',
  },
  tab: {
    alignItems: 'center',
    paddingBottom: 5,
  },
  tabText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#333',
    fontWeight: '600',
  },
  activeIndicator: {
    width: '100%',
    height: 2,
    backgroundColor: '#333',
    marginTop: 8,
    borderRadius: 1,
  },
});