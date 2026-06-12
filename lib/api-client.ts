// Yiiva REST API Client
// This file contains all API endpoint functions for the mobile app

import { Platform } from 'react-native';
import { homeFixtures } from './home-fixtures';
import { getOptionalAuthHeader } from './api';

// =============================================================================
// API CONFIGURATION
// =============================================================================

/**
 * While true, the Home read endpoints resolve bundled doc-shaped fixtures
 * instead of hitting the network. Off since 2026-06-11 — Home runs against
 * the live nuwa /api surface. Flip back on only for offline UI work.
 */
export const USE_FIXTURES = false;

/**
 * Platform-specific API base URLs
 * - iOS Simulator: Can access localhost directly
 * - Android Emulator: Must use 10.0.2.2 to reach host machine
 * - Physical Device: Use your computer's local IP address
 */
const API_BASE_URL = Platform.select({
  ios: 'http://localhost:3000/api',
  android: 'http://10.0.2.2:3000/api',
  default: 'http://localhost:3000/api',
});

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Gender taxonomy accepted by the API (docs/api-conventions.md, products.md §1).
 * Note: the app's FilterContext also has 'home-lifestyle', which has no backend
 * taxonomy yet — see open-questions §P-4. Callers map that case before calling.
 */
export type GenderType = 'women' | 'men' | 'unisex';

/**
 * Cursor-based pagination envelope (docs/api-conventions.md §Pagination).
 */
export interface CursorPagination {
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Standard API response wrapper from NestJS backend
 */
interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
    nextCursor?: string | null;
  };
}

/**
 * API error response structure
 */
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

/**
 * Product data structure matching database schema
 */
export interface Product {
  id: string;
  name: string;
  price: number; // integer ZAR cents (e.g. 89900 = R899.00)
  currency: string; // 'ZAR'
  primaryImage: string; // absolute CDN URL
  merchant: {
    id: string;
    username: string;
    displayName: string;
    logo: string | null;
    isVerified: boolean;
    isFollowedByMe?: boolean; // present only on authed requests
  };
  category: string;
  clothingType: string;
  genderType: string;
  // Personalised fields — present only on authed requests; absent treated as false.
  isLikedByMe?: boolean;
  isBookmarkedByMe?: boolean;
}

/**
 * Carousel product (simplified for horizontal lists)
 */
export interface CarouselProduct {
  id: string;
  name: string;
  price: number; // integer ZAR cents
  currency: string; // 'ZAR'
  image: string; // absolute CDN URL
  merchant: {
    displayName: string;
  };
}

/**
 * Category chip / tile (docs/api/categories.md §1).
 */
export interface Category {
  slug: string;
  displayName: string;
  image: string | null; // absolute CDN URL; null -> text-only chip
  productCount?: number;
  order: number;
}

/**
 * Trending merchant card (docs/api/merchants.md §1).
 */
export interface TrendingMerchant {
  id: string;
  username: string;
  displayName: string;
  logo: string | null;
  followerCount: number;
  isVerified: boolean;
  isFollowedByMe?: boolean;
}

/**
 * Brand row in the A–Z Shop directory (docs/api/merchants.md §4).
 */
export interface DirectoryMerchant {
  id: string;
  username: string;
  displayName: string;
  logo: string | null;
  isVerified: boolean;
  followerCount: number;
  productCount: number;
  isFollowedByMe?: boolean;
}

/**
 * Server cart line item (docs/api/cart.md §2). `size` is the variant size
 * label; `available`/`stockCount` reflect live stock at read time.
 */
export interface ServerCartItem {
  id: string;
  productId: string;
  variantId: string | null;
  name: string;
  image: string | null;
  size: string | null;
  quantity: number;
  unitPrice: number; // integer ZAR cents
  lineTotal: number; // integer ZAR cents
  available: boolean;
  stockCount: number;
  priceChanged: boolean; // always false in v1 (no add-time price column)
  merchant: {
    id: string;
    username: string;
    displayName: string;
  };
}

/**
 * Full server cart (GET /api/cart). Guests get the empty shape (id null).
 */
export interface ServerCart {
  id: string | null;
  itemCount: number;
  subtotal: number; // integer ZAR cents
  currency: string;
  items: ServerCartItem[];
}

/**
 * Buyer delivery address (docs/api/addresses.md). v1 is ZA-only.
 */
export interface Address {
  id: string;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  label: string | null;
}

export interface CreateAddressInput {
  label?: string;
  recipientName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  province: string;
  postalCode: string;
  isDefault?: boolean;
}

/**
 * Checkout totals (POST /api/checkout/quote). VAT-INCLUSIVE: `tax` is the
 * portion already inside `total`, never added on top (open-questions §D6).
 */
export interface CheckoutQuote {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
}

/**
 * POST /api/orders result — the maya "order" is the PaymentGroup. `payment`
 * carries the PayFast form payload for WebView auto-submit.
 */
export interface PlaceOrderResult {
  order: {
    id: string;
    status: string;
    total: number;
    currency: string;
  };
  payment: {
    type: 'redirect';
    paymentUrl: string;
    actionUrl: string;
    fields: Record<string, string>;
    returnUrl: string;
  };
}

/**
 * Consolidated buyer order (GET /api/orders/:id) — one maya order per
 * checkout (= nuwa PaymentGroup), with merged per-store items.
 */
export type MobileOrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAYMENT_FAILED'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export interface OrderItem {
  id: string;
  productId: string;
  variantId: string | null;
  name: string;
  image: string | null;
  size: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  merchant: {
    id: string;
    username: string;
    displayName: string;
  };
}

export interface MobileOrder {
  id: string;
  orderNumber: string;
  status: MobileOrderStatus;
  /** UI hint gating the Cancel button (O-3); backend stays more permissive. */
  cancellationEligibleUntil: string | null;
  statusHistory: { status: string; at: string }[];
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  tax: number; // VAT portion already included in total
  discount: number;
  total: number;
  currency: string;
  shipping: {
    method: string;
    address: {
      recipientName: string;
      phone: string;
      line1: string;
      line2: string | null;
      city: string;
      province: string;
      postalCode: string;
      country: string;
    };
    rate: {
      name: string;
      courier: string;
      minDays: number | null;
      maxDays: number | null;
    };
    estimatedDelivery: string | null;
  };
  payment: {
    method: string;
    [key: string]: unknown;
  };
}

export interface TrackingEvent {
  at: string;
  location: string | null;
  description: string | null;
}

/**
 * Courier tracking (GET /api/orders/:id/tracking). Served from webhook-fed
 * local data — 404 TRACKING_NOT_AVAILABLE until the courier collects.
 */
export interface OrderTracking {
  trackingNumber: string;
  courier: string;
  courierTrackingUrl: string | null;
  currentStatus:
    | 'pre_shipment'
    | 'in_transit'
    | 'out_for_delivery'
    | 'delivered'
    | 'exception'
    | string;
  lastEvent: TrackingEvent | null;
  estimatedDeliveryFrom: string | null;
  estimatedDeliveryTo: string | null;
  events: TrackingEvent[];
}

/**
 * Wishlist entry (GET /api/me/bookmarks — docs/api/social.md §4).
 * `priceChanged` is always false in v1 (no add-time price column).
 */
export interface Bookmark {
  bookmarkedAt: string;
  priceChanged: boolean;
  priceAtBookmark: number;
  product: Product & { available: boolean };
}

/**
 * Chat shapes (docs/api/chat.md). REST owns writes; the socket.io /chat
 * namespace fans out message:new / read events (CH-1).
 */
export interface ChatMessage {
  id: string;
  conversationId: string;
  sender: 'user' | 'merchant';
  senderId: string;
  text: string | null;
  attachments: unknown[];
  orderRef: string | null;
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
}

export interface Conversation {
  id: string;
  merchant: {
    id: string;
    username: string;
    displayName: string;
    logo: string | null;
    isVerified: boolean;
    messagingEnabled: boolean;
    avgResponseTime: string | null;
  };
  lastReadAt: string | null;
  unreadCount: number;
  createdAt: string;
}

/**
 * Lightweight cart badge payload (docs/api/cart.md §1).
 */
export interface CartSummary {
  itemCount: number;
  subtotal: number; // integer ZAR cents
  currency: string; // 'ZAR'
}

/**
 * Media file in product detail
 */
export interface Media {
  url: string | null;
  type: 'image' | 'video';
  filename?: string; // legacy fixture field — the API doesn't send it
}

/**
 * Extended merchant information for product detail
 */
export interface MerchantDetail {
  id: string;
  username: string;
  displayName: string;
  logo: string | null;
  isVerified: boolean;
  bio: string | null;
  location: string | null;
}

/**
 * Full merchant profile (GET /api/merchants/:username — docs/api/merchants.md §2).
 * `status` is ACTIVE for live brands; SUSPENDED/CLOSED render a placeholder
 * (MP-10). `heroMedia` are absolute CDN URLs (video URLs contain /video/).
 */
export interface MerchantProfile {
  id: string;
  username: string;
  displayName: string;
  logo: string | null;
  heroMedia: string[];
  bio: string | null;
  location: string | null;
  isVerified: boolean;
  status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED' | string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  messagingEnabled: boolean;
  contact: { email: string | null };
  isFollowedByMe?: boolean;
}

/**
 * Sellable variant on a product (docs/api/products.md §4). When `variants` is
 * non-empty, Add-to-Cart must send a variantId; bare products send none.
 */
export interface ProductVariant {
  id: string;
  size: string;
  sku: string | null;
  available: boolean;
  stockCount: number;
}

/**
 * Full product detail (GET /api/products/:id). Personalised fields present
 * only on authed requests. `likeCount`/`isLikedByMe` are placeholder zeros in
 * v1 (likes are local-only — open-questions §S-1).
 */
export interface ProductDetail {
  id: string;
  name: string;
  price: number; // integer ZAR cents
  currency: string;
  description: string | null;
  category: string | null; // primary category slug
  clothingType: string | null;
  genderType: string;
  smartCategories: string[];
  variants: ProductVariant[];
  stock: { available: boolean };
  media: Media[];
  merchant: MerchantDetail & { isFollowedByMe?: boolean };
  isLikedByMe?: boolean;
  isBookmarkedByMe?: boolean;
  likeCount?: number;
  returnPolicy: {
    windowDays: number;
    type: string;
    displayText: string;
  };
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Custom API error class
 */
export class APIError extends Error {
  constructor(
    public code: string,
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// =============================================================================
// CORE FETCH WRAPPER
// =============================================================================

/**
 * Core fetch function with error handling
 * Handles all HTTP requests to the NestJS backend
 */
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    // Best-effort auth — personalised fields appear when signed in.
    const authHeader = await getOptionalAuthHeader();
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
        ...options.headers,
      },
    });

    // Parse JSON response
    const json: ApiResponse<T> | ApiErrorResponse = await response.json();

    // Handle HTTP errors
    if (!response.ok) {
      const errorResponse = json as ApiErrorResponse;
      throw new APIError(
        errorResponse.error?.code || 'UNKNOWN_ERROR',
        errorResponse.error?.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status
      );
    }

    // Handle API-level errors
    if (!json.success) {
      const errorResponse = json as ApiErrorResponse;
      throw new APIError(
        errorResponse.error?.code || 'API_ERROR',
        errorResponse.error?.message || 'An unknown error occurred'
      );
    }

    // Return the data payload
    return (json as ApiResponse<T>).data;
  } catch (error) {
    // Network errors or fetch failures
    if (error instanceof APIError) {
      throw error;
    }

    // Generic network error
    throw new APIError(
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'Network request failed'
    );
  }
}

/**
 * Like fetchAPI, but keeps the envelope's top-level `pagination` block —
 * for cursor-paginated lists (feed) where the caller drives infinite scroll.
 */
async function fetchAPIPaginated<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T; pagination: CursorPagination }> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const authHeader = await getOptionalAuthHeader();
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
        ...options.headers,
      },
    });

    const json: ApiResponse<T> | ApiErrorResponse = await response.json();

    if (!response.ok || !json.success) {
      const errorResponse = json as ApiErrorResponse;
      throw new APIError(
        errorResponse.error?.code || 'UNKNOWN_ERROR',
        errorResponse.error?.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status
      );
    }

    const ok = json as ApiResponse<T>;
    return {
      data: ok.data,
      pagination: {
        limit: ok.pagination?.limit ?? 20,
        nextCursor: ok.pagination?.nextCursor ?? null,
        hasMore: ok.pagination?.hasMore ?? false,
      },
    };
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'Network request failed'
    );
  }
}

// =============================================================================
// API ENDPOINTS - HOME SCREEN
// =============================================================================

/**
 * Get main product feed for home screen
 * Filters by genderType from FeedTabs (women/men/unisex)
 *
 * @param genderType - Filter by gender type (from FeedTabs)
 * @param limit - Number of products to return (default 20)
 * @param offset - Pagination offset (default 0)
 *
 * Backend endpoint: GET /api/products/feed
 * Database query: products JOIN merchants WHERE genderType = X
 */
export async function getProductFeed(params: {
  genderType: GenderType;
  category?: string;
  limit?: number;
  cursor?: string;
}): Promise<{ products: Product[]; pagination: CursorPagination }> {
  if (USE_FIXTURES) {
    const products = homeFixtures.feed(params.genderType, params.category);
    return {
      products,
      pagination: { limit: products.length, nextCursor: null, hasMore: false },
    };
  }

  const queryParams = new URLSearchParams({
    genderType: params.genderType,
    limit: String(params.limit || 20),
  });
  if (params.category) queryParams.append('category', params.category);
  if (params.cursor) queryParams.append('cursor', params.cursor);

  const { data, pagination } = await fetchAPIPaginated<{ products: Product[] }>(
    `/products/feed?${queryParams}`
  );
  return { products: data.products, pagination };
}

/**
 * Get featured products for horizontal carousel
 * Returns random 6 products from entire catalog (no filters)
 *
 * @param limit - Number of products to return (default 6)
 *
 * Backend endpoint: GET /api/products/featured
 * Database query: products JOIN merchants ORDER BY RANDOM() LIMIT 6
 */
export async function getFeaturedProducts(params?: {
  limit?: number;
}): Promise<{ products: CarouselProduct[] }> {
  const queryParams = new URLSearchParams({
    limit: String(params?.limit || 6),
  });

  return fetchAPI<{ products: CarouselProduct[] }>(`/products/featured?${queryParams}`);
}

/**
 * Get new arrivals for horizontal carousel
 * Returns newest products filtered by genderType
 *
 * @param genderType - Filter by gender type (from FeedTabs)
 * @param limit - Number of products to return (default 6)
 *
 * Backend endpoint: GET /api/products/new-arrivals
 * Database query: products JOIN merchants WHERE genderType = X ORDER BY createdAt DESC
 */
export async function getNewArrivals(params: {
  genderType: GenderType;
  limit?: number;
}): Promise<{ products: CarouselProduct[] }> {
  if (USE_FIXTURES) {
    return { products: homeFixtures.newArrivals(params.genderType) };
  }

  const queryParams = new URLSearchParams({
    genderType: params.genderType,
    limit: String(params.limit || 6),
  });

  return fetchAPI<{ products: CarouselProduct[] }>(`/products/new-arrivals?${queryParams}`);
}

/**
 * Get categories for the chip rail / Shop grid.
 * Backend endpoint: GET /api/categories  (docs/api/categories.md §1)
 */
export async function getCategories(params: {
  genderType: GenderType;
}): Promise<{ categories: Category[] }> {
  if (USE_FIXTURES) {
    return { categories: homeFixtures.categories(params.genderType) };
  }

  const queryParams = new URLSearchParams({ genderType: params.genderType });
  return fetchAPI<{ categories: Category[] }>(`/categories?${queryParams}`);
}

/**
 * Get trending merchants for the Home "Trending Brands" carousel.
 * Backend endpoint: GET /api/merchants/trending  (docs/api/merchants.md §1)
 */
export async function getTrendingMerchants(params?: {
  genderType?: GenderType;
  limit?: number;
}): Promise<{ merchants: TrendingMerchant[] }> {
  if (USE_FIXTURES) {
    return { merchants: homeFixtures.trendingMerchants() };
  }

  const queryParams = new URLSearchParams();
  if (params?.genderType) queryParams.append('genderType', params.genderType);
  if (params?.limit) queryParams.append('limit', String(params.limit));
  const qs = queryParams.toString();
  return fetchAPI<{ merchants: TrendingMerchant[] }>(`/merchants/trending${qs ? `?${qs}` : ''}`);
}

/**
 * Get the lightweight cart summary for the header badge.
 * Backend endpoint: GET /api/cart/summary  (docs/api/cart.md §1)
 * Auth: optional (guest via X-Cart-Session). 404 -> treat as empty cart.
 */
export async function getCartSummary(): Promise<CartSummary> {
  if (USE_FIXTURES) {
    return homeFixtures.cartSummary();
  }

  return fetchAPI<CartSummary>(`/cart/summary`);
}

/**
 * A–Z brand directory for the Shop tab.
 * Backend endpoint: GET /api/merchants (docs/api/merchants.md §4).
 * Default sort is name_asc; `lettersWithBrands` drives the alphabet index.
 */
export async function getMerchantDirectory(params?: {
  genderType?: GenderType;
  letter?: string;
  sort?: 'name_asc' | 'name_desc' | 'newest' | 'popularity';
  limit?: number;
  cursor?: string;
}): Promise<{
  merchants: DirectoryMerchant[];
  lettersWithBrands: string[];
  pagination: CursorPagination;
}> {
  const queryParams = new URLSearchParams();
  if (params?.genderType) queryParams.append('genderType', params.genderType);
  if (params?.letter) queryParams.append('letter', params.letter);
  if (params?.sort) queryParams.append('sort', params.sort);
  if (params?.limit) queryParams.append('limit', String(params.limit));
  if (params?.cursor) queryParams.append('cursor', params.cursor);
  const qs = queryParams.toString();

  const { data, pagination } = await fetchAPIPaginated<{
    merchants: DirectoryMerchant[];
    lettersWithBrands: string[];
  }>(`/merchants${qs ? `?${qs}` : ''}`);
  return {
    merchants: data.merchants,
    lettersWithBrands: data.lettersWithBrands,
    pagination,
  };
}

/**
 * Full cart (docs/api/cart.md §2). Auth optional — guests get the empty shape.
 * Backend endpoint: GET /api/cart
 */
export async function getCart(): Promise<{ cart: ServerCart }> {
  return fetchAPI<{ cart: ServerCart }>(`/cart`);
}

/**
 * Add a line to the cart (auth required; reserves stock). `variantId` is
 * required when the product has variants. 409 OUT_OF_STOCK on stock races.
 * Backend endpoint: POST /api/cart/items (docs/api/cart.md §3)
 */
export async function addCartItem(params: {
  productId: string;
  variantId?: string;
  quantity?: number;
}): Promise<{ cart: ServerCart }> {
  return fetchAPI<{ cart: ServerCart }>(`/cart/items`, {
    method: 'POST',
    body: JSON.stringify({
      productId: params.productId,
      ...(params.variantId ? { variantId: params.variantId } : {}),
      quantity: params.quantity ?? 1,
    }),
  });
}

/**
 * Change a line's quantity (reserve/release delta). 409 OUT_OF_STOCK.
 * Backend endpoint: PATCH /api/cart/items/:itemId (docs/api/cart.md §4)
 */
export async function updateCartItem(
  itemId: string,
  quantity: number
): Promise<{ cart: ServerCart }> {
  return fetchAPI<{ cart: ServerCart }>(`/cart/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity }),
  });
}

/**
 * Remove a line (releases its reservation).
 * Backend endpoint: DELETE /api/cart/items/:itemId (docs/api/cart.md §5)
 */
export async function removeCartItem(itemId: string): Promise<{ cart: ServerCart }> {
  return fetchAPI<{ cart: ServerCart }>(`/cart/items/${itemId}`, {
    method: 'DELETE',
  });
}

/**
 * Clear the cart (releases all reservations).
 * Backend endpoint: DELETE /api/cart (docs/api/cart.md §6)
 */
export async function clearServerCart(): Promise<{ cart: ServerCart }> {
  return fetchAPI<{ cart: ServerCart }>(`/cart`, { method: 'DELETE' });
}

/**
 * Buyer addresses CRUD (auth required) — docs/api/addresses.md.
 */
export async function getAddresses(): Promise<{ addresses: Address[] }> {
  return fetchAPI<{ addresses: Address[] }>(`/me/addresses`);
}

export async function createAddress(
  input: CreateAddressInput
): Promise<{ address: Address }> {
  return fetchAPI<{ address: Address }>(`/me/addresses`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function setDefaultAddress(id: string): Promise<{ address: Address }> {
  return fetchAPI<{ address: Address }>(`/me/addresses/${id}/default`, {
    method: 'PATCH',
  });
}

/**
 * Server-computed checkout totals for the selected address (auth required).
 * Shipping is a real per-store courier rate. Backend: POST /api/checkout/quote
 */
export async function getCheckoutQuote(addressId: string): Promise<CheckoutQuote> {
  return fetchAPI<CheckoutQuote>(`/checkout/quote`, {
    method: 'POST',
    body: JSON.stringify({ addressId }),
  });
}

/**
 * Commit the checkout (auth required). Creates the orders + PaymentGroup and
 * returns the PayFast redirect payload. 409 STOCK_DRIFT / CART_EMPTY.
 * Backend: POST /api/orders (docs/api/orders.md §1)
 */
export async function placeOrder(params: {
  addressId: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<PlaceOrderResult> {
  return fetchAPI<PlaceOrderResult>(`/orders`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * Consolidated order detail (auth required; 404 on cross-user access).
 * Backend: GET /api/orders/:id (docs/api/orders.md §2)
 */
export async function getOrder(orderId: string): Promise<{ order: MobileOrder }> {
  return fetchAPI<{ order: MobileOrder }>(`/orders/${orderId}`);
}

/**
 * Buyer-cancel the whole order (every cancellable child order). v1 does NOT
 * auto-refund. 409 ORDER_NOT_CANCELLABLE once fulfilment has started.
 * Backend: POST /api/orders/:id/cancel (docs/api/orders.md §5)
 */
export async function cancelOrder(
  orderId: string,
  reason?: string
): Promise<{ order: { id: string; status: string; cancelledAt: string } }> {
  return fetchAPI(`/orders/${orderId}/cancel`, {
    method: 'POST',
    body: JSON.stringify(reason ? { reason } : {}),
  });
}

/**
 * Courier tracking for an order (auth required). 404 TRACKING_NOT_AVAILABLE
 * before a shipment exists. Backend: GET /api/orders/:id/tracking
 */
export async function getOrderTracking(
  orderId: string
): Promise<{ tracking: OrderTracking }> {
  return fetchAPI<{ tracking: OrderTracking }>(`/orders/${orderId}/tracking`);
}

/**
 * The signed-in user's wishlist (auth required, cursor-paginated).
 * Backend: GET /api/me/bookmarks (docs/api/social.md §4)
 */
export async function getBookmarks(params?: {
  sort?: 'newest' | 'oldest';
  limit?: number;
  cursor?: string;
}): Promise<{ bookmarks: Bookmark[]; pagination: CursorPagination }> {
  const queryParams = new URLSearchParams();
  if (params?.sort) queryParams.append('sort', params.sort);
  if (params?.limit) queryParams.append('limit', String(params.limit));
  if (params?.cursor) queryParams.append('cursor', params.cursor);
  const qs = queryParams.toString();

  const { data, pagination } = await fetchAPIPaginated<{ bookmarks: Bookmark[] }>(
    `/me/bookmarks${qs ? `?${qs}` : ''}`
  );
  return { bookmarks: data.bookmarks, pagination };
}

/**
 * Idempotent bookmark toggle (auth required) — = WishlistItem server-side.
 * Backend: PUT/DELETE /api/products/:id/bookmark (docs/api/social.md §2)
 */
export async function addBookmark(productId: string): Promise<void> {
  await fetchAPI(`/products/${productId}/bookmark`, { method: 'PUT' });
}

export async function removeBookmark(productId: string): Promise<void> {
  await fetchAPI(`/products/${productId}/bookmark`, { method: 'DELETE' });
}

/**
 * Get-or-create the conversation with a merchant (auth required, idempotent).
 * Backend: GET /api/conversations/by-merchant/:username (docs/api/chat.md §1)
 */
export async function getConversationByMerchant(
  username: string
): Promise<{ conversation: Conversation }> {
  return fetchAPI<{ conversation: Conversation }>(
    `/conversations/by-merchant/${username}`
  );
}

/**
 * Message history (createdAt ASC). `before` pages back; `after` fetches newer.
 * Backend: GET /api/conversations/:id/messages (docs/api/chat.md §2)
 */
export async function getChatMessages(
  conversationId: string,
  params?: { limit?: number; before?: string; after?: string }
): Promise<{ messages: ChatMessage[]; pagination: CursorPagination }> {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append('limit', String(params.limit));
  if (params?.before) queryParams.append('before', params.before);
  if (params?.after) queryParams.append('after', params.after);
  const qs = queryParams.toString();

  const { data, pagination } = await fetchAPIPaginated<{ messages: ChatMessage[] }>(
    `/conversations/${conversationId}/messages${qs ? `?${qs}` : ''}`
  );
  return { messages: data.messages, pagination };
}

/**
 * Send a message. The Idempotency-Key header makes retries safe — replays
 * return the original message. Backend: POST /api/conversations/:id/messages
 */
export async function sendChatMessage(
  conversationId: string,
  body: { text?: string; attachments?: unknown[]; orderRef?: string },
  idempotencyKey: string
): Promise<{ message: ChatMessage }> {
  return fetchAPI<{ message: ChatMessage }>(
    `/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(body),
    }
  );
}

/** Mark the conversation read (fire-and-forget). PATCH /api/conversations/:id/read */
export async function markConversationRead(conversationId: string): Promise<void> {
  await fetchAPI(`/conversations/${conversationId}/read`, { method: 'PATCH' });
}

/** Report the conversation for moderation. POST /api/conversations/:id/report */
export async function reportConversation(
  conversationId: string,
  reason: 'harassment' | 'scam' | 'spam' | 'other',
  details?: string
): Promise<void> {
  await fetchAPI(`/conversations/${conversationId}/report`, {
    method: 'POST',
    body: JSON.stringify({ reason, ...(details ? { details } : {}) }),
  });
}

/**
 * Idempotent merchant follow toggle (auth required) — = StoreFollower.
 * Takes the merchant **id**, not the username.
 * Backend: PUT/DELETE /api/merchants/:id/follow (docs/api/social.md §3)
 */
export async function followMerchant(
  merchantId: string
): Promise<{ following: boolean; followerCount: number }> {
  return fetchAPI(`/merchants/${merchantId}/follow`, { method: 'PUT' });
}

export async function unfollowMerchant(
  merchantId: string
): Promise<{ following: boolean; followerCount: number }> {
  return fetchAPI(`/merchants/${merchantId}/follow`, { method: 'DELETE' });
}

// =============================================================================
// API ENDPOINTS - PRODUCT DETAIL SCREEN
// =============================================================================

/**
 * Get complete product details by ID
 * Includes all media files (images + videos) and extended merchant information
 *
 * @param productId - Product ID to fetch
 *
 * Backend endpoint: GET /api/products/:id
 * Database query: products JOIN merchants WHERE id = X
 */
export async function getProductById(productId: string): Promise<{ product: ProductDetail }> {
  return fetchAPI<{ product: ProductDetail }>(`/products/${productId}`);
}

/**
 * Get similar products based on gender category
 * Returns products from same genderType, excluding current product
 * Results are randomized for variety
 *
 * @param productId - Product ID to find similar items for
 * @param limit - Number of similar items to return (default 6, max 20)
 *
 * Backend endpoint: GET /api/products/:id/similar
 * Database query: products JOIN merchants WHERE genderType = X AND id != Y ORDER BY RANDOM()
 */
export async function getSimilarProducts(params: {
  productId: string;
  limit?: number;
}): Promise<{ products: CarouselProduct[] }> {
  const queryParams = new URLSearchParams({
    limit: String(params.limit || 6),
  });

  return fetchAPI<{ products: CarouselProduct[] }>(
    `/products/${params.productId}/similar?${queryParams}`
  );
}

/**
 * Record a product view (fire-and-forget analytics, Phalo consumes later).
 * Backend endpoint: POST /api/products/:id/view  (docs/api/products.md §6)
 */
export async function recordProductView(productId: string): Promise<void> {
  await fetchAPI<{ recorded: boolean }>(`/products/${productId}/view`, {
    method: 'POST',
  });
}

// =============================================================================
// API ENDPOINTS - MERCHANT/ARTIST SCREEN
// =============================================================================

/**
 * Get merchant profile by username
 * Returns full merchant data for artist profile page
 *
 * @param username - Merchant username (e.g., 'tol_thema', 'suhu')
 *
 * Backend endpoint: GET /api/merchants/:username
 * Database query: merchants WHERE username = X
 */
export async function getMerchantByUsername(username: string): Promise<{ merchant: MerchantProfile }> {
  return fetchAPI<{ merchant: MerchantProfile }>(`/merchants/${username}`);
}

/**
 * Get merchant products with optional category filtering
 * Returns products and available categories for the merchant
 *
 * @param username - Merchant username (e.g., 'tol_thema', 'suhu')
 * @param params - Optional filtering and pagination parameters
 *
 * Backend endpoint: GET /api/merchants/:username/products
 * Database query: products WHERE merchantId = X AND clothingType = Y
 */
export async function getMerchantProducts(
  username: string,
  params?: {
    clothingType?: string;
    limit?: number;
    cursor?: string;
  }
): Promise<{
  products: Product[];
  categories: string[];
  pagination: CursorPagination;
}> {
  const queryParams = new URLSearchParams();

  if (params?.clothingType && params.clothingType !== 'All') {
    queryParams.append('clothingType', params.clothingType);
  }
  if (params?.limit) {
    queryParams.append('limit', String(params.limit));
  }
  if (params?.cursor) {
    queryParams.append('cursor', params.cursor);
  }

  const queryString = queryParams.toString();
  const endpoint = `/merchants/${username}/products${queryString ? `?${queryString}` : ''}`;

  const { data, pagination } = await fetchAPIPaginated<{
    products: Product[];
    categories: string[];
  }>(endpoint);
  return { products: data.products, categories: data.categories, pagination };
}

/**
 * Record a merchant profile view (fire-and-forget analytics).
 * Backend endpoint: POST /api/merchants/:id/view — note: takes the merchant
 * **id**, not the username.
 */
export async function recordMerchantView(merchantId: string): Promise<void> {
  await fetchAPI<{ recorded: boolean }>(`/merchants/${merchantId}/view`, {
    method: 'POST',
  });
}

// =============================================================================
// API ENDPOINTS - SEARCH
// =============================================================================

interface SearchPage {
  products: Product[];
  pagination: CursorPagination;
}

async function searchRequest(
  endpoint: string,
  base: Record<string, string>,
  params?: {
    genderType?: GenderType;
    category?: string;
    limit?: number;
    cursor?: string;
  }
): Promise<SearchPage> {
  const queryParams = new URLSearchParams(base);
  if (params?.genderType) queryParams.append('genderType', params.genderType);
  if (params?.category) queryParams.append('category', params.category);
  queryParams.append('limit', String(params?.limit || 20));
  if (params?.cursor) queryParams.append('cursor', params.cursor);

  const { data, pagination } = await fetchAPIPaginated<{ products: Product[] }>(
    `${endpoint}?${queryParams}`
  );
  return { products: data.products, pagination };
}

/**
 * Universal search — q ORs across product title / merchant name / category
 * name / tag name. Backend endpoint: GET /api/search (docs/api/search.md §1).
 */
export async function searchProducts(params: {
  query: string;
  genderType?: GenderType;
  category?: string;
  limit?: number;
  cursor?: string;
}): Promise<SearchPage> {
  return searchRequest('/search', { q: params.query }, params);
}

/**
 * Scoped search variants (same card shape) — GET /api/search/category,
 * /search/smart-category, /search/merchant (docs/api/search.md §2-4).
 */
export async function searchByCategory(params: {
  category: string;
  genderType?: GenderType;
  limit?: number;
  cursor?: string;
}): Promise<SearchPage> {
  return searchRequest(
    '/search/category',
    { category: params.category },
    { genderType: params.genderType, limit: params.limit, cursor: params.cursor }
  );
}

export async function searchBySmartCategory(params: {
  smartCategory: string;
  genderType?: GenderType;
  limit?: number;
  cursor?: string;
}): Promise<SearchPage> {
  return searchRequest(
    '/search/smart-category',
    { smartCategory: params.smartCategory },
    { genderType: params.genderType, limit: params.limit, cursor: params.cursor }
  );
}

export async function searchByMerchantName(params: {
  merchantName: string;
  genderType?: GenderType;
  limit?: number;
  cursor?: string;
}): Promise<SearchPage> {
  return searchRequest(
    '/search/merchant',
    { merchantName: params.merchantName },
    { genderType: params.genderType, limit: params.limit, cursor: params.cursor }
  );
}

/**
 * Trending search terms (v1 = top tags, rendered as #Tag chips).
 * Backend endpoint: GET /api/search/suggestions (docs/api/search.md §5).
 */
export async function getSearchSuggestions(): Promise<{
  trending: string[];
  suggestions: string[];
}> {
  return fetchAPI<{ trending: string[]; suggestions: string[] }>(
    '/search/suggestions'
  );
}

/**
 * Fire-and-forget search analytics (docs/api/search.md §6). Two variants:
 * settled query ({q, resultCount}) and result-card click
 * ({q, clickedProductId, position}) — the ranking feedback signal
 * (nuwa docs/phalo-engine/phalo-search.md S2).
 * Backend endpoint: POST /api/search/track
 */
export async function trackSearch(params: {
  q: string;
  genderType?: GenderType;
  resultCount?: number;
  clickedProductId?: string;
  position?: number;
}): Promise<void> {
  await fetchAPI<{ recorded: boolean }>('/search/track', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * Main API object - namespaced for better organization
 */
export const api = {
  // Home Screen
  getProductFeed,
  getFeaturedProducts,
  getNewArrivals,
  getCategories,
  getTrendingMerchants,
  getCartSummary,
  getMerchantDirectory,

  // Cart Screen
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearServerCart,

  // Checkout Screen
  getAddresses,
  createAddress,
  setDefaultAddress,
  getCheckoutQuote,
  placeOrder,

  // Orders
  getOrder,
  cancelOrder,
  getOrderTracking,

  // Wishlist
  getBookmarks,
  addBookmark,
  removeBookmark,
  followMerchant,
  unfollowMerchant,

  // Chat
  getConversationByMerchant,
  getChatMessages,
  sendChatMessage,
  markConversationRead,
  reportConversation,

  // Product Detail Screen
  getProductById,
  getSimilarProducts,
  recordProductView,

  // Artist Profile Screen
  getMerchantByUsername,
  getMerchantProducts,
  recordMerchantView,

  // Search Screen
  searchProducts,
  searchByCategory,
  searchBySmartCategory,
  searchByMerchantName,
  getSearchSuggestions,
  trackSearch,
};
