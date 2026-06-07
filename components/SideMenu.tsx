import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from './ui/IconSymbol';
import { useRouter } from 'expo-router';

interface SideMenuProps {
  visible: boolean;
  onClose: () => void;
  userName?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.85;

export function SideMenu({ visible, onClose, userName = 'Guest' }: SideMenuProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const slideAnim = React.useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleNavigation = (route: string) => {
    onClose();
    setTimeout(() => {
      router.push(route as any);
    }, 300);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <Animated.View
          style={[
            styles.drawer,
            {
              width: DRAWER_WIDTH,
              transform: [{ translateX: slideAnim }],
              paddingTop: insets.top,
            },
          ]}
        >
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.greeting}>Hello, <Text style={styles.userName}>{userName}</Text></Text>
            </View>

            {/* Menu Items */}
            <View style={styles.menuSection}>
              <MenuItem
                icon="arrow.left.arrow.right"
                label="Log a Return or Exchange"
                onPress={() => handleNavigation('/returns')}
              />

              <MenuItem
                icon="shippingbox"
                label="Track your purchase/order"
                onPress={() => handleNavigation('/track-order')}
              />

              <MenuItem
                icon="person.fill"
                label="Account"
                onPress={() => handleNavigation('/account')}
                hasChevron
              />

              <MenuItem
                icon="heart"
                label="Wishlist"
                onPress={() => handleNavigation('/(tabs)/bookmarks')}
              />

              <MenuItem
                icon="cart"
                label="Cart"
                onPress={() => handleNavigation('/cart')}
              />

              <MenuItem
                icon="giftcard"
                label="Buy a Gift Voucher"
                onPress={() => handleNavigation('/gift-voucher')}
              />

              <MenuItem
                icon="rectangle.portrait.and.arrow.right"
                label="Sign out"
                onPress={() => {
                  onClose();
                  console.log('Sign out pressed');
                }}
              />

              <MenuItem
                icon="questionmark.circle"
                label="Help"
                onPress={() => handleNavigation('/help')}
              />
            </View>

            {/* Footer Section */}
            <View style={styles.footer}>
              <TouchableOpacity style={styles.footerItem} onPress={() => console.log('Contact us')}>
                <Text style={styles.footerText}>Contact us</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.footerItem} onPress={() => console.log('Review app')}>
                <Text style={styles.footerText}>Review the app in store</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.footerItem} onPress={() => console.log('Help improve')}>
                <Text style={styles.footerText}>Help improve the app</Text>
              </TouchableOpacity>

              <Text style={styles.version}>Version 1.0.0</Text>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

interface MenuItemProps {
  icon: string;
  label: string;
  onPress: () => void;
  hasChevron?: boolean;
}

function MenuItem({ icon, label, onPress, hasChevron }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.menuItemContent}>
        <IconSymbol name={icon as any} size={24} color="#000" />
        <Text style={styles.menuItemLabel}>{label}</Text>
      </View>
      {hasChevron && (
        <IconSymbol name="chevron.down" size={16} color="#999" />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  greeting: {
    fontSize: 20,
    color: '#666',
  },
  userName: {
    fontWeight: '700',
    color: '#000',
  },
  menuSection: {
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 16,
    color: '#000',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  footerItem: {
    paddingVertical: 12,
  },
  footerText: {
    fontSize: 16,
    color: '#999',
  },
  version: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 16,
  },
});
