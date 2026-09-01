/**
 * Currency Formatting Utility for DTF Studio
 */
export const formatCurrency = (
  amount: number,
  currency: string = 'JD',
  isRtl: boolean = false
): string => {
  const val = (Number(amount) || 0).toFixed(2);
  if (isRtl) {
    return `${val} د.أ`;
  }
  return `${val} JD`;
};
