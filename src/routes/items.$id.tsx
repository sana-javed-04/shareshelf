import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { CalendarClock, MapPin, MessageSquare, Pencil, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ItemThumb } from "@/components/ItemCard";
import { ListingTypeBadge, StatusBadge } from "@/components/StatusBadge";
import { ReportModal } from "@/components/ReportModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import MapView from "@/components/MapView";
import { EmptyState } from "@/components/EmptyState";
import { itemService } from "@/services/itemService";
import { transactionService } from "@/services/transactionService";
import { useAuth } from "@/context/AuthContext";
import { errorMessage } from "@/lib/api/errors";
import { formatDate, formatDistance, formatPrice } from "@/lib/utils/formatters";

export const Route = createFileRoute("/items/$id")({
  head: () => ({
    meta: [
      { title: "Listing details — ShareShelf" },
      {
        name: "description",
        content: "See condition, approximate location and rental terms for this ShareShelf listing.",
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

  const { data: item, isLoading, isError } = useQuery({
    queryKey: ["item", itemId],
    queryFn: () => itemService.get(itemId),
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
  const canRequest = !isOwner && item.status === "Available";
  const distance = formatDistance(item.distance_km);

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
      void navigate({ to: "/my-requests" });
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
          <div className="h-80 overflow-hidden rounded-2xl border sm:h-[26rem]">
            <ItemThumb item={item} />
          </div>

          <div className="mt-8">
            <h2 className="font-display text-xl font-semibold">About this item</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">{item.description}</p>
          </div>

          <dl className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { t: "Category", v: item.category },
              { t: "Condition", v: item.item_condition },
              {
                t: item.listing_type === "RENT" ? "Max rental" : "Listed",
                v:
                  item.listing_type === "RENT"
                    ? `${item.max_rental_days ?? 7} days`
                    : formatDate(item.created_at),
              },
            ].map((row) => (
              <div key={row.t} className="rounded-xl border bg-card p-4">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">{row.t}</dt>
                <dd className="mt-1 font-semibold">{row.v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-8">
            <h2 className="font-display text-xl font-semibold">Approximate location</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              ShareShelf only ever shows a coarse area — arrange the exact meeting point in chat.
            </p>
            <MapView
              className="mt-4"
              center={
                item.latitude != null && item.longitude != null
                  ? { lat: item.latitude, lng: item.longitude }
                  : undefined
              }
              points={
                item.latitude != null && item.longitude != null
                  ? [
                      {
                        id: item.id,
                        lat: item.latitude,
                        lng: item.longitude,
                        title: item.title,
                        subtitle: item.area_name,
                      },
                    ]
                  : []
              }
            />
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border bg-card p-6 shadow-soft">
            <div className="flex flex-wrap gap-2">
              <ListingTypeBadge type={item.listing_type} />
              <StatusBadge status={item.status} />
            </div>
            <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">{item.title}</h1>
            <p className="mt-2 font-display text-2xl font-bold text-primary">
              {formatPrice(item.price, item.listing_type)}
            </p>
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-4" aria-hidden="true" />
              {item.area_name}
              {distance && <span className="font-medium text-foreground/70">· {distance}</span>}
            </p>

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
                  <Button className="w-full" disabled={!canRequest || requesting} onClick={requestItem}>
                    {requesting
                      ? "Sending request…"
                      : item.status !== "Available"
                        ? "Currently unavailable"
                        : item.listing_type === "DONATE"
                          ? "Request this donation"
                          : item.listing_type === "RENT"
                            ? "Request to rent"
                            : "Request to buy"}
                  </Button>
                  <Button asChild variant="secondary" className="w-full">
                    <Link
                      to="/chat"
                      search={{ item: item.id, partner: item.owner_id }}
                    >
                      <MessageSquare className="mr-2 size-4" aria-hidden="true" />
                      Message the owner
                    </Link>
                  </Button>
                </>
              )}
            </div>

            <p className="mt-5 flex items-start gap-2 rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              Approved requests generate a one-time pickup PIN. Verify it at handover — never share contact
              details outside ShareShelf.
            </p>
          </div>

          <div className="mt-6 rounded-2xl border bg-card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Listed by</h2>
            <div className="mt-3 flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
                <UserRound className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-semibold">{item.owner?.username ?? "ShareShelf member"}</p>
                <p className="text-xs text-muted-foreground">
                  {item.owner?.area_name ?? item.area_name} · {item.owner?.total_transactions ?? 0} completed
                  exchanges
                </p>
              </div>
            </div>
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock className="size-3.5" aria-hidden="true" />
              Member since {formatDate(item.owner?.created_at ?? item.created_at)}
            </p>
            {!isOwner && (
              <div className="mt-4">
                <ReportModal itemId={item.id} userId={item.owner_id} />
              </div>
            )}
          </div>
        </aside>
      </div>
    </SiteLayout>
  );
}
