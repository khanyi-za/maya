import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  currency: string;
  image: string;
  merchant: {
    id: string;
    username: string;
    displayName: string;
  };
  quantity: number;
  selectedSize?: string;
}

interface CartState {
  items: CartItem[];
  isInitialized: boolean;

  // Actions
  addToCart: (item: Omit<CartItem, 'quantity' | 'id'> & { quantity?: number }) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;

  // Getters
  getItemCount: () => number;
  getCartTotal: () => number;
  isInCart: (productId: string, selectedSize?: string) => boolean;
  getCartItem: (productId: string, selectedSize?: string) => CartItem | undefined;

  // Persistence
  loadState: () => Promise<void>;
  saveState: () => Promise<void>;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isInitialized: false,

  addToCart: (item) => {
    set((state) => {
      const existingItemIndex = state.items.findIndex(
        (i) => i.productId === item.productId && i.selectedSize === item.selectedSize
      );

      let newItems;
      if (existingItemIndex > -1) {
        // Item already exists, update quantity
        newItems = [...state.items];
        newItems[existingItemIndex].quantity += item.quantity || 1;
      } else {
        // New item, add to cart
        const newItem: CartItem = {
          ...item,
          id: `${item.productId}-${item.selectedSize || 'default'}-${Date.now()}`,
          quantity: item.quantity || 1,
        };
        newItems = [...state.items, newItem];
      }

      return { items: newItems };
    });
    get().saveState();
  },

  removeFromCart: (itemId) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== itemId),
    }));
    get().saveState();
  },

  updateQuantity: (itemId, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(itemId);
      return;
    }

    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId ? { ...item, quantity } : item
      ),
    }));
    get().saveState();
  },

  clearCart: () => {
    set({ items: [] });
    get().saveState();
  },

  getItemCount: () => {
    return get().items.reduce((total, item) => total + item.quantity, 0);
  },

  getCartTotal: () => {
    return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
  },

  isInCart: (productId, selectedSize) => {
    return get().items.some(
      (item) => item.productId === productId && item.selectedSize === selectedSize
    );
  },

  getCartItem: (productId, selectedSize) => {
    return get().items.find(
      (item) => item.productId === productId && item.selectedSize === selectedSize
    );
  },

  loadState: async () => {
    try {
      const cartData = await AsyncStorage.getItem('shopping_cart');
      if (cartData) {
        const items = JSON.parse(cartData);
        set({ items, isInitialized: true });
      } else {
        set({ isInitialized: true });
      }
    } catch (error) {
      console.error('Error loading cart state:', error);
      set({ isInitialized: true });
    }
  },

  saveState: async () => {
    try {
      const state = get();
      await AsyncStorage.setItem('shopping_cart', JSON.stringify(state.items));
    } catch (error) {
      console.error('Error saving cart state:', error);
    }
  },
}));
