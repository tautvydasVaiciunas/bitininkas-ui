import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import api, { type StoreProduct } from '@/lib/api';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { StoreLayout } from './StoreLayout';
import { formatPrice } from './utils';

const StoreHome = () => {
  const { addItem } = useCart();
  const { toast } = useToast();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['store-products'],
    queryFn: () => api.store.listProducts(),
  });

  const handleAdd = (product: StoreProduct) => {
    addItem(product, 1);
    toast({
      title: 'Pridėta į krepšelį',
      description: `${product.title} pridėtas į krepšelį.`,
    });
  };

  return (
    <StoreLayout>
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Parduotuvė</h1>
        <p className="text-muted-foreground">
          Užsisakykite reikalingus rinkinius ir paslaugas internetu. Po užsakymo gausite
          išankstinę sąskaitą el. paštu.
        </p>
      </div>

      {isLoading && <p>Kraunama...</p>}
      {isError && <p>Nepavyko įkelti produktų. Bandykite dar kartą.</p>}

      {data && data.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {data.map((product) => (
            <Card key={product.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{product.title}</span>
                  <span className="text-base font-semibold text-primary">
                    {formatPrice(product.priceCents)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {product.shortDescription || 'Aprašymas bus pateiktas vėliau.'}
                </p>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link to={`/parduotuve/produktas/${product.slug}`}>Daugiau informacijos</Link>
                </Button>
                <Button onClick={() => handleAdd(product)}>Į krepšelį</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : null}

      {data && data.length === 0 && !isLoading && <p>Šiuo metu produktų nėra.</p>}
    </StoreLayout>
  );
};

export default StoreHome;
