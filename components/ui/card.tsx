import { View, type ViewProps } from 'react-native'
import { cn } from '@/lib/utils'

// Token surface primitive. Flat/bordered by default (RN shadow utilities are
// limited on native); pass an elevation style where a raised card is wanted.
export function Card({ className, ...props }: ViewProps) {
  return (
    <View
      className={cn('rounded-lg border border-border bg-card', className)}
      {...props}
    />
  )
}
