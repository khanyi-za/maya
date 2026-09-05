import React from 'react';
import { View, TouchableOpacity, Modal, Animated, Dimensions, Pressable, ScrollView, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import Constants from 'expo-constants';
import { IconSymbol } from './ui/IconSymbol';
import { Text } from './ui/text';
import { Avatar } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/lib/auth-store';
import { logout } from '@/lib/auth';
import { useThemeColors } from '@/lib/theme';
import { haptics } from '@/lib/haptics';

interface SideMenuProps {
  visible: boolean;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.85;
// Close animation duration — navigation waits for it so the Modal teardown
// doesn't clash with the router transition.
const CLOSE_MS = 250;
const DRAWER_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 2, height: 0 },
  shadowOpacity: 0.25,
  shadowRadius: 8,
  elevation: 5,
};

export function SideMenu({ visible, onClose }: SideMenuProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = useThemeColors();
  const slideAnim = React.useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const authState = useAuthStore((s) => s.state);
  const isAuthenticated = authState.status === 'authenticated';
  const user = isAuthenticated ? authState.user : null;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: -DRAWER_WIDTH, duration: CLOSE_MS, useNativeDriver: true }).start();
    }
  }, [visible]);

  // Backdrop fades in step with the drawer instead of popping in.
  const backdropOpacity = slideAnim.interpolate({
    inputRange: [-DRAWER_WIDTH, 0],
    outputRange: [0, 1],
  });

  const handleNavigation = (route: string) => {
    haptics.light();
    onClose();
    setTimeout(() => {
      router.push(route as any);
    }, CLOSE_MS + 50);
  };

  const handleToggleTheme = () => {
    haptics.light();
    toggleColorScheme();
  };

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 flex-row">
        <Animated.View className="absolute inset-0 bg-black/50" style={{ opacity: backdropOpacity }}>
          <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Close menu" />
        </Animated.View>

        <Animated.View
          className="absolute bottom-0 left-0 top-0 overflow-hidden rounded-r-2xl bg-card"
          style={[{ width: DRAWER_WIDTH, transform: [{ translateX: slideAnim }], paddingTop: insets.top }, DRAWER_SHADOW]}
        >
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
            {/* Identity header */}
            {user ? (
              <View className="flex-row items-center gap-3 border-b border-border px-5 py-6">
                <Avatar size={48} fallback={`${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()} />
                <View className="flex-1">
                  <Text variant="heading" numberOfLines={1}>
                    Hello, {user.firstName}
                  </Text>
                  <Text variant="caption" numberOfLines={1}>
                    {user.email}
                  </Text>
                </View>
              </View>
            ) : (
              <View className="border-b border-border px-5 py-6">
                <Text variant="heading">Welcome to YIIVA</Text>
                <Text variant="caption" className="mb-4 mt-1">
                  Sign in to sync your cart, wishlist and purchases.
                </Text>
                <Button size="sm" onPress={() => handleNavigation('/auth/login')}>
                  Sign in
                </Button>
              </View>
            )}

            {/* Shopping */}
            <SectionLabel label="Shopping" />
            <MenuItem icon="bag" label="My purchases" onPress={() => handleNavigation('/orders')} />
            <MenuItem icon="bell" label="Notifications" onPress={() => handleNavigation('/notifications')} />
            <MenuItem icon="heart" label="Wishlist" onPress={() => handleNavigation('/(tabs)/bookmarks')} />
            <MenuItem icon="cart" label="Cart" onPress={() => handleNavigation('/cart')} />

            {/* Account */}
            <SectionLabel label="Account" />
            <MenuItem icon="person" label="Account" onPress={() => handleNavigation('/account')} />
            {isAuthenticated && user?.role === 'MERCHANT' && (
              <MenuItem
                icon="storefront"
                label="Manage my store"
                onPress={() => handleNavigation('/merchant')}
              />
            )}
            {isAuthenticated && (
              <MenuItem
                icon="rectangle.portrait.and.arrow.right"
                label="Sign out"
                tone="danger"
                onPress={() => {
                  haptics.light();
                  onClose();
                  void logout();
                }}
              />
            )}

            {/* Preferences */}
            <SectionLabel label="Preferences" />
            <View className="flex-row items-center justify-between px-5 py-3">
              <View className="flex-1 flex-row items-center gap-3">
                <IconChip icon={isDark ? 'moon.fill' : 'moon'} />
                <Text className="text-[15px] text-foreground">Dark mode</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={handleToggleTheme}
                trackColor={{ false: colors.border, true: colors.brand }}
                thumbColor="#ffffff"
                ios_backgroundColor={colors.border}
                accessibilityLabel="Toggle dark mode"
              />
            </View>

            {/* Coming soon — real routes don't exist yet; rows stay visible but inert
                (previously these navigated to the 404 screen). */}
            <SectionLabel label="Coming soon" />
            <MenuItem icon="arrow.left.arrow.right" label="Returns & exchanges" soon />
            <MenuItem icon="giftcard" label="Gift vouchers" soon />

            {/* Footer */}
            <View className="mt-4 border-t border-border px-5 pb-4 pt-4">
              <TouchableOpacity className="py-2.5" onPress={() => console.log('Contact us')}>
                <Text variant="caption">Contact us</Text>
              </TouchableOpacity>
              <TouchableOpacity className="py-2.5" onPress={() => console.log('Review app')}>
                <Text variant="caption">Review the app in store</Text>
              </TouchableOpacity>
              <TouchableOpacity className="py-2.5" onPress={() => console.log('Help improve')}>
                <Text variant="caption">Help improve the app</Text>
              </TouchableOpacity>
              <Text variant="micro" className="mt-3">
                Version {appVersion}
              </Text>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <Text variant="micro" className="px-5 pb-1 pt-5 uppercase tracking-widest">
      {label}
    </Text>
  );
}

function IconChip({ icon, tone = 'default' }: { icon: React.ComponentProps<typeof IconSymbol>['name']; tone?: 'default' | 'danger' }) {
  const colors = useThemeColors();
  return (
    <View className={`h-9 w-9 items-center justify-center rounded-full ${tone === 'danger' ? 'bg-danger-subtle' : 'bg-muted'}`}>
      <IconSymbol name={icon} size={17} color={tone === 'danger' ? colors.danger : colors.foreground} />
    </View>
  );
}

interface MenuItemProps {
  icon: React.ComponentProps<typeof IconSymbol>['name'];
  label: string;
  onPress?: () => void;
  tone?: 'default' | 'danger';
  soon?: boolean;
}

function MenuItem({ icon, label, onPress, tone = 'default', soon }: MenuItemProps) {
  const colors = useThemeColors();
  return (
    <TouchableOpacity
      className="flex-row items-center justify-between px-5 py-3"
      onPress={soon ? undefined : onPress}
      activeOpacity={soon ? 1 : 0.6}
      disabled={soon}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View className={`flex-1 flex-row items-center gap-3 ${soon ? 'opacity-50' : ''}`}>
        <IconChip icon={icon} tone={tone} />
        <Text className={`text-[15px] ${tone === 'danger' ? 'text-danger' : 'text-foreground'}`}>{label}</Text>
      </View>
      {soon ? (
        <Badge tone="neutral">Soon</Badge>
      ) : (
        <IconSymbol name="chevron.right" size={14} color={colors.mutedForeground} />
      )}
    </TouchableOpacity>
  );
}
