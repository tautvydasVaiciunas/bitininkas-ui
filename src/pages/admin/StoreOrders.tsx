import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import lt from "date-fns/locale/lt";
import { Loader2 } from "lucide-react";

import api, { type StoreOrderListItem } from "@/lib/api";
import { formatPrice } from "../store/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_SIZE = 10;

const statusLabels: Record<string, string> = {
  new: "Naujas",
  cancelled: "Atšauktas",
};

const StoreOrders = () => {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["admin-store-orders", page],
    queryFn: () => api.admin.store.orders.list({ page, limit: PAGE_SIZE }),
    keepPreviousData: true,
  });

  const orders = data?.data ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Užsakymai</CardTitle>
            <p className="text-sm text-muted-foreground">
              Naujausi parduotuvės užsakymai. Pasirinkite įrašą, kad matytumėte detales.
            </p>
          </div>
          {isFetching && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-3 py-2 font-medium">Data</th>
                <th className="px-3 py-2 font-medium">Klientas</th>
                <th className="px-3 py-2 font-medium">Suma</th>
                <th className="px-3 py-2 font-medium">Statusas</th>
                <th className="px-3 py-2 font-medium text-right">Veiksmai</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index}>
                      <td colSpan={5} className="px-3 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    </tr>
                  ))
                : orders.map((order) => <OrderRow key={order.id} order={order} />)}
            </tbody>
          </table>

          {isError && (
            <p className="mt-4 text-sm text-destructive">Nepavyko įkelti užsakymų.</p>
          )}
          {orders.length === 0 && !isLoading && (
            <p className="mt-4 text-sm text-muted-foreground">Užsakymų nėra.</p>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          disabled={page === 1 || isFetching}
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
        >
          Atgal
        </Button>
        <p className="text-sm text-muted-foreground">
          Puslapis {page} / {totalPages}
        </p>
        <Button
          variant="outline"
          disabled={isFetching || (data ? page >= totalPages : true)}
          onClick={() => setPage((prev) => prev + 1)}
        >
          Pirmyn
        </Button>
      </div>
    </div>
  );
};

const OrderRow = ({ order }: { order: StoreOrderListItem }) => {
  return (
    <tr className="border-t">
      <td className="px-3 py-2">
        {format(new Date(order.createdAt), "yyyy-MM-dd HH:mm", { locale: lt })}
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-col">
          <span className="font-medium">{order.customerName}</span>
          <span className="text-xs text-muted-foreground">{order.customerEmail}</span>
        </div>
      </td>
      <td className="px-3 py-2">{formatPrice(order.totalAmountCents)}</td>
      <td className="px-3 py-2">{statusLabels[order.status] ?? order.status}</td>
      <td className="px-3 py-2 text-right">
        <Button variant="outline" size="sm" asChild>
          <Link to={`/admin/store/orders/${order.id}`}>Peržiūrėti</Link>
        </Button>
      </td>
    </tr>
  );
};

export default StoreOrders;
