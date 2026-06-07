// Yiiva REST API Client
// This file contains all API endpoint functions for the mobile app

import { Platform } from 'react-native';

// =============================================================================
// API CONFIGURATION
// =============================================================================

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
  price: number;
  currency: string;
  primaryImage: string; // Filename from selectedFiles[0]
  merchant: {
    id: string;
    username: string;
    displayName: string;
    logo: string | null;
    isVerified: boolean;
  };
  category: string;
  clothingType: string;
  genderType: string;
}

/**
 * Carousel product (simplified for horizontal lists)
 */
export interface CarouselProduct {
  id: string;
  name: string;
  price: number;
  currency: string;
  image: string; // Filename from selectedFiles[0]
  merchant: {
    displayName: string;
  };
}

/**
 * Media file in product detail
 */
export interface Media {
  url: string | null;
  type: 'image' | 'video';
  filename: string;
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
 * Full merchant profile for artist page
 */
export interface MerchantProfile {
  id: string;
  username: string;
  displayName: string;
  email: string;
  bio: string | null;
  location: string;
  logo: string | null;
  heroMedia: string[];
  followerCount: number;
  followingCount: number;
  postCount: number;
  isVerified: boolean;
}

/**
 * Full product detail with all media files
 */
export interface ProductDetail {
  id: string;
  name: string;
  price: number;
  currency: string;
  description: string | null;
  category: string;
  clothingType: string;
  genderType: string;
  size: string | null;
  inventoryType: string;
  leadTime: string | null;
  media: Media[];
  merchant: MerchantDetail;
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
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
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
  genderType: 'women' | 'men' | 'unisex';
  limit?: number;
  offset?: number;
}): Promise<{ products: Product[] }> {
  const queryParams = new URLSearchParams({
    genderType: params.genderType,
    limit: String(params.limit || 20),
    offset: String(params.offset || 0),
  });

  return fetchAPI<{ products: Product[] }>(`/products/feed?${queryParams}`);
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
  genderType: 'women' | 'men' | 'unisex';
  limit?: number;
}): Promise<{ products: CarouselProduct[] }> {
  const queryParams = new URLSearchParams({
    genderType: params.genderType,
    limit: String(params.limit || 6),
  });

  return fetchAPI<{ products: CarouselProduct[] }>(`/products/new-arrivals?${queryParams}`);
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
    offset?: number;
  }
): Promise<{
  products: Product[];
  categories: string[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}> {
  const queryParams = new URLSearchParams();

  if (params?.clothingType && params.clothingType !== 'All') {
    queryParams.append('clothingType', params.clothingType);
  }
  if (params?.limit) {
    queryParams.append('limit', String(params.limit));
  }
  if (params?.offset) {
    queryParams.append('offset', String(params.offset));
  }

  const queryString = queryParams.toString();
  const endpoint = `/merchants/${username}/products${queryString ? `?${queryString}` : ''}`;

  return fetchAPI<{
    products: Product[];
    categories: string[];
    pagination: {
      limit: number;
      offset: number;
      total: number;
      hasMore: boolean;
    };
  }>(endpoint);
}

// =============================================================================
// API ENDPOINTS - SEARCH
// =============================================================================

/**
 * Search products by query
 * Searches across: product name, category, clothingType, smartCategories, merchant name
 *
 * @param query - Search query string
 * @param params - Optional filtering and pagination parameters
 *
 * Backend endpoint: GET /api/search
 * Database query:
 *   - Products: name, category, clothingType, smartCategory1-3 (LIKE search)
 *   - Merchants: username, displayName (LIKE search)
 *
 * Search Logic:
 *   1. Search product fields (name, category, clothingType, smartCategories)
 *   2. Search merchant fields (username, displayName)
 *   3. Return combined results with relevance scoring
 */
export async function searchProducts(params: {
  query: string;
  genderType?: 'women' | 'men' | 'unisex';
  limit?: number;
  offset?: number;
}): Promise<{
  products: Product[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}> {
  const queryParams = new URLSearchParams({
    q: params.query,
    limit: String(params.limit || 20),
    offset: String(params.offset || 0),
  });

  if (params.genderType) {
    queryParams.append('genderType', params.genderType);
  }

  return fetchAPI<{
    products: Product[];
    pagination: {
      limit: number;
      offset: number;
      total: number;
      hasMore: boolean;
    };
  }>(`/search?${queryParams}`);
}

/**
 * Search products by category
 * Searches: category, clothingType fields
 *
 * @param category - Category to search for
 * @param params - Optional filtering and pagination parameters
 *
 * Backend endpoint: GET /api/search/category
 * Database query: products WHERE category LIKE %X% OR clothingType LIKE %X%
 */
export async function searchByCategory(params: {
  category: string;
  genderType?: 'women' | 'men' | 'unisex';
  limit?: number;
  offset?: number;
}): Promise<{
  products: Product[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}> {
  const queryParams = new URLSearchParams({
    category: params.category,
    limit: String(params.limit || 20),
    offset: String(params.offset || 0),
  });

  if (params.genderType) {
    queryParams.append('genderType', params.genderType);
  }

  return fetchAPI<{
    products: Product[];
    pagination: {
      limit: number;
      offset: number;
      total: number;
      hasMore: boolean;
    };
  }>(`/search/category?${queryParams}`);
}

/**
 * Search products by smart category (AI-generated)
 * Searches: smartCategory1, smartCategory2, smartCategory3 fields
 *
 * @param smartCategory - Smart category to search for
 * @param params - Optional filtering and pagination parameters
 *
 * Backend endpoint: GET /api/search/smart-category
 * Database query: products WHERE smartCategory1-3 LIKE %X%
 */
export async function searchBySmartCategory(params: {
  smartCategory: string;
  genderType?: 'women' | 'men' | 'unisex';
  limit?: number;
  offset?: number;
}): Promise<{
  products: Product[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}> {
  const queryParams = new URLSearchParams({
    smartCategory: params.smartCategory,
    limit: String(params.limit || 20),
    offset: String(params.offset || 0),
  });

  if (params.genderType) {
    queryParams.append('genderType', params.genderType);
  }

  return fetchAPI<{
    products: Product[];
    pagination: {
      limit: number;
      offset: number;
      total: number;
      hasMore: boolean;
    };
  }>(`/search/smart-category?${queryParams}`);
}

/**
 * Search products by merchant name
 * Searches: merchant.username, merchant.displayName fields
 *
 * @param merchantName - Merchant name to search for
 * @param params - Optional filtering and pagination parameters
 *
 * Backend endpoint: GET /api/search/merchant
 * Database query: products JOIN merchants WHERE username LIKE %X% OR displayName LIKE %X%
 */
export async function searchByMerchantName(params: {
  merchantName: string;
  genderType?: 'women' | 'men' | 'unisex';
  limit?: number;
  offset?: number;
}): Promise<{
  products: Product[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}> {
  const queryParams = new URLSearchParams({
    merchantName: params.merchantName,
    limit: String(params.limit || 20),
    offset: String(params.offset || 0),
  });

  if (params.genderType) {
    queryParams.append('genderType', params.genderType);
  }

  return fetchAPI<{
    products: Product[];
    pagination: {
      limit: number;
      offset: number;
      total: number;
      hasMore: boolean;
    };
  }>(`/search/merchant?${queryParams}`);
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

  // Product Detail Screen
  getProductById,
  getSimilarProducts,

  // Artist Profile Screen
  getMerchantByUsername,
  getMerchantProducts,

  // Search Screen
  searchProducts,
  searchByCategory,
  searchBySmartCategory,
  searchByMerchantName,
};
