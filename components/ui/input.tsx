import { useState } from 'react'
import { TextInput, type TextInputProps } from 'react-native'
import { cn } from '@/lib/utils'

// Token-driven text input. Focus ring via focus state (RN has no :focus).
// `error` swaps the border to danger. placeholderTextColor is a prop (can't be
// className) — zinc-400/500 reads fine in both themes.
export function Input({
  className,
  error,
  onFocus,
  onBlur,
  ...props
}: TextInputProps & { error?: boolean }) {
  const [focused, setFocused] = useState(false)
  return (
    <TextInput
      placeholderTextColor="#a1a1aa"
      onFocus={(e) => {
        setFocused(true)
        onFocus?.(e)
      }}
      onBlur={(e) => {
        setFocused(false)
        onBlur?.(e)
      }}
      className={cn(
        'h-11 rounded-lg border bg-card px-3 text-[15px] text-foreground',
        error ? 'border-danger' : focused ? 'border-ring' : 'border-border',
        className,
      )}
      {...props}
    />
  )
}
