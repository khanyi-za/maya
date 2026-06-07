import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { YiivaHeader } from '@/components/YiivaHeader';
import { SideMenu } from '@/components/SideMenu';
import { FeedTabs } from '@/components/FeedTabs';
import { useFilter } from '@/contexts/FilterContext';
import React, { useState } from 'react';
import { StyleSheet, View, StatusBar, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';

interface Category {
  id: string;
  name: string;
  image: any;
}

interface Brand {
  id: string;
  name: string;
  logo: any;
}

const womenCategories: Category[] = [
  { id: '1', name: 'SHOES', image: require('../../assets/design_screenshots/women_categories/shoes.png') },
  { id: '2', name: 'TOPS', image: require('../../assets/design_screenshots/women_categories/tops.png') },
  { id: '3', name: 'BEAUTY', image: require('../../assets/design_screenshots/women_categories/accessories.png') },
  { id: '4', name: 'DRESSES', image: require('../../assets/design_screenshots/women_categories/dresses.png') },
  { id: '5', name: 'BOTTOMS', image: require('../../assets/design_screenshots/women_categories/bottoms.png') },
  { id: '6', name: 'ACCESSORIES', image: require('../../assets/design_screenshots/women_categories/accessories.png') },
  { id: '7', name: 'SPORT', image: require('../../assets/design_screenshots/women_categories/sport.png') },
  { id: '8', name: 'JACKETS & COATS', image: require('../../assets/design_screenshots/women_categories/jackets_and_coats.png') },
  { id: '9', name: 'LINGERIE & SLEEPWEAR', image: require('../../assets/design_screenshots/women_categories/lingerie_and_sleepwear.png') },
  { id: '10', name: 'SWIMWEAR', image: require('../../assets/design_screenshots/women_categories/swimwear.png') },
];

const menCategories: Category[] = [
  { id: '1', name: 'SHOES', image: require('../../assets/design_screenshots/men_categories/shoes.png') },
  { id: '2', name: 'TOPS', image: require('../../assets/design_screenshots/men_categories/Tops.png') },
  { id: '3', name: 'JEANS, PANTS & SHORTS', image: require('../../assets/design_screenshots/men_categories/pants_and_jeans.png') },
  { id: '4', name: 'SPORT', image: require('../../assets/design_screenshots/men_categories/sport.png') },
  { id: '5', name: 'ACCESSORIES', image: require('../../assets/design_screenshots/men_categories/accessories.png') },
  { id: '6', name: 'GROOMING', image: require('../../assets/design_screenshots/men_categories/grooming.png') },
  { id: '7', name: 'UNDERWEAR, SLEEPWEAR & SOCKS', image: require('../../assets/design_screenshots/men_categories/underwear_and_socks.png') },
  { id: '8', name: 'JACKETS & COATS', image: require('../../assets/design_screenshots/men_categories/jackets_and_coats.png') },
  { id: '9', name: 'FORMALWEAR', image: require('../../assets/design_screenshots/men_categories/formalwear.png') },
  { id: '10', name: 'SWIMWEAR', image: require('../../assets/design_screenshots/men_categories/swimwear.png') },
];

// Brands from brand_list_b.png (1-19) and brand_list_a.png (20-37) - alphabetically sorted
const allBrands: Brand[] = [
  { id: '1', name: 'Alora Men', logo: require('../../assets/images/logos/tol\'thema-logo.png') },
  { id: '2', name: 'Alora women', logo: require('../../assets/images/logos/suhu-logo.png') },
  { id: '3', name: 'Amanda Laird Cherry Apparel', logo: require('../../assets/images/logos/sakanya_logo.png') },
  { id: '4', name: 'ArtClub & friends', logo: require('../../assets/images/logos/fade_logo.png') },
  { id: '5', name: 'Ben Sherman South Africa', logo: require('../../assets/images/logos/embedded_logo.png') },
  { id: '6', name: 'Black Monarchy', logo: require('../../assets/images/logos/Koakoa_logo.png') },
  { id: '7', name: 'blaq child', logo: require('../../assets/images/logos/ masonwabe_profile_pic.png') },
  { id: '8', name: 'chepastreetwar', logo: require('../../assets/images/ masonwabe_profile_pic.png') },
  { id: '9', name: 'collector (ctt.r__)', logo: require('../../assets/images/ masonwabe_profile_pic.png') },
  { id: '10', name: 'cultish', logo: require('../../assets/images/ masonwabe_profile_pic.png') },
  { id: '11', name: 'dorefashionsa', logo: require('../../assets/images/ masonwabe_profile_pic.png') },
  { id: '12', name: 'embedded', logo: require('../../assets/images/ masonwabe_profile_pic.png') },
  { id: '13', name: 'fabrikhunter', logo: require('../../assets/images/ masonwabe_profile_pic.png') },
  { id: '14', name: 'fade', logo: require('../../assets/images/ masonwabe_profile_pic.png') },
  { id: '15', name: 'house of ntu', logo: require('../../assets/images/ masonwabe_profile_pic.png') },
  { id: '16', name: 'Lovu Clothing', logo: require('../../assets/images/ masonwabe_profile_pic.png') },
  { id: '17', name: 'mali mali clothing', logo: require('../../assets/images/ masonwabe_profile_pic.png') },
  { id: '18', name: 'mobreign', logo: require('../../assets/images/ masonwabe_profile_pic.png') },
  { id: '19', name: 'muze', logo: require('../../assets/images/ masonwabe_profile_pic.png') },
  { id: '20', name: 'nolandu.couture', logo: require('../../assets/images/ masonwabe_profile_pic.png') },
  { id: '21', name: 'OBLVN', logo: require('../../assets/images/ masonwabe_profile_pic.png') },
  { id: '22', name: 'old money', logo: require('../../assets/images/ masonwabe_profile_pic.png') },
  { id: '23', name: 'Paloma Boutique', logo: require('../../assets/images/ masonwabe_profile_pic.png') },
  { id: '24', name: 'rareblaq', logo: require('../../assets/images/ masonwabe_profile_pic.png') },
  { id: '25', name: 'rossimoda_official', logo: require('../../assets/images/ masonwabe_profile_pic.png') },
  { id: '26', name: 'S & M Collection', logo: require('../../assets/images/ masonwabe_profile_pic.png') },
  { id: '27', name: 'sakhanya', logo: require('../../assets/images/ masonwabe_profile_pic.png') },
  { id: '28', name: 'shara', logo: require('../../assets/images/ masonwabe_profile_pic.png') },
  { id: '29', name: 'stylealertsa', logo: require('../../assets/images/ masonwabe_profile_pic.png') },
  { id: '30', name: 'suhu', logo: require('../../assets/images/ masonwabe_profile_pic.png') },
  { id: '31', name: 'thefieldstore', logo: require('../../assets/images/ masonwabe_profile_pic.png') },
  { id: '32', name: 'tol-thema', logo: require('../../assets/images/ masonwabe_profile_pic.png') },
  { id: '33', name: 'udarkie', logo: require('../../assets/images/ masonwabe_profile_pic.png') },
  { id: '34', name: 'unseen grail', logo: require('../../assets/images/ masonwabe_profile_pic.png') },
  { id: '35', name: 'Verse Studio', logo: require('../../assets/images/ masonwabe_profile_pic.png') },
  { id: '36', name: 'Vintage Joint', logo: require('../../assets/images/ masonwabe_profile_pic.png') },
  { id: '37', name: 'violet', logo: require('../../assets/images/ masonwabe_profile_pic.png') },
];

export default function ProfileScreen() {
  const { activePrimaryFilter } = useFilter();
  const [shopFilterMode, setShopFilterMode] = useState<'brands' | 'categories'>('brands');
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  const handleMenuPress = () => {
    setIsMenuVisible(true);
  };

  const handleCartPress = () => {
    // Handle cart press
    console.log('Cart pressed');
  };

  const handleNotificationsPress = () => {
    // Handle notifications press
    console.log('Notifications pressed');
  };

  const handleFeedTabChange = (tab: 'men' | 'women' | 'home-lifestyle') => {
    // Handle feed tab change
    console.log('Feed tab changed to:', tab);
    // Filter state is now managed by the FeedTabs component via context
  };

  const handleShopFilterChange = (mode: 'brands' | 'categories') => {
    setShopFilterMode(mode);
    console.log('Shop filter mode changed to:', mode);
  };

  const handleCategoryPress = (category: Category) => {
    console.log('Category pressed:', category.name);
    // Navigate to category products
  };

  const getCurrentCategories = () => {
    if (activePrimaryFilter === 'women') return womenCategories;
    if (activePrimaryFilter === 'men') return menCategories;
    return []; // Home & Lifestyle categories can be added later
  };

  const handleBrandPress = (brand: Brand) => {
    console.log('Brand pressed:', brand.name);
    // Navigate to brand products
  };

  // Group brands by first letter
  const getGroupedBrands = () => {
    const grouped: { [key: string]: Brand[] } = {};
    allBrands.forEach(brand => {
      const firstLetter = brand.name[0].toUpperCase();
      if (!grouped[firstLetter]) {
        grouped[firstLetter] = [];
      }
      grouped[firstLetter].push(brand);
    });
    return grouped;
  };

  const groupedBrands = getGroupedBrands();
  const alphabetLetters = Object.keys(groupedBrands).sort();

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <SideMenu
        visible={isMenuVisible}
        onClose={() => setIsMenuVisible(false)}
        userName="Khanyisomthamo2"
      />
      <YiivaHeader
        onMenuPress={handleMenuPress}
        onCartPress={handleCartPress}
        onNotificationsPress={handleNotificationsPress}
      />
      
      <FeedTabs onTabChange={handleFeedTabChange} />
      
      {/* Shop Filter Toggle */}
      <View style={styles.shopFilterContainer}>
        <View style={styles.shopFilterToggle}>
          <TouchableOpacity
            style={[
              styles.shopFilterButton,
              styles.leftButton,
              shopFilterMode === 'brands' && styles.activeShopFilterButton
            ]}
            onPress={() => handleShopFilterChange('brands')}
          >
            <ThemedText style={[
              styles.shopFilterText,
              shopFilterMode === 'brands' && styles.activeShopFilterText
            ]}>
              Brands
            </ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.shopFilterButton,
              styles.rightButton,
              shopFilterMode === 'categories' && styles.activeShopFilterButton
            ]}
            onPress={() => handleShopFilterChange('categories')}
          >
            <ThemedText style={[
              styles.shopFilterText,
              shopFilterMode === 'categories' && styles.activeShopFilterText
            ]}>
              Categories
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
      
      {shopFilterMode === 'categories' ? (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.categoriesContainer}>
            {getCurrentCategories().map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryCard}
                onPress={() => handleCategoryPress(category)}
                activeOpacity={0.9}
              >
                <View style={styles.categoryContent}>
                  <ThemedText style={styles.categoryTitle}>{category.name}</ThemedText>
                  <Image source={category.image} style={styles.categoryImage} contentFit="contain" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.brandsContainer}>
          {/* Alphabetical Index */}
          <View style={styles.alphabetIndex}>
            {alphabetLetters.map((letter) => (
              <TouchableOpacity key={letter} style={styles.alphabetItem}>
                <ThemedText style={styles.alphabetText}>{letter}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Brands List */}
          <ScrollView style={styles.brandsScrollView} showsVerticalScrollIndicator={false}>
            {alphabetLetters.map((letter) => (
              <View key={letter}>
                <View style={styles.letterHeader}>
                  <ThemedText style={styles.letterHeaderText}>{letter}</ThemedText>
                </View>
                {groupedBrands[letter].map((brand) => (
                  <TouchableOpacity
                    key={brand.id}
                    style={styles.brandItem}
                    onPress={() => handleBrandPress(brand)}
                    activeOpacity={0.9}
                  >
                    <Image source={brand.logo} style={styles.brandLogo} />
                    <ThemedText style={styles.brandName}>{brand.name}</ThemedText>
                    <ThemedText style={styles.brandChevron}>›</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  activeFilter: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  shopFilterContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  shopFilterToggle: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 2,
    position: 'relative',
  },
  shopFilterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    transition: 'all 0.2s ease',
  },
  leftButton: {
    marginRight: 1,
  },
  rightButton: {
    marginLeft: 1,
  },
  activeShopFilterButton: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  shopFilterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeShopFilterText: {
    color: '#333',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  categoriesContainer: {
    padding: 16,
  },
  categoryCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 24,
    paddingHorizontal: 24,
    minHeight: 100,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    flex: 1,
    letterSpacing: 0.5,
  },
  categoryImage: {
    width: 80,
    height: 60,
    marginLeft: 16,
  },
  brandsContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  alphabetIndex: {
    width: 30,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  alphabetItem: {
    paddingVertical: 3,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 24,
  },
  alphabetText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  brandsScrollView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  letterHeader: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  letterHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
  },
  brandItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  brandLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 16,
    backgroundColor: '#f5f5f5',
  },
  brandName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  brandChevron: {
    fontSize: 20,
    color: '#ccc',
    fontWeight: '300',
  },
});