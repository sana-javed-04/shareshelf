import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { MapPin } from "lucide-react";
import { ListingTypeBadge, StatusBadge } from "@/components/StatusBadge";
import { formatDistance, formatPrice } from "@/lib/utils/formatters";
import type { Item } from "@/lib/types";

// Helper: Extract clean address and strip out the || https://... part
function getCleanLocation(rawLocation?: string | null): string {
  if (!rawLocation) return "Nearby";
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
      <span className="text-[11px] font-medium text-muted-foreground/80">No photo</span>
    </div>
  );
}

export function ItemCard({ item, view = "grid" }: { item: Item; view?: "grid" | "list" }) {
  const distance = formatDistance(item.distance_km);
  const cleanLocation = getCleanLocation(item.area_name);

  // List View (Full Width)
  if (view === "list") {
    return (
      <motion.article
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="card-lift flex flex-col gap-3 rounded-2xl border bg-card p-3.5 sm:flex-row sm:gap-4 sm:p-4"
      >
        <div className="h-40 w-full shrink-0 overflow-hidden rounded-xl sm:h-28 sm:w-36">
          <ItemThumb item={item} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <ListingTypeBadge type={item.listing_type} />
            <StatusBadge status={item.status} />
          </div>
          <h3 className="truncate text-sm font-semibold sm:text-base">{item.title}</h3>
          <p className="line-clamp-2 text-xs text-muted-foreground sm:text-sm">
            {item.description}
          </p>
          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground sm:text-xs">
            <span className="rounded bg-secondary/80 px-1.5 py-0.5">{item.category}</span>
            <span className="rounded bg-secondary/80 px-1.5 py-0.5">{item.item_condition}</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" aria-hidden="true" />
              {cleanLocation}
            </span>
            {distance && <span>· {distance}</span>}
          </div>
        </div>
        <div className="flex flex-row items-center justify-between border-t pt-2 sm:flex-col sm:items-end sm:justify-between sm:border-0 sm:pt-0">
          <p className="font-display text-base font-bold text-primary sm:text-lg">
            {formatPrice(item.price, item.listing_type)}
          </p>
          <Link
            to="/items/$id"
            params={{ id: String(item.id) }}
            className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80"
          >
            View
          </Link>
        </div>
      </motion.article>
    );
  }

  // Grid View (Compact 2-Column Friendly)
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="card-lift group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-soft sm:rounded-2xl"
    >
      <Link
        to="/items/$id"
        params={{ id: String(item.id) }}
        className="flex h-full flex-col focus:outline-none"
        aria-label={`View details for ${item.title}`}
      >
        {/* Compact Responsive Thumbnail */}
        <div className="relative aspect-4/3 w-full overflow-hidden bg-muted/20 sm:h-44 sm:aspect-auto">
          <ItemThumb
            item={item}
            className="transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute left-1.5 top-1.5 flex flex-wrap gap-1 sm:left-2.5 sm:top-2.5">
            <span className="scale-90 origin-top-left sm:scale-100">
              <ListingTypeBadge type={item.listing_type} />
            </span>
          </div>
          {item.status && (
            <div className="absolute right-1.5 top-1.5 hidden sm:block sm:right-2.5 sm:top-2.5">
              <StatusBadge status={item.status} className="bg-card/90 backdrop-blur" />
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex flex-1 flex-col p-2.5 sm:p-4">
          <h3 className="line-clamp-1 text-xs font-semibold text-foreground group-hover:text-primary transition-colors sm:text-base">
            {item.title}
          </h3>

          <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground sm:line-clamp-2 sm:text-xs">
            {item.description}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground sm:text-xs">
            <span className="rounded bg-secondary/80 px-1.5 py-0.5 text-secondary-foreground font-medium truncate max-w-20">
              {item.category}
            </span>
            <span className="hidden sm:inline-block rounded bg-secondary/80 px-1.5 py-0.5 text-secondary-foreground">
              {item.item_condition}
            </span>
          </div>

          <p className="mt-1.5 flex items-center gap-0.5 text-[10px] text-muted-foreground sm:text-xs">
            <MapPin className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate">{cleanLocation}</span>
            {distance && <span className="shrink-0 font-medium">· {distance}</span>}
          </p>

          {/* Bottom Price Section */}
          <div className="mt-auto border-t border-border/40 pt-2 sm:pt-3">
            <div className="flex items-baseline justify-between gap-1">
              <p className="font-display text-xs font-bold text-primary sm:text-base truncate">
                {formatPrice(item.price, item.listing_type)}
              </p>
              <span className="text-[10px] font-semibold text-primary underline sm:hidden">
                Details →
              </span>
            </div>
            {item.listing_type === "RENT" && Boolean(item.security_deposit) && (
              <span className="block text-[9px] text-muted-foreground sm:text-[11px]">
                Deposit: Rs {item.security_deposit}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
