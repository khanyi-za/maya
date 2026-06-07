import { Product, CarouselProduct, ProductDetail, MerchantProfile } from './api-client';

// ─── MERCHANTS ────────────────────────────────────────────────────────────────

export const DUMMY_MERCHANTS: Record<string, MerchantProfile> = {
  suhu: {
    id: 'merchant-suhu',
    username: 'suhu',
    displayName: 'SUHU',
    email: 'info@suhu.co.za',
    bio: 'SUHU is a Cape Town-based streetwear brand blending minimalist design with premium craftsmanship. Each piece is crafted with intention — built for the streets, made to last.',
    location: 'Cape Town, South Africa',
    logo: 'suhu-logo.png',
    heroMedia: [
      '/demo-assets/suhu/Hero_1.mp4',
      '/demo-assets/suhu/Hero_2.mp4',
      '/demo-assets/suhu/Hero_3.mp4',
    ],
    followerCount: 9155,
    followingCount: 412,
    postCount: 87,
    isVerified: true,
  },
  tol_thema: {
    id: 'merchant-tol-thema',
    username: 'tol_thema',
    displayName: "Tol'thema",
    email: 'info@tolthema.co.za',
    bio: "Tol'thema is a South African womenswear brand celebrating African femininity through bold cuts, rich fabrics, and cultural storytelling. Every garment is a statement.",
    location: 'Johannesburg, South Africa',
    logo: "tol'thema-logo.png",
    heroMedia: [
      '/demo-assets/tol_thema/hero_1.mp4',
      '/demo-assets/tol_thema/hero_2.mp4',
      '/demo-assets/tol_thema/hero_3.mp4',
    ],
    followerCount: 17201,
    followingCount: 538,
    postCount: 134,
    isVerified: true,
  },
};

export function getDummyMerchant(username: string): MerchantProfile {
  return DUMMY_MERCHANTS[username] ?? DUMMY_MERCHANTS.suhu;
}

// ─── PRODUCT DETAILS (keyed by productId) ─────────────────────────────────────

export const DUMMY_PRODUCT_DETAILS: Record<string, ProductDetail> = {
  'suhu-golfer': {
    id: 'suhu-golfer',
    name: 'SUHU Eye Knitted Golfer',
    price: 1200,
    currency: 'R',
    description: 'The SUHU Eye Knitted Golfer is a signature piece from our heritage collection. Hand-knitted with premium yarn, featuring our iconic eye motif. Available in limited quantities.',
    category: 'Tops',
    clothingType: 'Golfer',
    genderType: 'unisex',
    size: 'XS, S, M, L, XL',
    inventoryType: 'limited',
    leadTime: null,
    media: [
      { url: '/demo-assets/suhu/SUHU_EYE_KNITTED_GOLFER_1.jpg', type: 'image', filename: 'SUHU_EYE_KNITTED_GOLFER_1.jpg' },
      { url: '/demo-assets/suhu/SUHU_EYE_KNITTED_GOLFER_2.jpg', type: 'image', filename: 'SUHU_EYE_KNITTED_GOLFER_2.jpg' },
      { url: '/demo-assets/suhu/SUHU_EYE_KNITTED_GOLFER_3.jpg', type: 'image', filename: 'SUHU_EYE_KNITTED_GOLFER_3.jpg' },
      { url: '/demo-assets/suhu/SUHU_EYE_KNITTED_GOLFER_7.mp4', type: 'video', filename: 'SUHU_EYE_KNITTED_GOLFER_7.mp4' },
      { url: '/demo-assets/suhu/SUHU_EYE_KNITTED_GOLFER_4.jpg', type: 'image', filename: 'SUHU_EYE_KNITTED_GOLFER_4.jpg' },
      { url: '/demo-assets/suhu/SUHU_EYE_KNITTED_GOLFER_5.jpg', type: 'image', filename: 'SUHU_EYE_KNITTED_GOLFER_5.jpg' },
      { url: '/demo-assets/suhu/SUHU_EYE_KNITTED_GOLFER_6.jpg', type: 'image', filename: 'SUHU_EYE_KNITTED_GOLFER_6.jpg' },
      { url: '/demo-assets/suhu/SUHU_EYE_KNITTED_GOLFER_8.jpg', type: 'image', filename: 'SUHU_EYE_KNITTED_GOLFER_8.jpg' },
    ],
    merchant: { id: 'merchant-suhu', username: 'suhu', displayName: 'SUHU', logo: '/demo-assets/suhu/suhu-logo.png', isVerified: true, bio: 'Cape Town streetwear, built with intention.', location: 'Cape Town, South Africa' },
  },
  'suhu-sweater': {
    id: 'suhu-sweater',
    name: 'SUHU Logo Full Zip Sweater Blue',
    price: 1450,
    currency: 'R',
    description: null,
    category: 'Tops',
    clothingType: 'Sweater',
    genderType: 'unisex',
    size: 'S, M, L, XL',
    inventoryType: 'in_stock',
    leadTime: null,
    media: [
      { url: '/demo-assets/suhu/SUHU_LOGO_FULL_ZIP_SWEATER_BLUE_1.jpg', type: 'image', filename: 'SUHU_LOGO_FULL_ZIP_SWEATER_BLUE_1.jpg' },
      { url: '/demo-assets/suhu/SUHU_LOGO_FULL_ZIP_SWEATER_BLUE_2.jpg', type: 'image', filename: 'SUHU_LOGO_FULL_ZIP_SWEATER_BLUE_2.jpg' },
      { url: '/demo-assets/suhu/SUHU_LOGO_FULL_ZIP_SWEATER_BLUE_3.jpg', type: 'image', filename: 'SUHU_LOGO_FULL_ZIP_SWEATER_BLUE_3.jpg' },
      { url: '/demo-assets/suhu/SUHU_LOGO_FULL_ZIP_SWEATER_BLUE_4.jpg', type: 'image', filename: 'SUHU_LOGO_FULL_ZIP_SWEATER_BLUE_4.jpg' },
      { url: '/demo-assets/suhu/SUHU_LOGO_FULL_ZIP_SWEATER_BLUE_5.jpg', type: 'image', filename: 'SUHU_LOGO_FULL_ZIP_SWEATER_BLUE_5.jpg' },
    ],
    merchant: { id: 'merchant-suhu', username: 'suhu', displayName: 'SUHU', logo: '/demo-assets/suhu/suhu-logo.png', isVerified: true, bio: 'Cape Town streetwear, built with intention.', location: 'Cape Town, South Africa' },
  },
  'suhu-sweatpant': {
    id: 'suhu-sweatpant',
    name: 'SUHU Logo Sweatpant Black',
    price: 950,
    currency: 'R',
    description: null,
    category: 'Bottoms',
    clothingType: 'Sweatpant',
    genderType: 'unisex',
    size: 'XS, S, M, L, XL, XXL',
    inventoryType: 'in_stock',
    leadTime: null,
    media: [
      { url: '/demo-assets/suhu/SUHU_LOGO_SWEATPANT_BLACK_2.png', type: 'image', filename: 'SUHU_LOGO_SWEATPANT_BLACK_2.png' },
      { url: '/demo-assets/suhu/SUHU_LOGO_SWEATPANT_BLACK_3.jpg', type: 'image', filename: 'SUHU_LOGO_SWEATPANT_BLACK_3.jpg' },
      { url: '/demo-assets/suhu/SUHU_LOGO_SWEATPANT_BLACK_4.jpg', type: 'image', filename: 'SUHU_LOGO_SWEATPANT_BLACK_4.jpg' },
      { url: '/demo-assets/suhu/SUHU_LOGO_SWEATPANT_BLACK_5.jpg', type: 'image', filename: 'SUHU_LOGO_SWEATPANT_BLACK_5.jpg' },
      { url: '/demo-assets/suhu/SUHU_LOGO_SWEATPANT_BLACK_7.jpg', type: 'image', filename: 'SUHU_LOGO_SWEATPANT_BLACK_7.jpg' },
    ],
    merchant: { id: 'merchant-suhu', username: 'suhu', displayName: 'SUHU', logo: '/demo-assets/suhu/suhu-logo.png', isVerified: true, bio: 'Cape Town streetwear, built with intention.', location: 'Cape Town, South Africa' },
  },
  'suhu-bag': {
    id: 'suhu-bag',
    name: 'The Bag — SUHU',
    price: 780,
    currency: 'R',
    description: null,
    category: 'Accessories',
    clothingType: 'Bag',
    genderType: 'unisex',
    size: null,
    inventoryType: 'in_stock',
    leadTime: null,
    media: [
      { url: '/demo-assets/suhu/THE_BAG_SUHU_1.jpg', type: 'image', filename: 'THE_BAG_SUHU_1.jpg' },
      { url: '/demo-assets/suhu/THE_BAG_SUHU_2.jpg', type: 'image', filename: 'THE_BAG_SUHU_2.jpg' },
      { url: '/demo-assets/suhu/THE_BAG_SUHU_3.jpg', type: 'image', filename: 'THE_BAG_SUHU_3.jpg' },
      { url: '/demo-assets/suhu/THE_BAG_SUHU_4.jpg', type: 'image', filename: 'THE_BAG_SUHU_4.jpg' },
      { url: '/demo-assets/suhu/THE_BAG_SUHU_5.png', type: 'image', filename: 'THE_BAG_SUHU_5.png' },
      { url: '/demo-assets/suhu/THE_BAG_SUHU_6.png', type: 'image', filename: 'THE_BAG_SUHU_6.png' },
    ],
    merchant: { id: 'merchant-suhu', username: 'suhu', displayName: 'SUHU', logo: '/demo-assets/suhu/suhu-logo.png', isVerified: true, bio: 'Cape Town streetwear, built with intention.', location: 'Cape Town, South Africa' },
  },
  'suhu-tshirt': {
    id: 'suhu-tshirt',
    name: 'A Village Story T-Shirt White',
    price: 650,
    currency: 'R',
    description: null,
    category: 'Tops',
    clothingType: 'T-Shirt',
    genderType: 'unisex',
    size: 'XS, S, M, L, XL',
    inventoryType: 'in_stock',
    leadTime: null,
    media: [
      { url: '/demo-assets/suhu/A_VILLAGE_STORY_T-SHIRT_WHITE_1.jpg', type: 'image', filename: 'A_VILLAGE_STORY_T-SHIRT_WHITE_1.jpg' },
      { url: '/demo-assets/suhu/A_VILLAGE_STORY_T-SHIRT_WHITE_2.jpg', type: 'image', filename: 'A_VILLAGE_STORY_T-SHIRT_WHITE_2.jpg' },
      { url: '/demo-assets/suhu/A_VILLAGE_STORY_T-SHIRT_WHITE_3.png', type: 'image', filename: 'A_VILLAGE_STORY_T-SHIRT_WHITE_3.png' },
    ],
    merchant: { id: 'merchant-suhu', username: 'suhu', displayName: 'SUHU', logo: '/demo-assets/suhu/suhu-logo.png', isVerified: true, bio: 'Cape Town streetwear, built with intention.', location: 'Cape Town, South Africa' },
  },
  'tol-kimono': {
    id: 'tol-kimono',
    name: 'Kimono Mosadi Snatched',
    price: 1250,
    currency: 'R',
    description: "The Kimono Mosadi Snatched is Tol'thema's signature snatched-waist kimono. Inspired by the power of the African woman — mosadi — this piece commands every room.",
    category: 'Dresses',
    clothingType: 'Kimono',
    genderType: 'women',
    size: 'XS, S, M, L, XL',
    inventoryType: 'made_to_order',
    leadTime: '7-10 business days',
    media: [
      { url: '/demo-assets/tol_thema/Kimono_Mosadi_Snatched_1.mp4', type: 'video', filename: 'Kimono_Mosadi_Snatched_1.mp4' },
      { url: '/demo-assets/tol_thema/Kimono_Mosadi_Snatched_2.png', type: 'image', filename: 'Kimono_Mosadi_Snatched_2.png' },
      { url: '/demo-assets/tol_thema/Kimono_Mosadi_Snatched_3.png', type: 'image', filename: 'Kimono_Mosadi_Snatched_3.png' },
      { url: '/demo-assets/tol_thema/Kimono_Mosadi_Snatched_4.png', type: 'image', filename: 'Kimono_Mosadi_Snatched_4.png' },
      { url: '/demo-assets/tol_thema/Kimono_Mosadi_Snatched_5.mp4', type: 'video', filename: 'Kimono_Mosadi_Snatched_5.mp4' },
    ],
    merchant: { id: 'merchant-tol-thema', username: 'tol_thema', displayName: "Tol'thema", logo: "/demo-assets/tol_thema/tol'thema-logo.png", isVerified: true, bio: 'Celebrating African femininity through bold cuts and cultural storytelling.', location: 'Johannesburg, South Africa' },
  },
  'tol-lindy': {
    id: 'tol-lindy',
    name: 'Plain Lindy Round Neck',
    price: 1150,
    currency: 'R',
    description: null,
    category: 'Dresses',
    clothingType: 'Dress',
    genderType: 'women',
    size: 'XS, S, M, L, XL, XXL',
    inventoryType: 'made_to_order',
    leadTime: '7-10 business days',
    media: [
      { url: '/demo-assets/tol_thema/Lindy_1.mp4', type: 'video', filename: 'Lindy_1.mp4' },
      { url: '/demo-assets/tol_thema/Lindy_2.png', type: 'image', filename: 'Lindy_2.png' },
    ],
    merchant: { id: 'merchant-tol-thema', username: 'tol_thema', displayName: "Tol'thema", logo: "/demo-assets/tol_thema/tol'thema-logo.png", isVerified: true, bio: 'Celebrating African femininity through bold cuts and cultural storytelling.', location: 'Johannesburg, South Africa' },
  },
  'tol-boubou': {
    id: 'tol-boubou',
    name: 'Nontsikelelo Boubou',
    price: 1899,
    currency: 'R',
    description: null,
    category: 'Dresses',
    clothingType: 'Boubou',
    genderType: 'women',
    size: 'XS, S, M, L, XL',
    inventoryType: 'made_to_order',
    leadTime: '10-14 business days',
    media: [
      { url: '/demo-assets/tol_thema/Nontsikelelo_boubou_1.png', type: 'image', filename: 'Nontsikelelo_boubou_1.png' },
      { url: '/demo-assets/tol_thema/Nontsikelelo_boubou_2.mp4', type: 'video', filename: 'Nontsikelelo_boubou_2.mp4' },
      { url: '/demo-assets/tol_thema/Nontsikelelo_boubou_3.mp4', type: 'video', filename: 'Nontsikelelo_boubou_3.mp4' },
    ],
    merchant: { id: 'merchant-tol-thema', username: 'tol_thema', displayName: "Tol'thema", logo: "/demo-assets/tol_thema/tol'thema-logo.png", isVerified: true, bio: 'Celebrating African femininity through bold cuts and cultural storytelling.', location: 'Johannesburg, South Africa' },
  },
  'tol-bonang': {
    id: 'tol-bonang',
    name: 'The Bonang Dress',
    price: 1899,
    currency: 'R',
    description: null,
    category: 'Dresses',
    clothingType: 'Dress',
    genderType: 'women',
    size: 'XS, S, M, L',
    inventoryType: 'made_to_order',
    leadTime: '7-10 business days',
    media: [
      { url: '/demo-assets/tol_thema/The_Bonang_dress_1.png', type: 'image', filename: 'The_Bonang_dress_1.png' },
      { url: '/demo-assets/tol_thema/The_Bonang_dress_2.png', type: 'image', filename: 'The_Bonang_dress_2.png' },
      { url: '/demo-assets/tol_thema/The_Bonang_dress_3.jpg', type: 'image', filename: 'The_Bonang_dress_3.jpg' },
    ],
    merchant: { id: 'merchant-tol-thema', username: 'tol_thema', displayName: "Tol'thema", logo: "/demo-assets/tol_thema/tol'thema-logo.png", isVerified: true, bio: 'Celebrating African femininity through bold cuts and cultural storytelling.', location: 'Johannesburg, South Africa' },
  },
  'tol-khosi': {
    id: 'tol-khosi',
    name: 'The Khosi Shirt',
    price: 950,
    currency: 'R',
    description: null,
    category: 'Tops',
    clothingType: 'Shirt',
    genderType: 'women',
    size: 'XS, S, M, L, XL',
    inventoryType: 'in_stock',
    leadTime: null,
    media: [
      { url: '/demo-assets/tol_thema/The_Khosi_Shirt.png', type: 'image', filename: 'The_Khosi_Shirt.png' },
      { url: '/demo-assets/tol_thema/The_Khosi_Shirt_2.png', type: 'image', filename: 'The_Khosi_Shirt_2.png' },
    ],
    merchant: { id: 'merchant-tol-thema', username: 'tol_thema', displayName: "Tol'thema", logo: "/demo-assets/tol_thema/tol'thema-logo.png", isVerified: true, bio: 'Celebrating African femininity through bold cuts and cultural storytelling.', location: 'Johannesburg, South Africa' },
  },
  'tol-lufuno': {
    id: 'tol-lufuno',
    name: 'The Lufuno Set',
    price: 1650,
    currency: 'R',
    description: null,
    category: 'Sets',
    clothingType: 'Co-ord Set',
    genderType: 'women',
    size: 'XS, S, M, L, XL',
    inventoryType: 'made_to_order',
    leadTime: '7-10 business days',
    media: [
      { url: '/demo-assets/tol_thema/The_Lufuno_set_1.png', type: 'image', filename: 'The_Lufuno_set_1.png' },
      { url: '/demo-assets/tol_thema/The_Lufuno_set_2.png', type: 'image', filename: 'The_Lufuno_set_2.png' },
      { url: '/demo-assets/tol_thema/The_Lufuno_set_3.mp4', type: 'video', filename: 'The_Lufuno_set_3.mp4' },
    ],
    merchant: { id: 'merchant-tol-thema', username: 'tol_thema', displayName: "Tol'thema", logo: "/demo-assets/tol_thema/tol'thema-logo.png", isVerified: true, bio: 'Celebrating African femininity through bold cuts and cultural storytelling.', location: 'Johannesburg, South Africa' },
  },
  'tol-zola': {
    id: 'tol-zola',
    name: 'The Zola Kimono',
    price: 1350,
    currency: 'R',
    description: null,
    category: 'Dresses',
    clothingType: 'Kimono',
    genderType: 'women',
    size: 'XS, S, M, L, XL',
    inventoryType: 'made_to_order',
    leadTime: '7-10 business days',
    media: [
      { url: '/demo-assets/tol_thema/The_Zola_Kimono_1.png', type: 'image', filename: 'The_Zola_Kimono_1.png' },
      { url: '/demo-assets/tol_thema/The_Zola_Kimono_2.png', type: 'image', filename: 'The_Zola_Kimono_2.png' },
      { url: '/demo-assets/tol_thema/The_Zola_Kimono_3.png', type: 'image', filename: 'The_Zola_Kimono_3.png' },
    ],
    merchant: { id: 'merchant-tol-thema', username: 'tol_thema', displayName: "Tol'thema", logo: "/demo-assets/tol_thema/tol'thema-logo.png", isVerified: true, bio: 'Celebrating African femininity through bold cuts and cultural storytelling.', location: 'Johannesburg, South Africa' },
  },
  'tol-turtle': {
    id: 'tol-turtle',
    name: 'Turtle Neck Lindy',
    price: 1150,
    currency: 'R',
    description: null,
    category: 'Dresses',
    clothingType: 'Dress',
    genderType: 'women',
    size: 'XS, S, M, L, XL',
    inventoryType: 'made_to_order',
    leadTime: '7-10 business days',
    media: [
      { url: '/demo-assets/tol_thema/Turtle_neck_lindy_1.mp4', type: 'video', filename: 'Turtle_neck_lindy_1.mp4' },
      { url: '/demo-assets/tol_thema/Turtle_neck_lindy_2.png', type: 'image', filename: 'Turtle_neck_lindy_2.png' },
      { url: '/demo-assets/tol_thema/Turtle_neck_lindy_3.png', type: 'image', filename: 'Turtle_neck_lindy_3.png' },
    ],
    merchant: { id: 'merchant-tol-thema', username: 'tol_thema', displayName: "Tol'thema", logo: "/demo-assets/tol_thema/tol'thema-logo.png", isVerified: true, bio: 'Celebrating African femininity through bold cuts and cultural storytelling.', location: 'Johannesburg, South Africa' },
  },
};

export function getDummyProductDetail(productId: string): ProductDetail {
  return DUMMY_PRODUCT_DETAILS[productId] ?? DUMMY_PRODUCT_DETAILS['suhu-golfer'];
}

// ─── FEED PRODUCTS (home grid + search pool) ──────────────────────────────────

export const DUMMY_FEED_PRODUCTS: Product[] = [
  { id: 'tol-bonang', name: 'The Bonang Dress', price: 1899, currency: 'R', primaryImage: '/demo-assets/tol_thema/The_Bonang_dress_1.png', merchant: { id: 'merchant-tol-thema', username: 'tol_thema', displayName: "Tol'thema", logo: "/demo-assets/tol_thema/tol'thema-logo.png", isVerified: true }, category: 'Dresses', clothingType: 'Dress', genderType: 'women' },
  { id: 'suhu-golfer', name: 'SUHU Eye Knitted Golfer', price: 1200, currency: 'R', primaryImage: '/demo-assets/suhu/SUHU_EYE_KNITTED_GOLFER_1.jpg', merchant: { id: 'merchant-suhu', username: 'suhu', displayName: 'SUHU', logo: '/demo-assets/suhu/suhu-logo.png', isVerified: true }, category: 'Tops', clothingType: 'Golfer', genderType: 'unisex' },
  { id: 'tol-kimono', name: 'Kimono Mosadi Snatched', price: 1250, currency: 'R', primaryImage: '/demo-assets/tol_thema/Kimono_Mosadi_Snatched_2.png', merchant: { id: 'merchant-tol-thema', username: 'tol_thema', displayName: "Tol'thema", logo: "/demo-assets/tol_thema/tol'thema-logo.png", isVerified: true }, category: 'Dresses', clothingType: 'Kimono', genderType: 'women' },
  { id: 'suhu-sweater', name: 'SUHU Logo Full Zip Sweater', price: 1450, currency: 'R', primaryImage: '/demo-assets/suhu/SUHU_LOGO_FULL_ZIP_SWEATER_BLUE_1.jpg', merchant: { id: 'merchant-suhu', username: 'suhu', displayName: 'SUHU', logo: '/demo-assets/suhu/suhu-logo.png', isVerified: true }, category: 'Tops', clothingType: 'Sweater', genderType: 'unisex' },
  { id: 'tol-lindy', name: 'Plain Lindy Round Neck', price: 1150, currency: 'R', primaryImage: '/demo-assets/tol_thema/Lindy_2.png', merchant: { id: 'merchant-tol-thema', username: 'tol_thema', displayName: "Tol'thema", logo: "/demo-assets/tol_thema/tol'thema-logo.png", isVerified: true }, category: 'Dresses', clothingType: 'Dress', genderType: 'women' },
  { id: 'suhu-sweatpant', name: 'SUHU Logo Sweatpant Black', price: 950, currency: 'R', primaryImage: '/demo-assets/suhu/SUHU_LOGO_SWEATPANT_BLACK_2.png', merchant: { id: 'merchant-suhu', username: 'suhu', displayName: 'SUHU', logo: '/demo-assets/suhu/suhu-logo.png', isVerified: true }, category: 'Bottoms', clothingType: 'Sweatpant', genderType: 'unisex' },
  { id: 'tol-boubou', name: 'Nontsikelelo Boubou', price: 1899, currency: 'R', primaryImage: '/demo-assets/tol_thema/Nontsikelelo_boubou_1.png', merchant: { id: 'merchant-tol-thema', username: 'tol_thema', displayName: "Tol'thema", logo: "/demo-assets/tol_thema/tol'thema-logo.png", isVerified: true }, category: 'Dresses', clothingType: 'Boubou', genderType: 'women' },
  { id: 'suhu-bag', name: 'The Bag — SUHU', price: 780, currency: 'R', primaryImage: '/demo-assets/suhu/THE_BAG_SUHU_1.jpg', merchant: { id: 'merchant-suhu', username: 'suhu', displayName: 'SUHU', logo: '/demo-assets/suhu/suhu-logo.png', isVerified: true }, category: 'Accessories', clothingType: 'Bag', genderType: 'unisex' },
  { id: 'tol-khosi', name: 'The Khosi Shirt', price: 950, currency: 'R', primaryImage: '/demo-assets/tol_thema/The_Khosi_Shirt.png', merchant: { id: 'merchant-tol-thema', username: 'tol_thema', displayName: "Tol'thema", logo: "/demo-assets/tol_thema/tol'thema-logo.png", isVerified: true }, category: 'Tops', clothingType: 'Shirt', genderType: 'women' },
  { id: 'suhu-tshirt', name: 'A Village Story T-Shirt White', price: 650, currency: 'R', primaryImage: '/demo-assets/suhu/A_VILLAGE_STORY_T-SHIRT_WHITE_1.jpg', merchant: { id: 'merchant-suhu', username: 'suhu', displayName: 'SUHU', logo: '/demo-assets/suhu/suhu-logo.png', isVerified: true }, category: 'Tops', clothingType: 'T-Shirt', genderType: 'unisex' },
  { id: 'tol-lufuno', name: 'The Lufuno Set', price: 1650, currency: 'R', primaryImage: '/demo-assets/tol_thema/The_Lufuno_set_1.png', merchant: { id: 'merchant-tol-thema', username: 'tol_thema', displayName: "Tol'thema", logo: "/demo-assets/tol_thema/tol'thema-logo.png", isVerified: true }, category: 'Sets', clothingType: 'Co-ord Set', genderType: 'women' },
  { id: 'tol-zola', name: 'The Zola Kimono', price: 1350, currency: 'R', primaryImage: '/demo-assets/tol_thema/The_Zola_Kimono_1.png', merchant: { id: 'merchant-tol-thema', username: 'tol_thema', displayName: "Tol'thema", logo: "/demo-assets/tol_thema/tol'thema-logo.png", isVerified: true }, category: 'Dresses', clothingType: 'Kimono', genderType: 'women' },
  { id: 'tol-turtle', name: 'Turtle Neck Lindy', price: 1150, currency: 'R', primaryImage: '/demo-assets/tol_thema/Turtle_neck_lindy_2.png', merchant: { id: 'merchant-tol-thema', username: 'tol_thema', displayName: "Tol'thema", logo: "/demo-assets/tol_thema/tol'thema-logo.png", isVerified: true }, category: 'Dresses', clothingType: 'Dress', genderType: 'women' },
];

// ─── CAROUSEL PRODUCTS (new arrivals / similar items) ─────────────────────────

export const DUMMY_CAROUSEL_PRODUCTS: CarouselProduct[] = [
  { id: 'tol-zola', name: 'The Zola Kimono', price: 1350, currency: 'R', image: '/demo-assets/tol_thema/The_Zola_Kimono_1.png', merchant: { displayName: "Tol'thema" } },
  { id: 'suhu-tshirt', name: 'A Village Story T-Shirt', price: 650, currency: 'R', image: '/demo-assets/suhu/A_VILLAGE_STORY_T-SHIRT_WHITE_1.jpg', merchant: { displayName: 'SUHU' } },
  { id: 'tol-turtle', name: 'Turtle Neck Lindy', price: 1150, currency: 'R', image: '/demo-assets/tol_thema/Turtle_neck_lindy_2.png', merchant: { displayName: "Tol'thema" } },
  { id: 'suhu-bag', name: 'The Bag — SUHU', price: 780, currency: 'R', image: '/demo-assets/suhu/THE_BAG_SUHU_1.jpg', merchant: { displayName: 'SUHU' } },
  { id: 'tol-lufuno', name: 'The Lufuno Set', price: 1650, currency: 'R', image: '/demo-assets/tol_thema/The_Lufuno_set_1.png', merchant: { displayName: "Tol'thema" } },
  { id: 'suhu-sweater', name: 'Logo Full Zip Sweater', price: 1450, currency: 'R', image: '/demo-assets/suhu/SUHU_LOGO_FULL_ZIP_SWEATER_BLUE_1.jpg', merchant: { displayName: 'SUHU' } },
];

// ─── MERCHANT PRODUCTS (artist profile grid) ──────────────────────────────────

const SUHU_PRODUCTS: Product[] = [
  { id: 'suhu-golfer', name: 'SUHU Eye Knitted Golfer', price: 1200, currency: 'R', primaryImage: '/demo-assets/suhu/SUHU_EYE_KNITTED_GOLFER_1.jpg', merchant: { id: 'merchant-suhu', username: 'suhu', displayName: 'SUHU', logo: '/demo-assets/suhu/suhu-logo.png', isVerified: true }, category: 'Tops', clothingType: 'Golfer', genderType: 'unisex' },
  { id: 'suhu-sweater', name: 'SUHU Logo Full Zip Sweater Blue', price: 1450, currency: 'R', primaryImage: '/demo-assets/suhu/SUHU_LOGO_FULL_ZIP_SWEATER_BLUE_1.jpg', merchant: { id: 'merchant-suhu', username: 'suhu', displayName: 'SUHU', logo: '/demo-assets/suhu/suhu-logo.png', isVerified: true }, category: 'Tops', clothingType: 'Sweater', genderType: 'unisex' },
  { id: 'suhu-sweatpant', name: 'SUHU Logo Sweatpant Black', price: 950, currency: 'R', primaryImage: '/demo-assets/suhu/SUHU_LOGO_SWEATPANT_BLACK_2.png', merchant: { id: 'merchant-suhu', username: 'suhu', displayName: 'SUHU', logo: '/demo-assets/suhu/suhu-logo.png', isVerified: true }, category: 'Bottoms', clothingType: 'Sweatpant', genderType: 'unisex' },
  { id: 'suhu-bag', name: 'The Bag — SUHU', price: 780, currency: 'R', primaryImage: '/demo-assets/suhu/THE_BAG_SUHU_1.jpg', merchant: { id: 'merchant-suhu', username: 'suhu', displayName: 'SUHU', logo: '/demo-assets/suhu/suhu-logo.png', isVerified: true }, category: 'Accessories', clothingType: 'Bag', genderType: 'unisex' },
  { id: 'suhu-tshirt', name: 'A Village Story T-Shirt White', price: 650, currency: 'R', primaryImage: '/demo-assets/suhu/A_VILLAGE_STORY_T-SHIRT_WHITE_1.jpg', merchant: { id: 'merchant-suhu', username: 'suhu', displayName: 'SUHU', logo: '/demo-assets/suhu/suhu-logo.png', isVerified: true }, category: 'Tops', clothingType: 'T-Shirt', genderType: 'unisex' },
];

const TOL_THEMA_PRODUCTS: Product[] = [
  { id: 'tol-kimono', name: 'Kimono Mosadi Snatched', price: 1250, currency: 'R', primaryImage: '/demo-assets/tol_thema/Kimono_Mosadi_Snatched_2.png', merchant: { id: 'merchant-tol-thema', username: 'tol_thema', displayName: "Tol'thema", logo: "/demo-assets/tol_thema/tol'thema-logo.png", isVerified: true }, category: 'Dresses', clothingType: 'Kimono', genderType: 'women' },
  { id: 'tol-lindy', name: 'Plain Lindy Round Neck', price: 1150, currency: 'R', primaryImage: '/demo-assets/tol_thema/Lindy_2.png', merchant: { id: 'merchant-tol-thema', username: 'tol_thema', displayName: "Tol'thema", logo: "/demo-assets/tol_thema/tol'thema-logo.png", isVerified: true }, category: 'Dresses', clothingType: 'Dress', genderType: 'women' },
  { id: 'tol-boubou', name: 'Nontsikelelo Boubou', price: 1899, currency: 'R', primaryImage: '/demo-assets/tol_thema/Nontsikelelo_boubou_1.png', merchant: { id: 'merchant-tol-thema', username: 'tol_thema', displayName: "Tol'thema", logo: "/demo-assets/tol_thema/tol'thema-logo.png", isVerified: true }, category: 'Dresses', clothingType: 'Boubou', genderType: 'women' },
  { id: 'tol-bonang', name: 'The Bonang Dress', price: 1899, currency: 'R', primaryImage: '/demo-assets/tol_thema/The_Bonang_dress_1.png', merchant: { id: 'merchant-tol-thema', username: 'tol_thema', displayName: "Tol'thema", logo: "/demo-assets/tol_thema/tol'thema-logo.png", isVerified: true }, category: 'Dresses', clothingType: 'Dress', genderType: 'women' },
  { id: 'tol-khosi', name: 'The Khosi Shirt', price: 950, currency: 'R', primaryImage: '/demo-assets/tol_thema/The_Khosi_Shirt.png', merchant: { id: 'merchant-tol-thema', username: 'tol_thema', displayName: "Tol'thema", logo: "/demo-assets/tol_thema/tol'thema-logo.png", isVerified: true }, category: 'Tops', clothingType: 'Shirt', genderType: 'women' },
  { id: 'tol-lufuno', name: 'The Lufuno Set', price: 1650, currency: 'R', primaryImage: '/demo-assets/tol_thema/The_Lufuno_set_1.png', merchant: { id: 'merchant-tol-thema', username: 'tol_thema', displayName: "Tol'thema", logo: "/demo-assets/tol_thema/tol'thema-logo.png", isVerified: true }, category: 'Sets', clothingType: 'Co-ord Set', genderType: 'women' },
  { id: 'tol-zola', name: 'The Zola Kimono', price: 1350, currency: 'R', primaryImage: '/demo-assets/tol_thema/The_Zola_Kimono_1.png', merchant: { id: 'merchant-tol-thema', username: 'tol_thema', displayName: "Tol'thema", logo: "/demo-assets/tol_thema/tol'thema-logo.png", isVerified: true }, category: 'Dresses', clothingType: 'Kimono', genderType: 'women' },
  { id: 'tol-turtle', name: 'Turtle Neck Lindy', price: 1150, currency: 'R', primaryImage: '/demo-assets/tol_thema/Turtle_neck_lindy_2.png', merchant: { id: 'merchant-tol-thema', username: 'tol_thema', displayName: "Tol'thema", logo: "/demo-assets/tol_thema/tol'thema-logo.png", isVerified: true }, category: 'Dresses', clothingType: 'Dress', genderType: 'women' },
];

const DUMMY_MERCHANT_PRODUCTS: Record<string, { products: Product[]; categories: string[] }> = {
  suhu: { products: SUHU_PRODUCTS, categories: ['All', 'Tops', 'Bottoms', 'Accessories'] },
  tol_thema: { products: TOL_THEMA_PRODUCTS, categories: ['All', 'Dresses', 'Tops', 'Sets'] },
};

export function getDummyMerchantProducts(username: string, clothingType?: string): { products: Product[]; categories: string[] } {
  const data = DUMMY_MERCHANT_PRODUCTS[username] ?? DUMMY_MERCHANT_PRODUCTS.suhu;
  if (!clothingType || clothingType === 'All') return data;
  return { products: data.products.filter(p => p.clothingType === clothingType), categories: data.categories };
}

// ─── SEARCH ───────────────────────────────────────────────────────────────────

export function searchDummyProducts(query: string): Product[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return DUMMY_FEED_PRODUCTS.filter(
    p =>
      p.name.toLowerCase().includes(q) ||
      p.merchant.displayName.toLowerCase().includes(q) ||
      p.clothingType.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
  );
}
