// Product reels for the Search screen + full-screen reel feed (Phase 1).
// Each reel is a REAL yiiva_demo product that has its own Cloudinary video, so a
// reel's `productId` deep-links to a live product detail page, the overlay shows
// the true name/price/description/logo, and the clip is the product's own reel.
//
// Videos are remote Cloudinary URLs delivered through the same `imageSource()`
// path the product gallery / merchant hero already use (which forces H.264 for
// IG-sourced VP9 clips). Deliberate stepping stone: once the UX is proven this is
// replaced by a dynamic backend feed keyed off the same shape (the feed will
// serve exactly these product videos), leaving the UI untouched.

export interface ReelFixture {
  id: string;
  video: string; // Cloudinary video URL (delivered via imageSource)
  productId: string; // real yiiva_demo product → /product/:id
  productName: string;
  description: string;
  priceInCents: number;
  merchant: { username: string; displayName: string; logo: string };
}

const SAKANYA_LOGO = 'https://res.cloudinary.com/yiiva-dev/image/upload/v1781607526/demo/sakanya/8020ce84de746f13.png';
const SUHU_LOGO = 'https://res.cloudinary.com/yiiva-dev/image/upload/v1781607541/demo/suhu/75676ba03a4c78cf.png';
const TOLTHEMA_LOGO = 'https://res.cloudinary.com/yiiva-dev/image/upload/v1781607586/demo/tolthema/bed9f7b38d2036db.png';

const SAKANYA = { username: 'sakanya', displayName: 'SAKANYA', logo: SAKANYA_LOGO };
const SUHU = { username: 'suhu', displayName: 'Suhu Original', logo: SUHU_LOGO };
const TOLTHEMA = { username: 'tolthema', displayName: "Tol'thema", logo: TOLTHEMA_LOGO };

// Interleaved by merchant so each row of the 2-col search grid mixes brands.
export const REELS: ReelFixture[] = [
  {
    id: 'anaya-maxi',
    video: 'https://res.cloudinary.com/yiiva-dev/video/upload/v1781864829/demo/sakanya/d59e8a55b8c7f1e6.mp4',
    productId: 'cmqksbd1u001m20w4u8nczo4h',
    productName: 'Anaya Maxi Dress',
    description:
      'A brown double-lined knit maxi with faux-fur detailing — made for the woman who loves to make an entrance.',
    priceInCents: 320000,
    merchant: SAKANYA,
  },
  {
    id: 'tolthema-boubou',
    video: 'https://res.cloudinary.com/yiiva-dev/video/upload/v1781865098/demo/tolthema/6f85a938c8719aa6.mp4',
    productId: 'cmqksjm85017on2w4qo4dw884',
    productName: 'Nontsikelelo Boubou (Xhosa)',
    description:
      'Authentic Xhosa-inspired fabric meets four-way stretch — heritage and modern elegance in one statement piece.',
    priceInCents: 125000,
    merchant: TOLTHEMA,
  },
  {
    id: 'suhu-eye-tee',
    video: 'https://res.cloudinary.com/yiiva-dev/video/upload/v1781865059/demo/suhu/0f921e92e8a4c4bd.mp4',
    productId: 'cmqksgapj0086ebw41rw6ffs1',
    productName: 'Suhu Eye Logo T-Shirt, White',
    description:
      'A minimal SUHU Eye tee with left-chest logo embroidery — toned-down, loose-fit, 100% cotton.',
    priceInCents: 69900,
    merchant: SUHU,
  },
  {
    id: 'athena-dress',
    video: 'https://res.cloudinary.com/yiiva-dev/video/upload/v1781864781/demo/sakanya/24630f3428b15f70.mp4',
    productId: 'cmqksbd1h000y20w412d24yl9',
    productName: 'Athena Dress',
    description:
      'A one-of-a-kind red mini with a halter neckline and sultry open back — bold and unforgettable.',
    priceInCents: 220000,
    merchant: SAKANYA,
  },
  {
    id: 'tolthema-grace-coat',
    video: 'https://res.cloudinary.com/yiiva-dev/video/upload/v1781865209/demo/tolthema/896049a33a63b3cf.mp4',
    productId: 'cmqksjm4p00vqn2w4oc1jvq36',
    productName: 'The Grace Coat',
    description:
      'Premium fabric, deep pockets, a detachable belt and scarf — 9+ ways to style your everyday warmth.',
    priceInCents: 129900,
    merchant: TOLTHEMA,
  },
  {
    id: 'elle-gown',
    video: 'https://res.cloudinary.com/yiiva-dev/video/upload/v1781864722/demo/sakanya/590b1feba4279fe9.mp4',
    productId: 'cmqksbd0s000720w495ninamj',
    productName: 'Elle Gown',
    description: "An elevated floor-length gown — one of SAKANYA's most striking statement pieces.",
    priceInCents: 360000,
    merchant: SAKANYA,
  },
  {
    id: 'suhu-bafana-jersey',
    video: 'https://res.cloudinary.com/yiiva-dev/video/upload/v1781865053/demo/suhu/27ae9b7d169eae00.mp4',
    productId: 'cmqksgaly001febw4ekruhrbf',
    productName: 'Bafana Imagined Football Jersey',
    description:
      "SUHU's imagined Bafana jersey in green and gold — lightweight, quick-dry, regular fit.",
    priceInCents: 79900,
    merchant: SUHU,
  },
  {
    id: 'tolthema-kimono',
    video: 'https://res.cloudinary.com/yiiva-dev/video/upload/v1781865203/demo/tolthema/f56ca9e61bed9325.mp4',
    productId: 'cmqksjm8h018bn2w4p7qwuoif',
    productName: 'Long Sleeve Snatched Kimono',
    description:
      'A sleek snatched-waist kimono with a corset belt — polished versatility, worn open or as a dress.',
    priceInCents: 120000,
    merchant: TOLTHEMA,
  },
  {
    id: 'lia-mini',
    video: 'https://res.cloudinary.com/yiiva-dev/video/upload/v1781864763/demo/sakanya/557e907e3d37b54d.mp4',
    productId: 'cmqksbd1c000m20w4wuo6378e',
    productName: 'Lia Mini Dress',
    description:
      'A crisp white mini with a heart neckline and under-bust cut-out — elegant, playful, with pockets.',
    priceInCents: 320000,
    merchant: SAKANYA,
  },
  {
    id: 'tolthema-pants-set',
    video: 'https://res.cloudinary.com/yiiva-dev/video/upload/v1781865214/demo/tolthema/c5820f3bc3444652.mp4',
    productId: 'cmqksjm2t00man2w4alcipkqg',
    productName: 'The Snatched Pants Set',
    description:
      'A three-piece set — wide-leg trousers, a structured top and a corset belt for a snatched waist.',
    priceInCents: 140000,
    merchant: TOLTHEMA,
  },
];
