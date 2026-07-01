import { Image } from 'expo-image'
import { View } from 'react-native'
import { cn } from '@/lib/utils'
import { Text } from './text'

// Round avatar with initials fallback. brand-subtle tint + brand text.
export function Avatar({
  uri,
  fallback,
  size = 40,
  className,
}: {
  uri?: string | null
  fallback?: string
  size?: number
  className?: string
}) {
  return (
    <View
      className={cn('items-center justify-center overflow-hidden rounded-full bg-brand-subtle', className)}
      style={{ width: size, height: size }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" />
      ) : (
        <Text className="text-brand" style={{ fontSize: size * 0.4, fontWeight: '700' }}>
          {fallback}
        </Text>
      )}
    </View>
  )
}
