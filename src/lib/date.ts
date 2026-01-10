import { format } from "date-fns";

const toDate = (value?: string | number | Date | null): Date | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
};

export const formatDateIso = (value?: string | number | Date | null): string | undefined => {
  const date = toDate(value);
  if (!date) {
    return undefined;
  }

  return format(date, "yyyy-MM-dd");
};

export const formatDateIsoOr = (value?: string | number | Date | null, fallback = "—"): string => {
  return formatDateIso(value) ?? fallback;
};
