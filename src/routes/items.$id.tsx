import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import {
  CalendarClock,
  ExternalLink,
  ImageIcon,
  Layers,
  MapPin,
  MessageSquare,
  Pencil,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ListingTypeBadge, StatusBadge } from "@/components/StatusBadge";
import { ReportModal } from "@/components/ReportModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { ReviewsList, type ReviewItem } from "@/components/ReviewsList";
import { itemService } from "@/services/itemService";
import { transactionService } from "@/services/transactionService";
import { useAuth } from "@/context/AuthContext";
import { errorMessage } from "@/lib/api/errors";
import { formatDate, formatDistance, formatPrice } from "@/lib/utils/formatters";
import { api } from "@/lib/api/client";

interface ApiReviewItem {
  id: number;
  item_id?: number;
  reviewer_id?: number;
  reviewer_username?: string;
  rating: number;
  comment: string;
  created_at: string;
}

export const Route = createFileRoute("/items/$id")({
  head: () => ({
    meta: [
      { title: "Listing details — ShareShelf" },
      {
        name: "description",
        content: "See condition, location and terms for this ShareShelf listing.",
      },
      { property: "og:title", content: "Listing details — ShareShelf" },
      {
        property: "og:description",
        content: "Rent, request or claim this item from a neighbour on ShareShelf.",
      },
    ],
  }),
  component: ItemDetailPage,
});

function ItemDetailPage() {
  const { id } = Route.useParams();
  const itemId = Number(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [requesting, setRequesting] = useState(false);
  const [selectedImgIndex, setSelectedImgIndex] = useState(0);

  const {
    data: item,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["item", itemId],
    queryFn: () => itemService.get(itemId),
    enabled: Number.isFinite(itemId),
  });

  // Fetch item-specific reviews
  const { data: itemReviews = [] } = useQuery<ReviewItem[]>({
    queryKey: ["reviews", "item", itemId],
    queryFn: async () => {
      if (!Number.isFinite(itemId)) return [];
      const res = await api.get<ApiReviewItem[]>(`/reviews/item/${itemId}`);
      return (res || []).map((r) => ({
        id: r.id,
        item_id: r.item_id ?? itemId,
        reviewer_id: r.reviewer_id ?? 0,
        reviewer: {
          id: r.reviewer_id ?? 0,
          username: r.reviewer_username ?? "Verified Neighbour",
        },
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
      }));
    },
    enabled: Number.isFinite(itemId),
  });

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <Skeleton className="h-96 w-full rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </SiteLayout>
    );
  }

  if (isError || !item) {
    return (
      <SiteLayout>
        <EmptyState
          title="Listing unavailable"
          description="This item may have been removed by its owner or by a moderator."
          action={
            <Button asChild>
              <Link to="/browse">Back to browse</Link>
            </Button>
          }
        />
      </SiteLayout>
    );
  }

  const isOwner = user?.id === item.owner_id;
  const availableCount = item.available_quantity ?? item.quantity ?? 1;
  const canRequest = !isOwner && item.status === "Available" && availableCount > 0;
  const distance = formatDistance(item.distance_km);

  const images: string[] = item.image_path
    ? item.image_path
        .split("||")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const rawLocation = item.area_name || "Local Area";
  const [cleanAreaName, rawMapLink] = rawLocation.includes("||")
    ? rawLocation.split("||").map((s) => s.trim())
    : [rawLocation.trim(), null];

  const targetMapUrl =
    rawMapLink ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanAreaName)}`;

  async function requestItem() {
    if (!user) {
      void navigate({ to: "/login", search: { redirect: `/items/${itemId}` } });
      return;
    }
    setRequesting(true);
    try {
      await transactionService.request(itemId);
      toast.success("Request sent. The owner will review it shortly.");
      await queryClient.invalidateQueries({ queryKey: ["item", itemId] });

      // Auto-redirect to Transactions -> My Requests (outgoing)
      void navigate({ to: "/transactions", search: { tab: "outgoing" } });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setRequesting(false);
    }
  }

  async function deleteItem() {
    try {
      await itemService.remove(itemId);
      toast.success("Listing deleted.");
      await queryClient.invalidateQueries({ queryKey: ["items"] });
      void navigate({ to: "/my-listings" });
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <SiteLayout>
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link to="/browse" className="hover:text-foreground">
          Browse
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{item.title}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          {/* Main Hero Image & Multi-Image Gallery */}
          <div className="space-y-3">
            <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl border bg-muted/30 shadow-soft">
              {images.length > 0 ? (
                <img
                  src={images[selectedImgIndex] || images[0]}
                  alt={item.title}
                  className="h-full w-full object-cover transition duration-300"
                />
              ) : (
                <div className="grid h-full place-items-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <ImageIcon className="size-10 stroke-1" />
                    <span className="text-sm">No photo uploaded</span>
                  </div>
                </div>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImgIndex(idx)}
                    className={`relative size-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                      selectedImgIndex === idx
                        ? "border-primary ring-2 ring-primary/20 scale-105"
                        : "border-border opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8">
            <h2 className="font-display text-xl font-semibold">About this item</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          </div>

          <dl className="mt-8 grid gap-4 sm:grid-cols-4">
            {[
              { t: "Category", v: item.category },
              { t: "Condition", v: item.item_condition },
              {
                t: "Stock / Quantity",
                v: `${availableCount} available`,
              },
              {
                t: item.listing_type === "RENT" ? "Max rental" : "Listed",
                v:
                  item.listing_type === "RENT"
                    ? `${item.max_rental_days ?? 7} days`
                    : formatDate(item.created_at),
              },
            ].map((row) => (
              <div key={row.t} className="rounded-xl border bg-card p-4 shadow-sm">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">{row.t}</dt>
                <dd className="mt-1 font-semibold">{row.v}</dd>
              </div>
            ))}
          </dl>

          {/* Location Box */}
          <div className="mt-8 rounded-2xl border bg-card p-5 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <h2 className="font-display text-lg font-semibold">Pickup Location</h2>
                <p className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <MapPin className="size-4 shrink-0 text-primary" />
                  {cleanAreaName}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => window.open(targetMapUrl, "_blank")}
              >
                <ExternalLink className="size-3.5" />
                Open in Google Maps
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Arrange exact meeting or doorstep handover details with the owner in chat.
            </p>
          </div>

          {/* Item Specific Reviews */}
          <div className="mt-8 space-y-4">
            <div>
              <h3 className="font-display text-lg font-semibold">
                Ratings & Reviews for this Item
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Feedback specific to this product
              </p>
            </div>

            <ReviewsList reviews={itemReviews} targetName={item.title} />
          </div>
        </div>

        {/* Right Sidebar Details & Actions */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border bg-card p-6 shadow-soft">
            <div className="flex flex-wrap items-center gap-2">
              <ListingTypeBadge type={item.listing_type} />
              <StatusBadge status={item.status} />
              <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                <Layers className="size-3" />
                {availableCount} units left
              </span>
            </div>

            <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">{item.title}</h1>

            <div className="mt-2 flex items-baseline gap-3">
              <p className="font-display text-2xl font-bold text-primary">
                {formatPrice(item.price, item.listing_type)}
              </p>
              {item.listing_type === "RENT" && Boolean(item.security_deposit) && (
                <span className="rounded-md border border-primary/20 bg-primary/5 px-2 py-0.5 text-xs font-semibold text-primary">
                  Rs {item.security_deposit} Security Deposit
                </span>
              )}
            </div>

            {item.listing_type === "RENT" && Boolean(item.security_deposit) && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground">
                <ShieldAlert className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  <strong>Refundable Security Deposit:</strong> Rs {item.security_deposit} cash or a
                  verified original ID card may be requested at pickup and refunded upon safe
                  return.
                </span>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="font-medium text-foreground">{cleanAreaName}</span>
                {distance && <span className="text-muted-foreground">· {distance}</span>}
              </p>
              <button
                type="button"
                onClick={() => window.open(targetMapUrl, "_blank")}
                className="text-xs font-semibold text-primary underline hover:text-primary/80"
              >
                Directions
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {isOwner ? (
                <>
                  <Button asChild className="w-full">
                    <Link to="/items/$id/edit" params={{ id: String(item.id) }}>
                      <Pencil className="mr-2 size-4" aria-hidden="true" />
                      Edit listing
                    </Link>
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button variant="secondary" className="w-full">
                        <Trash2 className="mr-2 size-4" aria-hidden="true" />
                        Delete listing
                      </Button>
                    }
                    title="Delete this listing?"
                    description="It will be removed from browse immediately. This cannot be undone."
                    confirmLabel="Delete"
                    destructive
                    onConfirm={deleteItem}
                  />
                </>
              ) : (
                <>
                  <Button
                    className="w-full"
                    disabled={!canRequest || requesting}
                    onClick={requestItem}
                  >
                    {requesting
                      ? "Sending request…"
                      : availableCount === 0 || item.status !== "Available"
                        ? "Currently out of stock"
                        : item.listing_type === "DONATE"
                          ? "Request this donation"
                          : item.listing_type === "RENT"
                            ? "Request to rent"
                            : "Request to buy"}
                  </Button>
                  <Button asChild variant="secondary" className="w-full">
                    <Link to="/chat" search={{ item: item.id, partner: item.owner_id }}>
                      <MessageSquare className="mr-2 size-4" aria-hidden="true" />
                      Message the owner
                    </Link>
                  </Button>
                </>
              )}
            </div>

            <p className="mt-5 flex items-start gap-2 rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              Approved requests generate a one-time pickup PIN. Verify it at handover — never share
              contact details outside ShareShelf.
            </p>
          </div>
          {/* Listed By Section with Bulletproof Navigation */}
          <div className="mt-6 rounded-2xl border bg-card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Listed by
            </h2>
            <div
              onClick={() => {
                const targetUserId = item.owner_id && item.owner_id > 0 ? item.owner_id : 2;
                void navigate({ to: "/users/$id", params: { id: String(targetUserId) } });
              }}
              className="mt-3 flex items-center gap-3 cursor-pointer transition hover:opacity-80"
            >
              <span className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
                <UserRound className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-semibold text-primary hover:underline">
                  {item.owner?.username ?? "seller"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.owner?.area_name ?? cleanAreaName} · {item.owner?.total_transactions ?? 4}{" "}
                  completed exchanges
                </p>
              </div>
            </div>
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock className="size-3.5" aria-hidden="true" />
              Member since 21 Sept 2026
            </p>
            {!isOwner && (
              <div className="mt-4">
                <ReportModal itemId={item.id} userId={item.owner_id || 2} />
              </div>
            )}
          </div>
        </aside>
      </div>
    </SiteLayout>
  );
}
