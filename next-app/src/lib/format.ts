export const currency = (n: string | number | null | undefined) => {
  const v = Number(n ?? 0);
  return "₹" + v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const formatDate = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export const formatDateTime = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const VEHICLE_TYPES = ["CAR", "BIKE", "SCOOTY", "AUTO", "OTHER"] as const;

export const vehicleTypeLabel = (t: string | null | undefined) => {
  if (!t) return "—";
  const map: Record<string, string> = {
    CAR: "Car",
    BIKE: "Bike",
    SCOOTY: "Scooty",
    AUTO: "Auto",
    OTHER: "Other",
  };
  return map[t] ?? t;
};

export const PAYMENT_METHODS = ["CASH", "UPI", "CARD", "BANK_TRANSFER", "OTHER"] as const;

export const paymentMethodLabel = (m: string | null | undefined) => {
  if (!m) return "—";
  const map: Record<string, string> = {
    CASH: "Cash",
    UPI: "UPI",
    CARD: "Card",
    BANK_TRANSFER: "Bank Transfer",
    OTHER: "Other",
  };
  return map[m] ?? m;
};

export const jobStatusLabel = (s: string | null | undefined) => {
  if (!s) return "—";
  const map: Record<string, string> = {
    OPEN: "Open",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  };
  return map[s] ?? s;
};

export const invoiceStatusLabel = (s: string | null | undefined) => {
  if (!s) return "—";
  const map: Record<string, string> = {
    ISSUED: "Issued",
    PARTIALLY_PAID: "Partially Paid",
    PAID: "Paid",
    CANCELLED: "Cancelled",
  };
  return map[s] ?? s;
};