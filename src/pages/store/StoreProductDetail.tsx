import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import api, { type StoreProduct } from '@/lib/api';
import { StoreLayout } from './StoreLayout';
import { formatPrice } from './utils';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';

const StoreProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();
  const { toast } = useToast();

  const { data, isLoading, isError } = useQuery<StoreProduct>({
    queryKey: ['store-product', slug],
    queryFn: () => api.store.getProduct(slug ?? ''),
    enabled: Boolean(slug),
  });

  const handleAdd = () => {
    if (!data) return;
    addItem(data, quantity);
    toast({
      title: 'Pridėta į krepšelį',
      description: `${quantity} vnt. „${data.title}“ pridėta į krepšelį.`,
    });
  };

  const handleQuantityChange = (value: string) => {
    const parsed = Number(value);
    setQuantity(Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1);
  };

  return (
    <StoreLayout>
      {isLoading && <p>Kraunama...</p>}
      {isError && <p>Nepavyko įkelti produkto. Bandykite dar kartą.</p>}
      {data ? (
        <div className="space-y-6">
          <Link to="/parduotuve" className="text-sm text-primary hover:underline">
            ← Grįžti į produktų sąrašą
          </Link>
          <div className="space-y-4 rounded-lg border bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4">
              <h1 className="text-3xl font-bold">{data.title}</h1>
              <p className="text-lg font-semibold text-primary">{formatPrice(data.priceCents)}</p>
              <p className="text-muted-foreground whitespace-pre-line">{data.description}</p>
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-28">
                <label htmlFor="quantity" className="text-sm font-medium text-muted-foreground">
                  Kiekis
                </label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(event) => handleQuantityChange(event.target.value)}
                />
              </div>
              <Button onClick={handleAdd} className="h-10 px-6">
                Į krepšelį
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </StoreLayout>
  );
};

export default StoreProductDetail;
