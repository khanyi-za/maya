import type { ReactNode } from 'react'
import { ActivityIndicator, Pressable, type PressableProps } from 'react-native'
import { cn } from '@/lib/utils'
import { Text } from './text'

// Token-driven button (RNR-style, NativeWind). Ink primary + Azure brand accent.
// `primary` stays ink; `brand` is the Sky-blue CTA. Loading + disabled built in.

export type ButtonVariant = 'brand' | 'primary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'default' | 'sm' | 'lg'

const BG: Record<ButtonVariant, string> = {
  brand: 'bg-brand',
  primary: 'bg-primary',
  outline: 'border border-border bg-card',
  ghost: 'bg-transparent',
  danger: 'bg-danger',
}
const FG: Record<ButtonVariant, string> = {
  brand: 'text-brand-foreground',
  primary: 'text-primary-foreground',
  outline: 'text-foreground',
  ghost: 'text-foreground',
  danger: 'text-danger-foreground',
}
const SIZE: Record<ButtonSize, string> = {
  default: 'h-11 px-4',
  sm: 'h-9 px-3',
  lg: 'h-12 px-5',
}
// ActivityIndicator needs a color value (can't take className).
const SPINNER: Record<ButtonVariant, string> = {
  brand: '#fafafa',
  primary: '#fafafa',
  danger: '#fafafa',
  outline: '#71717a',
  ghost: '#71717a',
}

export function Button({
  children,
  variant = 'brand',
  size = 'default',
  loading = false,
  disabled = false,
  className,
  textClassName,
  ...props
}: PressableProps & {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  textClassName?: string
}) {
  return (
    <Pressable
      disabled={disabled || loading}
      className={cn(
        'flex-row items-center justify-center gap-2 rounded-lg active:opacity-80',
        BG[variant],
        SIZE[size],
        (disabled || loading) && 'opacity-50',
        className,
      )}
      {...props}
    >
      {loading && <ActivityIndicator size="small" color={SPINNER[variant]} />}
      {typeof children === 'string' ? (
        <Text variant="label" className={cn(FG[variant], textClassName)}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  )
}
