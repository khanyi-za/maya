// Display formatters for API values.
// Money is integer ZAR cents on the wire (see docs/api-conventions.md §Money).

/**
 * Format integer ZAR cents as a Rand string.
 * 89900 -> "R899.00"
 */
export function formatZAR(cents: number): string {
  return `R${(cents / 100).toFixed(2)}`;
}
