import { Link } from "react-router-dom";

import { StoreLayout } from "./StoreLayout";
import { useCart } from "@/contexts/CartContext";
import { formatPrice, netToGrossCents } from "./utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const StoreCart = () => {
  const { items, updateQuantity, removeItem, subtotalNetCents, vatCents, totalGrossCents } =
    useCart();

  const handleQuantityChange = (productId: string, value: string) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    updateQuantity(productId, parsed);
  };

  return (
    <StoreLayout>
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Krepšelis</h1>
        <p className="text-muted-foreground">Peržiūrėkite produktus prieš pateikdami užsakymą.</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border bg-white p-6 text-center shadow-sm">
          <p className="mb-4 text-muted-foreground">Krepšelis tuščias.</p>
          <Button asChild>
            <Link to="/parduotuve">Grįžti į parduotuvę</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-6 lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)] lg:items-start lg:gap-6">
          <div className="order-2 space-y-4 rounded-lg border bg-white p-4 shadow-sm lg:order-1">
            {items.map((item) => {
              const grossUnit = netToGrossCents(item.priceCents);
              const placeholderSvg = `data:image/svg+xml,%3Csvg width='64' height='64' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='64' height='64' rx='8' fill='%23f8fafc'/%3E%3Ctext x='32' y='37' font-size='24' text-anchor='middle' fill='%2394a3b8'%3E%3F%3C/text%3E%3C/svg%3E`;
              return (
                <div
                  key={item.productId}
                  className="flex flex-col gap-4 border-b pb-4 last:border-b-0"
                >
                  <div className="flex gap-4">
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-border bg-muted-foreground/10">
                      <img
                        src={item.imageUrl ?? placeholderSvg}
                        alt={item.title}
                        loading="lazy"
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          if (event.currentTarget.src === placeholderSvg) return;
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = placeholderSvg;
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatPrice(item.priceCents)} (be PVM) / {formatPrice(grossUnit)} (su PVM)
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min={1}
                        className="w-24"
                        value={item.quantity}
                        onChange={(event) => handleQuantityChange(item.productId, event.target.value)}
                      />
                      <div className="text-right font-semibold">
                        <p>{formatPrice(grossUnit * item.quantity)}</p>
                        <p className="text-xs text-muted-foreground">
                          ({formatPrice(item.priceCents * item.quantity)} be PVM)
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" onClick={() => removeItem(item.productId)}>
                      Pašalinti
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="order-1 space-y-3 lg:order-2">
            <div className="sticky top-6 space-y-3 lg:z-10">
              <div className="space-y-3 rounded-lg border bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 text-sm sm:text-base">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tarpinė suma (be PVM)</span>
                    <span className="font-medium">{formatPrice(subtotalNetCents)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">PVM (21%)</span>
                    <span className="font-medium">{formatPrice(vatCents)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t pt-3">
                  <span className="text-sm text-muted-foreground">Iš viso (su PVM)</span>
                  <span className="text-2xl font-bold text-right">{formatPrice(totalGrossCents)}</span>
                </div>
              </div>
              <div className="space-y-3 rounded-lg border bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <Button asChild className="w-full sm:w-auto">
                    <Link to="/parduotuve/uzsakymas" className="block text-center">
                      Pereiti prie užsakymo
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full sm:w-auto">
                    <Link to="/parduotuve" className="block text-center">
                      Tęsti apsipirkimą
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </StoreLayout>
  );
};

export default StoreCart;
