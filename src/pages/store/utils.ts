import { netToGrossCents, VAT_RATE } from '@/lib/storePricing';

const formatter = new Intl.NumberFormat('lt-LT', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
});

export const formatPrice = (cents: number) => formatter.format(cents / 100);

export { netToGrossCents, VAT_RATE };
