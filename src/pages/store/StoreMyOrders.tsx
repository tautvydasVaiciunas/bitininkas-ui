import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import lt from "date-fns/locale/lt";

import api from "@/lib/api";
import { StoreLayout } from "./StoreLayout";
import { formatPrice } from "./utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_LABELS: Record<string, string> = {
  new: "Naujas",
  cancelled: "Atšauktas",
};

const StoreMyOrders = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["store-my-orders"],
    queryFn: () => api.store.myOrders(),
  });

  return (
    <StoreLayout>
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Mano užsakymai</h1>
        <p className="text-muted-foreground">Matykite savo pateiktų užsakymų istoriją ir būsenas.</p>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      )}

      {isError && (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            Nepavyko įkelti užsakymų. Bandykite dar kartą.
          </CardContent>
        </Card>
      )}

      {!isLoading && data && data.length === 0 && (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            Dar neturite užsakymų.
          </CardContent>
        </Card>
      )}

      {data && data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Užsakymų sąrašas</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Data</th>
                  <th className="px-3 py-2 font-medium">Statusas</th>
                  <th className="px-3 py-2 font-medium">Suma (su PVM)</th>
                  <th className="px-3 py-2 font-medium">Prekės</th>
                </tr>
              </thead>
              <tbody>
                {data.map((order) => (
                  <tr key={order.id} className="border-t">
                    <td className="px-3 py-2">
                      {format(new Date(order.createdAt), "yyyy-MM-dd HH:mm", { locale: lt })}
                    </td>
                    <td className="px-3 py-2">{STATUS_LABELS[order.status] ?? order.status}</td>
                    <td className="px-3 py-2">
                      {formatPrice(order.totalGrossCents ?? order.totalAmountCents)}
                    </td>
                    <td className="px-3 py-2">{renderItemsSummary(order)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </StoreLayout>
  );
};

const renderItemsSummary = (
  order: Awaited<ReturnType<typeof api.store.myOrders>>[number],
) => {
  if (!order.items.length) {
    return "Prekių nėra";
  }

  const totalCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const first = order.items[0];

  if (order.items.length === 1) {
    return `${first.productTitle} × ${first.quantity}`;
  }

  return `${first.productTitle} × ${first.quantity} (+${totalCount - first.quantity} vnt.)`;
};

export default StoreMyOrders;
