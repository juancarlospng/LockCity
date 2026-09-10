import type { ProductStatus } from "@/lib/types";

const LABELS: Record<ProductStatus, string> = {
  AVAILABLE: "Available",
  PRE_ORDER: "Pre-Order",
  COMING_SOON: "Coming Soon",
  SOLD_OUT: "Sold Out",
  UNKNOWN: "Availability unverified",
};

export function StatusBadge({
  status,
  className = "",
}: {
  status: ProductStatus;
  className?: string;
}) {
  const live = status === "AVAILABLE";
  return (
    <span
      data-testid={`status-${status.toLowerCase().replace("_", "-")}`}
      className={`inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.3em] ${
        status === "SOLD_OUT" ? "text-steel line-through" : "text-bone"
      } ${className}`}
    >
      <span
        aria-hidden
        className={`h-1 w-1 rounded-full ${
          live ? "animate-pulse-dot bg-bone" : "bg-steel"
        }`}
      />
      {LABELS[status]}
    </span>
  );
}
