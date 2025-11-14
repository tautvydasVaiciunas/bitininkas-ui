import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { format } from "date-fns";
import lt from "date-fns/locale/lt";
import { ArrowLeft } from "lucide-react";

import api, { type StoreOrderResponse } from "@/lib/api";
import { formatPrice } from "../store/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const STATUS_LABELS: Record<string, string> = {
  new: "Naujas",
  cancelled: "Atšauktas",
};

const StoreOrderDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useQuery<StoreOrderResponse>({
    queryKey: ["admin-store-order", id],
    queryFn: () => api.admin.store.orders.get(id ?? ""),
    enabled: Boolean(id),
    retry: false,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Kraunama...
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Nepavyko įkelti užsakymo. Patikrinkite adresą arba bandykite dar kartą.
        </CardContent>
      </Card>
    );
  }

  const items = normalizeOrderItems(data.items);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {format(new Date(data.createdAt), "yyyy-MM-dd HH:mm", { locale: lt })}
          </p>
          <h1 className="text-3xl font-bold">Užsakymas #{data.id.slice(0, 8).toUpperCase()}</h1>
          <p className="text-sm text-muted-foreground">
            Būsena: {STATUS_LABELS[data.status] ?? data.status}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/admin/store/orders">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Grįžti
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kliento duomenys</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-2">
          <InfoRow label="Vardas ir pavardė" value={data.customerName} />
          <InfoRow label="El. paštas" value={data.customerEmail} />
          <InfoRow label="Telefonas" value={data.customerPhone} />
          <InfoRow label="Įmonės pavadinimas" value={data.companyName} optional />
          <InfoRow label="Įmonės kodas" value={data.companyCode} optional />
          <InfoRow label="PVM kodas" value={data.vatCode} optional />
          <InfoRow label="Adresas" value={data.address} optional />
          <InfoRow label="Komentaras" value={data.comment} optional fullWidth />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Užsakymo prekės</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="px-3 py-2 font-medium">Produktas</th>
                <th className="px-3 py-2 font-medium">Kiekis</th>
                <th className="px-3 py-2 font-medium">Kaina (be PVM)</th>
                <th className="px-3 py-2 font-medium">Kaina (su PVM)</th>
                <th className="px-3 py-2 font-medium">Suma (su PVM)</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                    Prekių nerasta
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr key={`${item.productTitle}-${index}`} className="border-t">
                    <td className="px-3 py-2">{item.productTitle}</td>
                    <td className="px-3 py-2">{item.quantity}</td>
                    <td className="px-3 py-2">{formatPrice(item.unitNetCents)}</td>
                    <td className="px-3 py-2">{formatPrice(item.unitGrossCents)}</td>
                    <td className="px-3 py-2">{formatPrice(item.lineGrossCents)}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t">
                <td colSpan={4} className="px-3 py-2 text-right font-semibold">
                  Tarpinė suma (be PVM)
                </td>
                <td className="px-3 py-2 font-semibold">
                  {formatPrice(data.subtotalNetCents)}
                </td>
              </tr>
              <tr>
                <td colSpan={4} className="px-3 py-2 text-right font-semibold">
                  PVM (21%)
                </td>
                <td className="px-3 py-2 font-semibold">{formatPrice(data.vatCents)}</td>
              </tr>
              <tr>
                <td colSpan={4} className="px-3 py-2 text-right font-semibold">
                  Iš viso (su PVM)
                </td>
                <td className="px-3 py-2 font-semibold">
                  {formatPrice(data.totalGrossCents ?? data.totalAmountCents)}
                </td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

const InfoRow = ({
  label,
  value,
  optional,
  fullWidth,
}: {
  label: string;
  value?: string | null;
  optional?: boolean;
  fullWidth?: boolean;
}) => {
  const trimmed = value?.trim();
  const display = trimmed && trimmed.length > 0 ? trimmed : optional ? "Nepateikta" : "Nenurodyta";

  return (
    <div className={fullWidth ? "sm:col-span-2" : undefined}>
      <p className="font-semibold text-foreground">{label}</p>
      <p className="break-words text-muted-foreground">{display}</p>
    </div>
  );
};

export default StoreOrderDetails;

function normalizeOrderItems(items: StoreOrderResponse["items"] | undefined) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item, index) => {
    const title = item.productTitle ?? `Preke #${index + 1}`;
    const unitNet = Number.isFinite(item.unitNetCents) ? item.unitNetCents : 0;
    const unitGross = Number.isFinite(item.unitGrossCents) ? item.unitGrossCents : 0;
    const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
    const lineGross =
      Number.isFinite(item.lineGrossCents) && item.lineGrossCents !== undefined
        ? item.lineGrossCents
        : unitGross * quantity;

    return {
      productTitle: title,
      quantity,
      unitNetCents: unitNet,
      unitGrossCents: unitGross,
      lineGrossCents: lineGross,
    };
  });
}
