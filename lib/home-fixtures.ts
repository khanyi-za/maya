// Doc-shaped fixtures for the Home screen, used while USE_FIXTURES is on in
// api-client.ts (backend not running yet). These mirror the canonical response
// shapes in docs/api/ — integer ZAR cents, 'ZAR' currency, personalised fields.
//
// Image URLs deliberately keep the /demo-assets/<brand>/<file> form so the
// existing getLocalAsset() resolver still renders bundled images offline. Once
// the real API returns absolute CDN URLs, these fixtures and getLocalAsset go away.

import type {
  Product,
  CarouselProduct,
  Category,
  TrendingMerchant,
  CartSummary,
  GenderType,
} from './api-client';

const TOL_THEMA = {
  id: 'merchant-tol-thema',
  username: 'tol_thema',
  displayName: "Tol'thema",
  logo: "/demo-assets/tol_thema/tol'thema-logo.png",
  isVerified: true,
  isFollowedByMe: false,
};

const SUHU = {
  id: 'merchant-suhu',
  username: 'suhu',
  displayName: 'SUHU',
  logo: '/demo-assets/suhu/suhu-logo.png',
  isVerified: true,
  isFollowedByMe: false,
};

// Master catalogue (doc-shaped). Feed/category fixtures derive from this.
const PRODUCTS: Product[] = [
  { id: 'tol-bonang', name: 'The Bonang Dress', price: 189900, currency: 'ZAR', primaryImage: '/demo-assets/tol_thema/The_Bonang_dress_1.png', merchant: TOL_THEMA, category: 'Dresses', clothingType: 'Dress', genderType: 'women', isLikedByMe: false, isBookmarkedByMe: false },
  { id: 'suhu-golfer', name: 'SUHU Eye Knitted Golfer', price: 120000, currency: 'ZAR', primaryImage: '/demo-assets/suhu/SUHU_EYE_KNITTED_GOLFER_1.jpg', merchant: SUHU, category: 'Tops', clothingType: 'Golfer', genderType: 'unisex', isLikedByMe: true, isBookmarkedByMe: false },
  { id: 'tol-kimono', name: 'Kimono Mosadi Snatched', price: 125000, currency: 'ZAR', primaryImage: '/demo-assets/tol_thema/Kimono_Mosadi_Snatched_2.png', merchant: TOL_THEMA, category: 'Dresses', clothingType: 'Kimono', genderType: 'women', isLikedByMe: false, isBookmarkedByMe: true },
  { id: 'suhu-sweater', name: 'SUHU Logo Full Zip Sweater', price: 145000, currency: 'ZAR', primaryImage: '/demo-assets/suhu/SUHU_LOGO_FULL_ZIP_SWEATER_BLUE_1.jpg', merchant: SUHU, category: 'Tops', clothingType: 'Sweater', genderType: 'unisex', isLikedByMe: false, isBookmarkedByMe: false },
  { id: 'tol-lindy', name: 'Plain Lindy Round Neck', price: 115000, currency: 'ZAR', primaryImage: '/demo-assets/tol_thema/Lindy_2.png', merchant: TOL_THEMA, category: 'Dresses', clothingType: 'Dress', genderType: 'women', isLikedByMe: false, isBookmarkedByMe: false },
  { id: 'suhu-sweatpant', name: 'SUHU Logo Sweatpant Black', price: 95000, currency: 'ZAR', primaryImage: '/demo-assets/suhu/SUHU_LOGO_SWEATPANT_BLACK_2.png', merchant: SUHU, category: 'Bottoms', clothingType: 'Sweatpant', genderType: 'unisex', isLikedByMe: false, isBookmarkedByMe: false },
  { id: 'tol-boubou', name: 'Nontsikelelo Boubou', price: 189900, currency: 'ZAR', primaryImage: '/demo-assets/tol_thema/Nontsikelelo_boubou_1.png', merchant: TOL_THEMA, category: 'Dresses', clothingType: 'Boubou', genderType: 'women', isLikedByMe: false, isBookmarkedByMe: false },
  { id: 'suhu-bag', name: 'The Bag — SUHU', price: 78000, currency: 'ZAR', primaryImage: '/demo-assets/suhu/THE_BAG_SUHU_1.jpg', merchant: SUHU, category: 'Accessories', clothingType: 'Bag', genderType: 'unisex', isLikedByMe: false, isBookmarkedByMe: false },
  { id: 'tol-khosi', name: 'The Khosi Shirt', price: 95000, currency: 'ZAR', primaryImage: '/demo-assets/tol_thema/The_Khosi_Shirt.png', merchant: TOL_THEMA, category: 'Tops', clothingType: 'Shirt', genderType: 'women', isLikedByMe: false, isBookmarkedByMe: false },
  { id: 'suhu-tshirt', name: 'A Village Story T-Shirt White', price: 65000, currency: 'ZAR', primaryImage: '/demo-assets/suhu/A_VILLAGE_STORY_T-SHIRT_WHITE_1.jpg', merchant: SUHU, category: 'Tops', clothingType: 'T-Shirt', genderType: 'unisex', isLikedByMe: false, isBookmarkedByMe: false },
  { id: 'tol-lufuno', name: 'The Lufuno Set', price: 165000, currency: 'ZAR', primaryImage: '/demo-assets/tol_thema/The_Lufuno_set_1.png', merchant: TOL_THEMA, category: 'Sets', clothingType: 'Co-ord Set', genderType: 'women', isLikedByMe: false, isBookmarkedByMe: false },
  { id: 'tol-zola', name: 'The Zola Kimono', price: 135000, currency: 'ZAR', primaryImage: '/demo-assets/tol_thema/The_Zola_Kimono_1.png', merchant: TOL_THEMA, category: 'Dresses', clothingType: 'Kimono', genderType: 'women', isLikedByMe: false, isBookmarkedByMe: false },
  { id: 'tol-turtle', name: 'Turtle Neck Lindy', price: 115000, currency: 'ZAR', primaryImage: '/demo-assets/tol_thema/Turtle_neck_lindy_2.png', merchant: TOL_THEMA, category: 'Dresses', clothingType: 'Dress', genderType: 'women', isLikedByMe: false, isBookmarkedByMe: false },
];

// Unisex items appear in both women and men feeds; an explicit gender matches itself.
function matchesGender(p: Product, gender: GenderType): boolean {
  if (gender === 'unisex') return true;
  return p.genderType === gender || p.genderType === 'unisex';
}

const NEW_ARRIVALS: CarouselProduct[] = [
  { id: 'tol-zola', name: 'The Zola Kimono', price: 135000, currency: 'ZAR', image: '/demo-assets/tol_thema/The_Zola_Kimono_1.png', merchant: { displayName: "Tol'thema" } },
  { id: 'suhu-tshirt', name: 'A Village Story T-Shirt', price: 65000, currency: 'ZAR', image: '/demo-assets/suhu/A_VILLAGE_STORY_T-SHIRT_WHITE_1.jpg', merchant: { displayName: 'SUHU' } },
  { id: 'tol-turtle', name: 'Turtle Neck Lindy', price: 115000, currency: 'ZAR', image: '/demo-assets/tol_thema/Turtle_neck_lindy_2.png', merchant: { displayName: "Tol'thema" } },
  { id: 'suhu-bag', name: 'The Bag — SUHU', price: 78000, currency: 'ZAR', image: '/demo-assets/suhu/THE_BAG_SUHU_1.jpg', merchant: { displayName: 'SUHU' } },
  { id: 'tol-lufuno', name: 'The Lufuno Set', price: 165000, currency: 'ZAR', image: '/demo-assets/tol_thema/The_Lufuno_set_1.png', merchant: { displayName: "Tol'thema" } },
  { id: 'suhu-sweater', name: 'Logo Full Zip Sweater', price: 145000, currency: 'ZAR', image: '/demo-assets/suhu/SUHU_LOGO_FULL_ZIP_SWEATER_BLUE_1.jpg', merchant: { displayName: 'SUHU' } },
];

const TRENDING_MERCHANTS: TrendingMerchant[] = [
  { id: 'merchant-tol-thema', username: 'tol_thema', displayName: "Tol'thema", logo: "/demo-assets/tol_thema/tol'thema-logo.png", followerCount: 17201, isVerified: true, isFollowedByMe: false },
  { id: 'merchant-suhu', username: 'suhu', displayName: 'SUHU', logo: '/demo-assets/suhu/suhu-logo.png', followerCount: 9155, isVerified: true, isFollowedByMe: false },
];

export const homeFixtures = {
  feed(gender: GenderType, category?: string): Product[] {
    let items = PRODUCTS.filter((p) => matchesGender(p, gender));
    if (category && category !== 'All') {
      const slug = category.toLowerCase();
      items = items.filter((p) => p.category.toLowerCase() === slug);
    }
    return items;
  },

  newArrivals(_gender: GenderType): CarouselProduct[] {
    return NEW_ARRIVALS;
  },

  categories(gender: GenderType): Category[] {
    const seen = new Set<string>();
    const result: Category[] = [];
    for (const p of PRODUCTS.filter((pr) => matchesGender(pr, gender))) {
      if (seen.has(p.category)) continue;
      seen.add(p.category);
      result.push({
        slug: p.category.toLowerCase(),
        displayName: p.category,
        image: null,
        order: result.length,
      });
    }
    return result;
  },

  trendingMerchants(): TrendingMerchant[] {
    return TRENDING_MERCHANTS;
  },

  cartSummary(): CartSummary {
    return { itemCount: 0, subtotal: 0, currency: 'ZAR' };
  },
};
