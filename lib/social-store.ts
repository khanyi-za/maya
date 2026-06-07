import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SocialState {
  likedProducts: Set<string>;
  bookmarkedProducts: Set<string>;
  followedMerchants: Set<string>;
  isInitialized: boolean;

  // Actions
  toggleLike: (productId: string) => void;
  toggleBookmark: (productId: string) => void;
  toggleFollow: (merchantId: string) => void;

  // Getters
  isLiked: (productId: string) => boolean;
  isBookmarked: (productId: string) => boolean;
  isFollowing: (merchantId: string) => boolean;

  // Persistence
  loadState: () => Promise<void>;
  saveState: () => Promise<void>;

  // Get all bookmarked products
  getBookmarkedProducts: () => string[];
}

export const useSocialStore = create<SocialState>((set, get) => ({
  likedProducts: new Set<string>(),
  bookmarkedProducts: new Set<string>(),
  followedMerchants: new Set<string>(),
  isInitialized: false,

  toggleLike: (productId: string) => {
    set((state) => {
      const newLiked = new Set(state.likedProducts);
      if (newLiked.has(productId)) {
        newLiked.delete(productId);
      } else {
        newLiked.add(productId);
      }
      return { likedProducts: newLiked };
    });
    get().saveState();
  },

  toggleBookmark: (productId: string) => {
    set((state) => {
      const newBookmarked = new Set(state.bookmarkedProducts);
      if (newBookmarked.has(productId)) {
        newBookmarked.delete(productId);
      } else {
        newBookmarked.add(productId);
      }
      return { bookmarkedProducts: newBookmarked };
    });
    get().saveState();
  },

  toggleFollow: (merchantId: string) => {
    set((state) => {
      const newFollowed = new Set(state.followedMerchants);
      if (newFollowed.has(merchantId)) {
        newFollowed.delete(merchantId);
      } else {
        newFollowed.add(merchantId);
      }
      return { followedMerchants: newFollowed };
    });
    get().saveState();
  },

  isLiked: (productId: string) => {
    return get().likedProducts.has(productId);
  },

  isBookmarked: (productId: string) => {
    return get().bookmarkedProducts.has(productId);
  },

  isFollowing: (merchantId: string) => {
    return get().followedMerchants.has(merchantId);
  },

  getBookmarkedProducts: () => {
    return Array.from(get().bookmarkedProducts);
  },

  loadState: async () => {
    try {
      const [likedData, bookmarkedData, followedData] = await Promise.all([
        AsyncStorage.getItem('liked_products'),
        AsyncStorage.getItem('bookmarked_products'),
        AsyncStorage.getItem('followed_merchants'),
      ]);

      set({
        likedProducts: new Set(likedData ? JSON.parse(likedData) : []),
        bookmarkedProducts: new Set(bookmarkedData ? JSON.parse(bookmarkedData) : []),
        followedMerchants: new Set(followedData ? JSON.parse(followedData) : []),
        isInitialized: true,
      });
    } catch (error) {
      console.error('Error loading social state:', error);
      set({ isInitialized: true });
    }
  },

  saveState: async () => {
    try {
      const state = get();
      await Promise.all([
        AsyncStorage.setItem(
          'liked_products',
          JSON.stringify(Array.from(state.likedProducts))
        ),
        AsyncStorage.setItem(
          'bookmarked_products',
          JSON.stringify(Array.from(state.bookmarkedProducts))
        ),
        AsyncStorage.setItem(
          'followed_merchants',
          JSON.stringify(Array.from(state.followedMerchants))
        ),
      ]);
    } catch (error) {
      console.error('Error saving social state:', error);
    }
  },
}));
