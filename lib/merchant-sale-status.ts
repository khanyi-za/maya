import type { MerchantSaleStatus } from '@/lib/api-client'
import type { BadgeTone } from '@/components/ui/badge'

// Label + badge tone for the MERCHANT dashboard's sale statuses. These are the
// raw nuwa OrderStatus values — deliberately separate from lib/order-status.ts,
// which is keyed on the buyer-consolidated MobileOrderStatus. UI copy says
// "sale"; identifiers stay "order" (sales-vocabulary convention).

export const MERCHANT_SALE_STATUS: Record<
  MerchantSaleStatus,
  { label: string; tone: BadgeTone }
> = {
  PENDING: { label: 'Awaiting payment', tone: 'warning' },
  CONFIRMED: { label: 'New sale', tone: 'info' },
  PROCESSING: { label: 'Preparing', tone: 'info' },
  READY_FOR_DISPATCH: { label: 'Ready for courier', tone: 'brand' },
  DISPATCHED: { label: 'With courier', tone: 'brand' },
  IN_TRANSIT: { label: 'With courier', tone: 'brand' },
  DELIVERED: { label: 'Delivered', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
  REFUND_REQUESTED: { label: 'Refund requested', tone: 'warning' },
  REFUNDED: { label: 'Refunded', tone: 'neutral' },
}
