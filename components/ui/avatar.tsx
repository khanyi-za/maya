import { Image } from 'expo-image'
import { View } from 'react-native'
import { cn } from '@/lib/utils'
import { Text } from './text'

// Round avatar with initials fallback.
// - variant="person" (default): photo center-cropped to fill the circle;
//   brand-subtle tint + brand initials when there's no image.
// - variant="logo": for BRAND LOGOS — wordmarks/icon marks must never be
//   cropped, so the image is contained with inner padding on an always-white
//   coin (logos are designed for light grounds; the white tile is deliberate
//   in dark mode, like app icons) with a hairline border.
export function Avatar({
  uri,
  fallback,
  size = 40,
  variant = 'person',
  className,
}: {
  uri?: string | null
  fallback?: string
  size?: number
  variant?: 'person' | 'logo'
  className?: string
}) {
  const logo = variant === 'logo'
  const pad = logo ? Math.round(size * 0.14) : 0
  return (
    <View
      className={cn(
        'items-center justify-center overflow-hidden rounded-full',
        logo ? 'border border-border bg-white' : 'bg-brand-subtle',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size - pad * 2, height: size - pad * 2 }}
          contentFit={logo ? 'contain' : 'cover'}
          transition={150}
        />
      ) : (
        <Text
          // Logo coin is fixed-white, so the fallback initial stays ink in both
          // themes (text-foreground would go white-on-white in dark mode).
          className={logo ? 'text-black' : 'text-brand'}
          style={{ fontSize: size * 0.4, fontWeight: '700' }}
        >
          {fallback}
        </Text>
      )}
    </View>
  )
}
