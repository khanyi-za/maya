import { useEffect, useRef } from 'react'
import { Animated, type ViewProps } from 'react-native'
import { cn } from '@/lib/utils'

// Shimmer skeleton via RN Animated opacity loop (no reanimated → no worklet
// dependency). Token bg-muted so it's theme-aware.
export function Skeleton({ className, style, ...props }: ViewProps) {
  const opacity = useRef(new Animated.Value(0.5)).current

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    )
    anim.start()
    return () => anim.stop()
  }, [opacity])

  return (
    <Animated.View
      className={cn('rounded-md bg-muted', className)}
      style={[{ opacity }, style]}
      {...props}
    />
  )
}
