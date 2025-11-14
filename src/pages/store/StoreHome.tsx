import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import api, { type StoreProduct } from "@/lib/api";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { StoreLayout } from "./StoreLayout";
import { formatPrice, netToGrossCents } from "./utils";

const StoreHome = () => {
  const { addItem } = useCart();
  const { toast } = useToast();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["store-products"],
    queryFn: () => api.store.listProducts(),
  });

  const handleAdd = (product: StoreProduct) => {
    addItem(product, 1);
    toast({
      title: "Pridėta į krepšelį",
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
            <Card key={product.id} className="flex h-full flex-col overflow-hidden">
              {product.imageUrls?.length ? (
                <div className="h-48 w-full bg-muted">
                  <img
                    src={product.imageUrls[0]}
                    alt={product.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="h-48 flex w-full items-center justify-center bg-muted text-sm text-muted-foreground">
                  Nėra nuotraukos
                </div>
              )}
              <CardHeader className="flex flex-col gap-3">
                <CardTitle className="flex items-center justify-between gap-4 text-base">
                  <span>{product.title}</span>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Kaina su PVM
                    </p>
                    <p className="text-base font-semibold text-primary">
                      {formatPrice(netToGrossCents(product.priceCents))}
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {product.shortDescription || "Aprašymas bus pateiktas vėliau."}
                </p>
              </CardContent>
              <CardFooter className="mt-auto flex w-full flex-wrap items-end justify-between gap-2">
                <Button asChild variant="outline" size="sm">
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
