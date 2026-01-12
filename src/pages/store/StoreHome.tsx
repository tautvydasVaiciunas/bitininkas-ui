import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import api, { resolveMediaUrl, type StoreProduct } from "@/lib/api";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StoreLayout } from "./StoreLayout";
import { formatPrice, netToGrossCents } from "./utils";

const StoreHome = () => {
  const { addItem } = useCart();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["store-products"],
    queryFn: () => api.store.listProducts(),
  });

  const filteredProducts = useMemo(() => {
    const products = data ?? [];
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return products;
    }

    return products.filter((product) => {
      const haystack = `${product.title ?? ""} ${product.shortDescription ?? ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [data, searchQuery]);

  const handleAdd = (product: StoreProduct) => {
    addItem(product, 1);
    toast({
      title: "Pridėta į krepšelį",
      description: `${product.title} pridėtas į krepšelį.`,
    });
  };

  const hasProducts = Boolean(data && data.length > 0);
  const hasSearchResults = filteredProducts.length > 0;

  return (
    <StoreLayout>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Parduotuvė</h1>
          <p className="text-muted-foreground">
            Užsisakykite reikalingus rinkinius ir paslaugas internetu. Po užsakymo gausite
            išankstinę sąskaitą el. paštu.
          </p>
        </div>
        <div className="w-full max-w-xs">
          <Label htmlFor="store-product-search" className="sr-only">
            Ieškoti produktų
          </Label>
          <Input
            id="store-product-search"
            placeholder="Ieškoti produktų…"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
      </div>

      {isLoading && <p>Kraunama...</p>}
      {isError && <p>Nepavyko įkelti produktų. Bandykite dar kartą.</p>}

        {hasProducts && hasSearchResults ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="flex h-full flex-col overflow-hidden">
                {product.imageUrls?.length ? (
                  <Link to={`/parduotuve/produktas/${product.slug}`} className="block w-full">
                    <div className="aspect-square w-full overflow-hidden bg-muted">
                      <img
                        src={resolveMediaUrl(product.imageUrls[0]) ?? product.imageUrls[0]}
                        alt={product.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  </Link>
                ) : (
                  <div className="aspect-square flex w-full items-center justify-center bg-muted text-sm text-muted-foreground">
                    Nėra nuotraukos
                  </div>
                )}
                  <CardHeader className="flex flex-col gap-3">
                    <CardTitle className="flex items-center justify-between gap-4 text-base">
                      <Link
                        to={`/parduotuve/produktas/${product.slug}`}
                        className="text-lg md:text-xl font-semibold leading-tight text-foreground transition-colors hover:text-primary"
                      >
                        {product.title}
                    </Link>
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
                <CardFooter className="mt-auto flex w-full flex-wrap gap-2">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="flex-1 min-w-[140px]"
                  >
                    <Link
                      to={`/parduotuve/produktas/${product.slug}`}
                      className="flex-1 text-center text-sm font-semibold leading-tight text-foreground transition-colors hover:text-primary"
                    >
                      Plačiau
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 min-w-[140px]"
                    onClick={() => handleAdd(product)}
                  >
                    Į krepšelį
                  </Button>
                </CardFooter>
            </Card>
          ))}
        </div>
      ) : hasProducts && !hasSearchResults ? (
        <p className="text-center py-6 text-muted-foreground">Nėra produktų pagal paiešką.</p>
      ) : null}

      {!hasProducts && data && data.length === 0 && !isLoading && (
        <p>Šiuo metu produktų nėra.</p>
      )}
  </StoreLayout>
);
};

export default StoreHome;
