import React from 'react';
import { Image, Text as RNText, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from './ui/IconSymbol';
import { useThemeColors } from '@/lib/theme';

interface YiivaHeaderProps {
  onMenuPress: () => void;
  onCartPress: () => void;
  onNotificationsPress: () => void;
  /** Unread notification count; renders a badge on the bell when > 0. */
  unreadCount?: number;
}

// YIIVA redesign — token surface (bg-card), foreground-tinted logo (works in
// dark since ICON_BLACK is monochrome), token bell badge.
export function YiivaHeader({
  onMenuPress,
  onCartPress,
  onNotificationsPress,
  unreadCount = 0,
}: YiivaHeaderProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  return (
    <View
      className="flex-row items-center justify-between border-b border-border bg-card px-5 pb-1.5"
      style={{ paddingTop: insets.top + 16 }}
    >
      <TouchableOpacity onPress={onMenuPress} className="p-2">
        <View className="gap-[3px]">
          <View className="h-0.5 w-5 rounded-full bg-foreground" />
          <View className="h-0.5 w-5 rounded-full bg-foreground" />
          <View className="h-0.5 w-5 rounded-full bg-foreground" />
        </View>
      </TouchableOpacity>

      <Image
        source={require('@/assets/images/ICON_BLACK.png')}
        style={{ height: 32, width: 120 }}
        resizeMode="contain"
        tintColor={colors.foreground}
      />

      <View className="flex-row items-center gap-2">
        <TouchableOpacity onPress={onNotificationsPress} className="p-2">
          <IconSymbol size={24} name="bell" color={colors.foreground} />
          {unreadCount > 0 && (
            <View className="absolute right-1 top-1 h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1">
              <RNText
                className="text-[10px] font-bold text-danger-foreground"
                style={{ lineHeight: 14 }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </RNText>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={onCartPress} className="p-2">
          <IconSymbol size={24} name="cart" color={colors.foreground} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
