import React from 'react';
import { View, TouchableOpacity, Modal, Animated, Dimensions, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { IconSymbol } from './ui/IconSymbol';
import { Text } from './ui/text';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/lib/auth-store';
import { logout } from '@/lib/auth';
import { useThemeColors } from '@/lib/theme';

interface SideMenuProps {
  visible: boolean;
  onClose: () => void;
  /** Fallback display name; the auth store's user wins when signed in. */
  userName?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.85;
const DRAWER_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 2, height: 0 },
  shadowOpacity: 0.25,
  shadowRadius: 8,
  elevation: 5,
};

export function SideMenu({ visible, onClose, userName = 'Guest' }: SideMenuProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = useThemeColors();
  const slideAnim = React.useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const authState = useAuthStore((s) => s.state);
  const isAuthenticated = authState.status === 'authenticated';
  const displayName = isAuthenticated ? authState.user.firstName : userName;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: -DRAWER_WIDTH, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible]);

  const handleNavigation = (route: string) => {
    onClose();
    setTimeout(() => {
      router.push(route as any);
    }, 300);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 flex-row">
        <Pressable className="flex-1 bg-black/50" onPress={onClose} />

        <Animated.View
          className="absolute bottom-0 left-0 top-0 bg-card"
          style={[{ width: DRAWER_WIDTH, transform: [{ translateX: slideAnim }], paddingTop: insets.top }, DRAWER_SHADOW]}
        >
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
            {/* Header */}
            <View className="border-b border-border px-5 py-6">
              <Text className="text-[20px] text-muted-foreground">
                Hello, <Text className="font-bold text-foreground">{displayName}</Text>
              </Text>
            </View>

            {/* Menu */}
            <View className="pt-2">
              {/* Dark mode toggle — does NOT close the drawer, so the flip is visible. */}
              <TouchableOpacity
                className="flex-row items-center justify-between border-b border-border px-5 py-4"
                onPress={toggleColorScheme}
                activeOpacity={0.7}
              >
                <View className="flex-1 flex-row items-center gap-4">
                  <IconSymbol name={isDark ? 'sun.max' : 'moon'} size={24} color={colors.foreground} />
                  <Text className="text-[16px] text-foreground">{isDark ? 'Light mode' : 'Dark mode'}</Text>
                </View>
              </TouchableOpacity>

              <MenuItem icon="arrow.left.arrow.right" label="Log a Return or Exchange" onPress={() => handleNavigation('/returns')} />
              <MenuItem icon="shippingbox" label="Track your purchase/order" onPress={() => handleNavigation('/track-order')} />
              <MenuItem icon="person.fill" label="Account" onPress={() => handleNavigation('/account')} hasChevron />
              <MenuItem icon="heart" label="Wishlist" onPress={() => handleNavigation('/(tabs)/bookmarks')} />
              <MenuItem icon="cart" label="Cart" onPress={() => handleNavigation('/cart')} />
              <MenuItem icon="giftcard" label="Buy a Gift Voucher" onPress={() => handleNavigation('/gift-voucher')} />

              {isAuthenticated ? (
                <MenuItem
                  icon="rectangle.portrait.and.arrow.right"
                  label="Sign out"
                  onPress={() => {
                    onClose();
                    void logout();
                  }}
                />
              ) : (
                <MenuItem icon="person.crop.circle" label="Sign in" onPress={() => handleNavigation('/auth/login')} />
              )}

              <MenuItem icon="questionmark.circle" label="Help" onPress={() => handleNavigation('/help')} />
            </View>

            {/* Footer */}
            <View className="px-5 pb-4 pt-6">
              <TouchableOpacity className="py-3" onPress={() => console.log('Contact us')}>
                <Text className="text-[16px] text-muted-foreground">Contact us</Text>
              </TouchableOpacity>
              <TouchableOpacity className="py-3" onPress={() => console.log('Review app')}>
                <Text className="text-[16px] text-muted-foreground">Review the app in store</Text>
              </TouchableOpacity>
              <TouchableOpacity className="py-3" onPress={() => console.log('Help improve')}>
                <Text className="text-[16px] text-muted-foreground">Help improve the app</Text>
              </TouchableOpacity>
              <Text className="mt-4 text-[14px] text-muted-foreground">Version 1.0.0</Text>
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
  const colors = useThemeColors();
  return (
    <TouchableOpacity
      className="flex-row items-center justify-between border-b border-border px-5 py-4"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="flex-1 flex-row items-center gap-4">
        <IconSymbol name={icon as any} size={24} color={colors.foreground} />
        <Text className="text-[16px] text-foreground">{label}</Text>
      </View>
      {hasChevron && <IconSymbol name="chevron.right" size={16} color={colors.mutedForeground} />}
    </TouchableOpacity>
  );
}
