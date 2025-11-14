export const VAT_RATE = 0.21;

export const netToGrossCents = (netCents: number): number =>
  Math.round(netCents * (1 + VAT_RATE));

export const calculateCartTotals = (
  items: Array<{ priceCents: number; quantity: number }>,
) => {
  let subtotalNetCents = 0;
  let totalGrossCents = 0;

  for (const item of items) {
    const net = Math.max(0, Math.round(item.priceCents));
    const qty = Math.max(0, Math.floor(item.quantity));
    const gross = netToGrossCents(net);

    subtotalNetCents += net * qty;
    totalGrossCents += gross * qty;
  }

  const vatCents = Math.max(0, totalGrossCents - subtotalNetCents);

  return { subtotalNetCents, totalGrossCents, vatCents };
};
