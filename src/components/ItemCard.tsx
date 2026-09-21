import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { MapPin, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListingTypeBadge, StatusBadge } from "@/components/StatusBadge";
import { formatDistance, formatPrice } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils";
import type { Item } from "@/lib/types";

const CATEGORY_TINT: Record<string, string> = {
  Books: "from-warning/35 to-primary/25",
  Electronics: "from-info/35 to-accent/25",
  Tools: "from-primary/35 to-success/20",
  Fashion: "from-accent/35 to-warning/20",
  Home: "from-success/30 to-info/25",
  Other: "from-muted to-secondary",
};

// Helper: Extract clean address and strip out the || https://... part
function getCleanLocation(rawLocation?: string | null): string {
  if (!rawLocation) return "Local Area";
  if (rawLocation.includes("||")) {
    return rawLocation.split("||")[0].trim();
  }
  return rawLocation.trim();
}

export function ItemThumb({ item, className = "" }: { item: Item; className?: string }) {
  const images = item.image_path
    ? item.image_path
        .split("||")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const primaryImage = images[0] || null;

  if (primaryImage) {
    return (
      <img
        src={primaryImage}
        alt={item.title}
        loading="lazy"
        className={`h-full w-full object-cover transition duration-300 group-hover:scale-105 ${className}`}
        onError={(e) => {
          (e.currentTarget as HTMLElement).style.display = "none";
        }}
      />
    );
  }

  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-muted/40 text-muted-foreground ${className}`}
    >
      <span className="text-xs font-medium">No photo</span>
    </div>
  );
}
export function ItemCard({ item, view = "grid" }: { item: Item; view?: "grid" | "list" }) {
  const distance = formatDistance(item.distance_km);
  const cleanLocation = getCleanLocation(item.area_name);

  if (view === "list") {
    return (
      <motion.article
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="card-lift flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row"
      >
        <div className="h-36 w-full shrink-0 overflow-hidden rounded-xl sm:h-28 sm:w-40">
          <ItemThumb item={item} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <ListingTypeBadge type={item.listing_type} />
            <StatusBadge status={item.status} />
          </div>
          <h3 className="truncate text-base font-semibold">{item.title}</h3>
          <p className="line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{item.category}</span>
            <span>{item.item_condition}</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden="true" />
              {cleanLocation}
            </span>
            {distance && <span>{distance}</span>}
          </div>
        </div>
        <div className="flex flex-row items-center justify-between gap-3 sm:flex-col sm:items-end">
          <p className="font-display text-lg font-bold text-primary">
            {formatPrice(item.price, item.listing_type)}
          </p>
          <Button asChild size="sm">
            <Link to="/items/$id" params={{ id: String(item.id) }}>
              View details
            </Link>
          </Button>
        </div>
      </motion.article>
    );
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="card-lift group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-soft"
    >
      <div className="relative h-44 overflow-hidden">
        <ItemThumb
          item={item}
          className="transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <ListingTypeBadge type={item.listing_type} className="backdrop-blur" />
        </div>
        <div className="absolute right-3 top-3">
          <StatusBadge status={item.status} className="bg-card/90 backdrop-blur" />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <h3 className="line-clamp-1 text-base font-semibold">{item.title}</h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="rounded-md bg-secondary px-2 py-0.5 text-secondary-foreground">
            {item.category}
          </span>
          <span className="rounded-md bg-secondary px-2 py-0.5 text-secondary-foreground">
            {item.item_condition}
          </span>
        </div>
        <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{cleanLocation}</span>
          {distance && <span className="ml-1 font-medium text-foreground/70">· {distance}</span>}
        </p>

        {/* Bottom Price & Action Section with Security Deposit Badge */}
        <div className="mt-auto flex items-end justify-between pt-3">
          <div className="flex flex-col">
            <p className="font-display text-lg font-bold text-primary">
              {formatPrice(item.price, item.listing_type)}
            </p>
            {item.listing_type === "RENT" && Boolean(item.security_deposit) && (
              <span className="text-[11px] font-medium text-muted-foreground">
                Deposit: Rs {item.security_deposit}
              </span>
            )}
          </div>

          <Button asChild size="sm" variant="secondary">
            <Link to="/items/$id" params={{ id: String(item.id) }}>
              View details
            </Link>
          </Button>
        </div>
      </div>
    </motion.article>
  );
}
