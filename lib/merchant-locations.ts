/**
 * Brand store locations for the merchant profile's Locations row, keyed by
 * merchant username (store slug).
 *
 * Only OWNER-SUPPLIED REAL locations live here. Every other brand shows a
 * plain "Cape Town" line (owner call 2026-07-13) — no invented mock
 * storefronts.
 *
 * ⚠ SWAP POINT: once real store locations are loaded into nuwa and served on
 * the merchant profile (e.g. a `merchant.locations[]` field), delete this
 * file and read them from the API — `merchantLocations()` is the only
 * consumer-facing seam. The REAL entries below can seed the backend data.
 */

export type MerchantLocation = {
  id: string;
  /** Storefront / area name, e.g. "44 Stanley" or "V&A Waterfront". */
  label: string;
  /** Street line. Empty for the generic city-only fallback. */
  address: string;
  /** Suburb + city display line. */
  city: string;
};

const MERCHANT_LOCATIONS: Record<string, MerchantLocation[]> = {
  // ✓ REAL locations (owner-supplied 2026-07-10) — not mock, keep when the
  // rest of this file is replaced by API data.
  '5thavefashion': [
    {
      id: '5thavefashion-1',
      label: 'Longmarket Street',
      address: '161 Longmarket Street',
      city: 'Cape Town',
    },
    {
      id: '5thavefashion-2',
      label: 'Kelvin Street',
      address: '140B Kelvin Street',
      city: 'Sandton, Gauteng',
    },
    {
      id: '5thavefashion-3',
      label: 'Menlyn Park Mall',
      address: 'Shop LF40A, Atterbury & Lois Ave Road',
      city: 'Menlyn, Pretoria',
    },
  ],
  // ✓ REAL locations (owner-supplied 2026-07-10) — not mock.
  hannahlavery: [
    {
      id: 'hannahlavery-1',
      label: 'Alfred Mall, V&A Waterfront',
      address: 'Shop 4, Dock Road',
      city: 'Cape Town',
    },
    {
      id: 'hannahlavery-2',
      label: 'Parkhurst',
      address: 'Shop 5 Sunlit Court, 34 4th Avenue',
      city: 'Parkhurst, Randburg',
    },
  ],
  // ✓ REAL locations (owner-supplied 2026-07-09) — not mock.
  fieldsstore: [
    {
      id: 'fieldsstore-1',
      label: 'Old Biscuit Mill',
      address: '375 Albert Road',
      city: 'Woodstock, Cape Town',
    },
    {
      id: 'fieldsstore-2',
      label: 'V&A Waterfront',
      address: 'Main Mall, Upper Level',
      city: 'Cape Town',
    },
    {
      id: 'fieldsstore-3',
      label: 'De Wet Square',
      address: 'Cnr Bird and Church Street',
      city: 'Stellenbosch',
    },
    {
      id: 'fieldsstore-4',
      label: '44 Stanley',
      address: '44 Stanley Ave',
      city: 'Johannesburg',
    },
  ],
};

/**
 * Locations for a brand: real owner-supplied entries when we have them,
 * otherwise the generic city-only line ("Cape Town"). The address-less
 * fallback renders as plain text (no dropdown) on the profile.
 */
export function merchantLocations(
  username: string | undefined,
): MerchantLocation[] {
  const real = username ? MERCHANT_LOCATIONS[username] : undefined;
  if (real?.length) return real;
  return [
    {
      id: `${username ?? 'store'}-city`,
      label: '',
      address: '',
      city: 'Cape Town',
    },
  ];
}
