import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  ExternalLink,
  LayoutGrid,
  List,
  LocateFixed,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { SiteLayout, PageHeader } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ItemCard } from "@/components/ItemCard";
import { ItemGridSkeleton } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { itemService } from "@/services/itemService";
import { useAuth } from "@/context/AuthContext";
import { CATEGORIES, CONDITIONS, LISTING_TYPES, RADIUS_OPTIONS, type ItemQuery } from "@/lib/types";

export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Browse nearby items — ShareShelf" },
      {
        name: "description",
        content:
          "Search rentals, donations and second-hand items near you. Filter by category, condition, price and distance on ShareShelf.",
      },
      { property: "og:title", content: "Browse nearby items — ShareShelf" },
      {
        property: "og:description",
        content: "Find tools, books, electronics and more shared by people in your neighbourhood.",
      },
    ],
  }),
  component: BrowsePage,
});

const ANY = "any";
const PAGE_SIZE = 12;
const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "nearest", label: "Nearest to me" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
] as const;

type Filters = {
  q: string;
  listing_type: string;
  category: string;
  item_condition: string;
  area: string;
  maxPrice: number;
  radius: number;
  sort: (typeof SORTS)[number]["value"];
};

const INITIAL: Filters = {
  q: "",
  listing_type: ANY,
  category: ANY,
  item_condition: ANY,
  area: "",
  maxPrice: 0,
  radius: 0,
  sort: "newest",
};

const LOCAL_LANDMARKS: Record<string, { lat: number; lng: number }> = {
  dhq: { lat: 30.8122, lng: 73.4475 },
  hospital: { lat: 30.8122, lng: 73.4475 },
  okara: { lat: 30.8138, lng: 73.4534 },
  sabri: { lat: 30.8095, lng: 73.448 },
  samadpura: { lat: 30.811, lng: 73.451 },
  campus: { lat: 30.835, lng: 73.438 },
  lahore: { lat: 31.5204, lng: 74.3587 },
};

function parseCoords(text: string): { lat: number; lng: number } | null {
  const match = text.match(/(@|q=|\?ll=)(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match) {
    return { lat: parseFloat(match[2]), lng: parseFloat(match[3]) };
  }
  const rawMatch = text.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);
  if (rawMatch) {
    return { lat: parseFloat(rawMatch[1]), lng: parseFloat(rawMatch[2]) };
  }
  return null;
}

function BrowsePage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<Filters>(INITIAL);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);

  const [center, setCenter] = useState<{ lat: number; lng: number }>(() =>
    user?.latitude != null && user?.longitude != null
      ? { lat: user.latitude, lng: user.longitude }
      : { lat: 30.8138, lng: 73.4534 },
  );

  useEffect(() => {
    if (user?.area_name) {
      setFilters((f) => (f.area ? f : { ...f, area: user.area_name || "" }));
    }
    if (user?.latitude != null && user?.longitude != null) {
      setCenter({ lat: user.latitude, lng: user.longitude });
    }
  }, [user?.area_name, user?.latitude, user?.longitude]);

  useEffect(() => {
    const raw = filters.area.trim();
    if (!raw) return;

    const parsed = parseCoords(raw);
    if (parsed) {
      setCenter(parsed);
      return;
    }

    const lower = raw.toLowerCase();
    for (const [key, coords] of Object.entries(LOCAL_LANDMARKS)) {
      if (lower.includes(key)) {
        setCenter(coords);
        return;
      }
    }

    const timer = setTimeout(() => {
      fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(raw)}&limit=1`,
      )
        .then((res) => res.json())
        .then((data) => {
          if (data && data[0]) {
            setCenter({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
          }
        })
        .catch(() => {});
    }, 500);

    return () => clearTimeout(timer);
  }, [filters.area]);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCenter(coords);
      setFilters((f) => ({ ...f, area: "Current Location (GPS)" }));
    });
  }

  const query: ItemQuery = {
    q: filters.q || undefined,
    listing_type:
      filters.listing_type === ANY
        ? undefined
        : (filters.listing_type as ItemQuery["listing_type"]),
    category: filters.category === ANY ? undefined : (filters.category as ItemQuery["category"]),
    item_condition:
      filters.item_condition === ANY
        ? undefined
        : (filters.item_condition as ItemQuery["item_condition"]),
    area: (!center.lat || !center.lng) && filters.area.trim() ? filters.area.trim() : undefined,
    max_price: filters.maxPrice > 0 ? filters.maxPrice : undefined,
    lat: center.lat,
    lng: center.lng,
    radius_km: filters.radius > 0 ? filters.radius : undefined,
    sort: filters.sort,
    page,
    page_size: PAGE_SIZE,
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["items", query],
    queryFn: () => itemService.list(query),
    placeholderData: keepPreviousData,
  });

  const results = data?.results ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function update<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  const activeCount = [
    filters.q,
    filters.listing_type !== ANY ? "1" : "",
    filters.category !== ANY ? "1" : "",
    filters.item_condition !== ANY ? "1" : "",
    filters.area,
    filters.maxPrice > 0 ? "1" : "",
    filters.radius > 0 ? "1" : "",
  ].filter(Boolean).length;

  const filterPanel = (
    <div className="space-y-6 rounded-2xl border bg-card p-5 shadow-soft">
      <div className="space-y-2">
        <Label htmlFor="filter-type">Listing type</Label>
        <Select value={filters.listing_type} onValueChange={(v) => update("listing_type", v)}>
          <SelectTrigger id="filter-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any type</SelectItem>
            {LISTING_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t === "RENT" ? "For rent" : t === "DONATE" ? "Donation" : "For sale"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="filter-category">Category</Label>
        <Select value={filters.category} onValueChange={(v) => update("category", v)}>
          <SelectTrigger id="filter-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="filter-condition">Condition</Label>
        <Select value={filters.item_condition} onValueChange={(v) => update("item_condition", v)}>
          <SelectTrigger id="filter-condition">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any condition</SelectItem>
            {CONDITIONS.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 rounded-xl border bg-muted/40 p-3.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="filter-area" className="text-sm font-semibold">
            Area / City
          </Label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={useMyLocation}
              title="Use current GPS"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
            >
              <LocateFixed className="size-3" />
              GPS
            </button>
            <button
              type="button"
              onClick={() => window.open("https://www.google.com/maps", "_blank")}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
            >
              <MapPin className="size-3" />
              Maps
            </button>
          </div>
        </div>

        <Input
          id="filter-area"
          value={filters.area}
          maxLength={100}
          placeholder="e.g. DHQ Hospital, Okara"
          onChange={(e) => update("area", e.target.value)}
        />

        <div className="flex items-center justify-between pt-1">
          {user?.area_name && filters.area.toLowerCase() !== user.area_name.toLowerCase() ? (
            <button
              type="button"
              onClick={() => {
                update("area", user.area_name || "");
                if (user.latitude != null && user.longitude != null) {
                  setCenter({ lat: user.latitude, lng: user.longitude });
                }
              }}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground underline"
            >
              <RotateCcw className="size-2.5" />
              Reset ({user.area_name})
            </button>
          ) : (
            <span className="text-[11px] text-muted-foreground">Active Center</span>
          )}

          {filters.area.trim() && (
            <button
              type="button"
              onClick={() => {
                const q = filters.area.trim();
                const url = q.startsWith("http")
                  ? q
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
                window.open(url, "_blank");
              }}
              className="inline-flex items-center gap-0.5 text-[11px] font-medium text-foreground underline hover:text-primary"
            >
              Check on Map
              <ExternalLink className="size-2.5" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <Label htmlFor="filter-price">
          Max price {filters.maxPrice > 0 ? `· Rs ${filters.maxPrice.toLocaleString()}` : "· any"}
        </Label>
        <Slider
          id="filter-price"
          value={[filters.maxPrice]}
          min={0}
          max={20000}
          step={500}
          onValueChange={([v]) => update("maxPrice", v)}
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Distance from your area</legend>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={filters.radius === 0 ? "default" : "secondary"}
            onClick={() => update("radius", 0)}
          >
            Any
          </Button>
          {RADIUS_OPTIONS.map((r) => (
            <Button
              key={r}
              type="button"
              size="sm"
              variant={filters.radius === r ? "default" : "secondary"}
              onClick={() => update("radius", r)}
            >
              {r} km
            </Button>
          ))}
        </div>
      </fieldset>

      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={() => {
          setFilters({ ...INITIAL, area: user?.area_name ?? "" });
          if (user?.latitude != null && user?.longitude != null) {
            setCenter({ lat: user.latitude, lng: user.longitude });
          }
          setPage(1);
        }}
      >
        <X className="mr-2 size-4" aria-hidden="true" />
        Clear filters
      </Button>
    </div>
  );

  return (
    <SiteLayout wide>
      <PageHeader
        title="Browse the shelf"
        description="Everything neighbours nearby are renting out, giving away or selling."
      />

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            className="pl-9"
            placeholder="Search items, e.g. drill, textbook, tent…"
            value={filters.q}
            maxLength={120}
            aria-label="Search listings"
            onChange={(e) => update("q", e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filters.sort} onValueChange={(v) => update("sort", v as Filters["sort"])}>
            <SelectTrigger className="w-47.5" aria-label="Sort listings">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex rounded-lg border p-1" role="group" aria-label="Change results view">
            {(
              [
                { key: "grid", Icon: LayoutGrid, label: "Grid view" },
                { key: "list", Icon: List, label: "List view" },
              ] as const
            ).map(({ key, Icon, label }) => (
              <Button
                key={key}
                size="icon"
                variant={view === key ? "secondary" : "ghost"}
                aria-label={label}
                aria-pressed={view === key}
                onClick={() => setView(key)}
              >
                <Icon className="size-4" aria-hidden="true" />
              </Button>
            ))}
          </div>
          <Button
            variant="secondary"
            className="lg:hidden"
            onClick={() => setShowFilters((s) => !s)}
          >
            <SlidersHorizontal className="mr-2 size-4" aria-hidden="true" />
            Filters{activeCount ? ` (${activeCount})` : ""}
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className={showFilters ? "block" : "hidden lg:block"} aria-label="Filters">
          {filterPanel}
        </aside>

        <div>
          <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
            {isLoading ? "Loading listings…" : `${total} listing${total === 1 ? "" : "s"} found`}
            {isFetching && !isLoading ? " · updating…" : ""}
          </p>

          {isLoading ? (
            <ItemGridSkeleton count={6} />
          ) : results.length === 0 ? (
            <EmptyState
              title="Nothing matches those filters"
              description="Try widening the distance, clearing the price cap, or searching a different keyword."
              action={
                <Button
                  onClick={() => {
                    setFilters({ ...INITIAL, area: user?.area_name ?? "" });
                    if (user?.latitude != null && user?.longitude != null) {
                      setCenter({ lat: user.latitude, lng: user.longitude });
                    }
                    setPage(1);
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : view === "list" ? (
            <div className="space-y-4">
              {results.map((item) => (
                <ItemCard key={item.id} item={item} view="list" />
              ))}
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
              {results.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Pagination">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </nav>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
