import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import api, { resolveMediaUrl, type StoreProduct } from "@/lib/api";
import { StoreLayout } from "./StoreLayout";
import { formatPrice, netToGrossCents } from "./utils";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";

const StoreProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const { addItem } = useCart();
  const { toast } = useToast();

  const { data, isLoading, isError } = useQuery<StoreProduct>({
    queryKey: ["store-product", slug],
    queryFn: () => api.store.getProduct(slug ?? ""),
    enabled: Boolean(slug),
    onSuccess: (product) => {
      if (product.imageUrls?.length) {
        setActiveImage(product.imageUrls[0]);
      }
    },
  });

  useEffect(() => {
    if (!activeImage && data?.imageUrls?.length) {
      setActiveImage(data.imageUrls[0]);
    }
  }, [activeImage, data]);

  const handleAdd = () => {
    if (!data) return;
    addItem(data, quantity);
    toast({
      title: "Pridėta į krepšelį",
      description: `${quantity} vnt. „${data.title}“ pridėta į krepšelį.`,
    });
  };

  const handleQuantityChange = (value: string) => {
    const parsed = Number(value);
    setQuantity(Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1);
  };

  const resolvedActiveImage = activeImage ? resolveMediaUrl(activeImage) ?? activeImage : undefined;

  return (
    <StoreLayout>
      {isLoading && <p>Kraunama...</p>}
      {isError && <p>Nepavyko įkelti produkto. Bandykite dar kartą.</p>}
      {data ? (
        <div className="space-y-6">
          <Link to="/parduotuve" className="text-sm text-primary hover:underline">
            ← Grįžti į produktų sąrašą
          </Link>
          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-4">
              {resolvedActiveImage ? (
                <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted">
                  <img
                    src={resolvedActiveImage}
                    alt={data.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-square flex w-full items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
                  Nėra nuotraukos
                </div>
              )}
              {data.imageUrls?.length ? (
                <div className="flex flex-wrap gap-3">
                  {data.imageUrls.slice(0, 5).map((url) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setActiveImage(url)}
                      className={`aspect-square h-16 overflow-hidden rounded border ${
                        activeImage === url ? "border-primary" : "border-transparent"
                      }`}
                    >
                      <img
                        src={resolveMediaUrl(url) ?? url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="space-y-4 rounded-lg border bg-white p-6 shadow-sm">
              <h1 className="text-3xl font-bold">{data.title}</h1>
              <div>
                <p className="text-sm text-muted-foreground">Kaina su PVM</p>
                <p className="text-2xl font-semibold text-primary">
                  {formatPrice(netToGrossCents(data.priceCents))}
                </p>
                <p className="text-sm text-muted-foreground">
                  ({formatPrice(data.priceCents)} be PVM)
                </p>
              </div>
              <p className="text-muted-foreground whitespace-pre-line">{data.description}</p>

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
        </div>
      ) : null}
    </StoreLayout>
  );
};

export default StoreProductDetail;
