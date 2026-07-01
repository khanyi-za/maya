import { Text as RNText, type TextProps } from 'react-native'
import { cn } from '@/lib/utils'

// YIIVA maya type scale (design-tokens §4). Replaces per-component fontSize/
// fontFamily duplication (incl. the unloaded Didot/RobotoMono refs). System font.

export type TextVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'body'
  | 'label'
  | 'caption'
  | 'micro'

const VARIANTS: Record<TextVariant, string> = {
  display: 'text-[28px] leading-9 font-bold text-foreground',
  title: 'text-[22px] leading-7 font-bold text-foreground',
  heading: 'text-[18px] leading-6 font-semibold text-foreground',
  body: 'text-[15px] leading-5 text-foreground',
  label: 'text-[15px] leading-5 font-semibold text-foreground',
  caption: 'text-[13px] leading-[18px] text-muted-foreground',
  micro: 'text-[11px] leading-4 font-medium text-muted-foreground',
}

export function Text({
  variant = 'body',
  className,
  ...props
}: TextProps & { variant?: TextVariant }) {
  return <RNText className={cn(VARIANTS[variant], className)} {...props} />
}
