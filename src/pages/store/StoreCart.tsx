import { Link } from 'react-router-dom';

import { StoreLayout } from './StoreLayout';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from './utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const StoreCart = () => {
  const { items, updateQuantity, removeItem, totalAmountCents } = useCart();

  const handleQuantityChange = (productId: string, value: string) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    updateQuantity(productId, parsed);
  };

  return (
    <StoreLayout>
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Krepšelis</h1>
        <p className="text-muted-foreground">Peržiūrėkite pasirinktus produktus prieš pateikdami užsakymą.</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border bg-white p-6 text-center shadow-sm">
          <p className="mb-4 text-muted-foreground">Krepšelis tuščias.</p>
          <Button asChild>
            <Link to="/parduotuve">Grįžti į parduotuvę</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-4 rounded-lg border bg-white p-4 shadow-sm">
            {items.map((item) => (
              <div
                key={item.productId}
                className="flex flex-col gap-4 border-b pb-4 last:border-b-0 sm:flex-row sm:items-center"
              >
                <div className="flex-1">
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{formatPrice(item.priceCents)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    className="w-24"
                    value={item.quantity}
                    onChange={(event) => handleQuantityChange(item.productId, event.target.value)}
                  />
                  <p className="text-sm font-semibold">
                    {formatPrice(item.priceCents * item.quantity)}
                  </p>
                  <Button variant="ghost" onClick={() => removeItem(item.productId)}>
                    Pašalinti
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-4 rounded-lg border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Iš viso</p>
              <p className="text-2xl font-bold">{formatPrice(totalAmountCents)}</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button asChild variant="outline">
                <Link to="/parduotuve">Tęsti apsipirkimą</Link>
              </Button>
              <Button asChild>
                <Link to="/parduotuve/uzsakymas">Pereiti prie užsakymo</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </StoreLayout>
  );
};

export default StoreCart;
