import type { ComponentProps, ReactNode } from 'react'
import { View } from 'react-native'
import { IconSymbol } from '@/components/ui/IconSymbol'
import { Text } from '@/components/ui/text'
import { useThemeColors } from '@/lib/theme'
import { cn } from '@/lib/utils'

// Shared icon-circle empty/error/guest state (the Home/Search anatomy).
// `fill` centers it in a flex-1 body; default is inline padding for use
// inside scroll content.
export function EmptyState({
  icon,
  title,
  caption,
  children,
  fill = false,
}: {
  icon: ComponentProps<typeof IconSymbol>['name']
  title: string
  caption?: string
  children?: ReactNode
  fill?: boolean
}) {
  const colors = useThemeColors()
  return (
    <View
      className={cn(
        'items-center gap-3 px-10',
        fill ? 'flex-1 justify-center pb-24' : 'py-20',
      )}
    >
      <View className="h-16 w-16 items-center justify-center rounded-full bg-muted">
        <IconSymbol name={icon} size={28} color={colors.mutedForeground} />
      </View>
      <Text variant="heading" className="text-center">
        {title}
      </Text>
      {caption && (
        <Text variant="body" className="text-center text-muted-foreground">
          {caption}
        </Text>
      )}
      {children}
    </View>
  )
}
