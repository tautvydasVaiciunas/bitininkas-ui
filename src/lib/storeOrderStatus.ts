import type { StoreOrderStatus } from "@/lib/api";

export type OrderStatusMeta = {
  label: string;
  badgeClass: string;
};

export const ORDER_STATUS_META: Record<StoreOrderStatus | string, OrderStatusMeta> = {
  new: {
    label: "Naujas užsakymas",
    badgeClass: "border-red-200 bg-red-100 text-red-900",
  },
  in_progress: {
    label: "Vykdoma",
    badgeClass: "border-amber-200 bg-amber-100 text-amber-900",
  },
  completed: {
    label: "Įvykdyta",
    badgeClass: "border-emerald-200 bg-emerald-100 text-emerald-900",
  },
  cancelled: {
    label: "Atšaukta",
    badgeClass: "border-slate-200 bg-slate-100 text-slate-900",
  },
};

export const ORDER_STATUS_OPTIONS: Array<{ value: StoreOrderStatus; label: string }> = [
  { value: "new", label: ORDER_STATUS_META.new.label },
  { value: "in_progress", label: ORDER_STATUS_META.in_progress.label },
  { value: "completed", label: ORDER_STATUS_META.completed.label },
];

export const getOrderStatusMeta = (status: StoreOrderStatus | string): OrderStatusMeta =>
  ORDER_STATUS_META[status] ?? {
    label: status,
    badgeClass: "border-slate-200 bg-slate-100 text-slate-900",
  };
