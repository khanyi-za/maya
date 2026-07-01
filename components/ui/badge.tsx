import type { ReactNode } from 'react'
import { View } from 'react-native'
import { cn } from '@/lib/utils'
import { Text } from './text'

// Semantic status badge (tinted bg + tone text). Single tone system reused by
// the order-status map (lib/order-status.ts). Six tones, all theme-aware.

export type BadgeTone = 'neutral' | 'brand' | 'info' | 'success' | 'warning' | 'danger'

const BG: Record<BadgeTone, string> = {
  neutral: 'bg-muted',
  brand: 'bg-brand-subtle',
  info: 'bg-info-subtle',
  success: 'bg-success-subtle',
  warning: 'bg-warning-subtle',
  danger: 'bg-danger-subtle',
}
const FG: Record<BadgeTone, string> = {
  neutral: 'text-muted-foreground',
  brand: 'text-brand',
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: BadgeTone
  className?: string
}) {
  return (
    <View className={cn('self-start rounded-full px-2.5 py-1', BG[tone], className)}>
      <Text className={cn('text-[11px] font-semibold', FG[tone])}>{children}</Text>
    </View>
  )
}
