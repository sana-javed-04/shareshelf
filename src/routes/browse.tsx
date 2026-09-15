import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { LayoutGrid, List, Map as MapIcon, Search, SlidersHorizontal, X } from "lucide-react";
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
import MapView, { itemsToPoints } from "@/components/MapView";
import { itemService } from "@/services/itemService";
import { useAuth } from "@/context/AuthContext";
import { DEFAULT_CENTER } from "@/lib/utils/geo";
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

function BrowsePage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<Filters>(INITIAL);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"grid" | "list" | "map">("grid");
  const [showFilters, setShowFilters] = useState(false);

  const center = useMemo(
    () =>
      user?.latitude != null && user?.longitude != null
        ? { lat: user.latitude, lng: user.longitude }
        : DEFAULT_CENTER,
    [user],
  );

  const query: ItemQuery = {
    q: filters.q || undefined,
    listing_type: filters.listing_type === ANY ? undefined : (filters.listing_type as ItemQuery["listing_type"]),
    category: filters.category === ANY ? undefined : (filters.category as ItemQuery["category"]),
    item_condition:
      filters.item_condition === ANY ? undefined : (filters.item_condition as ItemQuery["item_condition"]),
    area: filters.area || undefined,
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

      <div className="space-y-2">
        <Label htmlFor="filter-area">Area contains</Label>
        <Input
          id="filter-area"
          value={filters.area}
          maxLength={80}
          placeholder="e.g. Clifton"
          onChange={(e) => update("area", e.target.value)}
        />
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
        {!user && (
          <p className="text-xs text-muted-foreground">
            Sign in to filter around your own saved area — distances currently use the city centre.
          </p>
        )}
      </fieldset>

      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={() => {
          setFilters(INITIAL);
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
            <SelectTrigger className="w-[190px]" aria-label="Sort listings">
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
            {([
              { key: "grid", Icon: LayoutGrid, label: "Grid view" },
              { key: "list", Icon: List, label: "List view" },
              { key: "map", Icon: MapIcon, label: "Map view" },
            ] as const).map(({ key, Icon, label }) => (
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
          <Button variant="secondary" className="lg:hidden" onClick={() => setShowFilters((s) => !s)}>
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
                    setFilters(INITIAL);
                    setPage(1);
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : view === "map" ? (
            <MapView
              className="h-[34rem]"
              points={itemsToPoints(results)}
              center={center}
              radiusKm={filters.radius || undefined}
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

          {view !== "map" && totalPages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Pagination">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </nav>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
