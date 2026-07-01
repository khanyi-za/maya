import type { MobileOrderStatus } from '@/lib/api-client'
import type { BadgeTone } from '@/components/ui/badge'

// SINGLE SOURCE OF TRUTH for order-status label + badge tone. Reused by the
// orders list, track-order, order-success, and notifications so status colours
// never diverge. (Azure brand → SHIPPED reads naturally blue.)

export const ORDER_STATUS: Record<MobileOrderStatus, { label: string; tone: BadgeTone }> = {
  PENDING_PAYMENT: { label: 'Awaiting payment', tone: 'warning' },
  PAYMENT_FAILED: { label: 'Payment failed', tone: 'danger' },
  CONFIRMED: { label: 'Confirmed', tone: 'info' },
  PREPARING: { label: 'Preparing', tone: 'info' },
  SHIPPED: { label: 'Shipped', tone: 'brand' },
  DELIVERED: { label: 'Delivered', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
}
