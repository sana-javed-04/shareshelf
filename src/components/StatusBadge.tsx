import { CheckCircle2, CircleDot, Clock, PackageCheck, RotateCcw, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ItemStatus, ListingType, TransactionStatus } from "@/lib/types";

const ITEM_STYLES: Record<ItemStatus, { className: string; Icon: typeof CheckCircle2 }> = {
  Available: { className: "bg-success/15 text-success border-success/30", Icon: CheckCircle2 },
  Reserved: { className: "bg-warning/20 text-warning border-warning/35", Icon: Clock },
  Rented: { className: "bg-info/15 text-info border-info/30", Icon: PackageCheck },
  Sold: { className: "bg-muted text-muted-foreground border-border", Icon: XCircle },
};

const TX_STYLES: Record<TransactionStatus, { className: string; Icon: typeof CheckCircle2 }> = {
  Pending: { className: "bg-warning/20 text-warning border-warning/35", Icon: Clock },
  Active: { className: "bg-info/15 text-info border-info/30", Icon: CircleDot },
  Returned: { className: "bg-success/15 text-success border-success/30", Icon: RotateCcw },
  Completed: { className: "bg-success/15 text-success border-success/30", Icon: CheckCircle2 },
  Cancelled: { className: "bg-muted text-muted-foreground border-border", Icon: XCircle },
  Rejected: {
    className: "bg-destructive/12 text-destructive border-destructive/30",
    Icon: XCircle,
  },
};

const base =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-tight";

export function StatusBadge({ status, className }: { status: ItemStatus; className?: string }) {
  const { className: tone, Icon } = ITEM_STYLES[status];
  return (
    <span className={cn(base, tone, className)}>
      <Icon className="size-3.5" aria-hidden="true" />
      {status}
    </span>
  );
}

export function TransactionStatusBadge({
  status,
  className,
}: {
  status: TransactionStatus;
  className?: string;
}) {
  const { className: tone, Icon } = TX_STYLES[status] ?? TX_STYLES.Pending;
  return (
    <span className={cn(base, tone, className)}>
      <Icon className="size-3.5" aria-hidden="true" />
      {status}
    </span>
  );
}

const LISTING_STYLES: Record<ListingType, string> = {
  RENT: "bg-info/15 text-info border-info/30",
  DONATE: "bg-success/15 text-success border-success/30",
  SELL: "bg-warning/20 text-warning border-warning/40",
};

const LISTING_LABEL: Record<ListingType, string> = {
  RENT: "For rent",
  DONATE: "Donation",
  SELL: "For sale",
};

export function ListingTypeBadge({ type, className }: { type: ListingType; className?: string }) {
  return <span className={cn(base, LISTING_STYLES[type], className)}>{LISTING_LABEL[type]}</span>;
}
