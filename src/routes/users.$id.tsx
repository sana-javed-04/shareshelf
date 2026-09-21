import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin, PackageCheck } from "lucide-react";
import { PageHeader, SiteLayout } from "@/components/SiteLayout";
import { ItemCard } from "@/components/ItemCard";
import { EmptyState } from "@/components/EmptyState";
import { ItemGridSkeleton, RowsSkeleton } from "@/components/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { ReviewsList, type ReviewItem } from "@/components/ReviewsList";
import { userService } from "@/services/authService";
import { itemService } from "@/services/itemService";
import { formatDate, initials } from "@/lib/utils/formatters";
import { api } from "@/lib/api/client";

interface ApiUserReview {
  id: number;
  item_id?: number;
  reviewer_id?: number;
  reviewer_username?: string;
  rating: number;
  comment: string;
  created_at: string;
}

export const Route = createFileRoute("/users/$id")({
  head: () => ({
    meta: [
      { title: "Member profile — ShareShelf" },
      {
        name: "description",
        content:
          "See a neighbour's public ShareShelf profile: approximate area, activity and open listings.",
      },
      { property: "og:title", content: "Member profile — ShareShelf" },
      {
        property: "og:description",
        content: "Public, privacy-safe profiles — no emails or exact addresses.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UserProfilePage,
});

function UserProfilePage() {
  const { id } = Route.useParams();
  const userId = Number(id);

  const profile = useQuery({
    queryKey: ["public-user", userId],
    queryFn: () => userService.publicProfile(userId),
    enabled: Number.isFinite(userId) && userId > 0,
  });

  const listings = useQuery({
    queryKey: ["public-user-items", userId],
    queryFn: () => itemService.list({ owner_id: userId, page_size: 24 }),
    enabled: Number.isFinite(userId) && userId > 0,
  });

  // Fetch all reviews received by this member (seller/buyer profile history)
  const userReviews = useQuery<ReviewItem[]>({
    queryKey: ["reviews", "user", userId],
    queryFn: async () => {
      const res = await api.get<ApiUserReview[]>(`/reviews/user/${userId}`);
      return (res || []).map((r) => ({
        id: r.id,
        item_id: r.item_id ?? 0,
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
    enabled: Number.isFinite(userId) && userId > 0,
  });

  if (profile.isLoading) {
    return (
      <SiteLayout>
        <RowsSkeleton rows={2} />
      </SiteLayout>
    );
  }

  if (!profile.data || userId <= 0) {
    return (
      <SiteLayout>
        <EmptyState
          title="Member not found"
          description="This profile may have been removed or does not exist."
          action={
            <Button asChild>
              <Link to="/browse">Back to browse</Link>
            </Button>
          }
        />
      </SiteLayout>
    );
  }

  const user = profile.data;
  const reviews = userReviews.data ?? [];

  return (
    <SiteLayout>
      <PageHeader
        title={user.username}
        description="Public profile — ShareShelf never shows emails, phone numbers or exact addresses."
      />

      {/* Member Details Card */}
      <div className="flex flex-wrap items-center gap-6 rounded-2xl border bg-card p-6 shadow-soft">
        <span className="grid size-16 place-items-center rounded-2xl border surface-gradient font-display text-xl font-bold">
          {initials(user.username)}
        </span>
        <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3 sm:gap-8">
          <li className="inline-flex items-center gap-2">
            <MapPin className="size-4" aria-hidden="true" /> {user.area_name ?? "Area not shared"}
          </li>
          <li className="inline-flex items-center gap-2">
            <CalendarDays className="size-4" aria-hidden="true" /> Joined{" "}
            {formatDate(user.created_at)}
          </li>
          <li className="inline-flex items-center gap-2">
            <PackageCheck className="size-4" aria-hidden="true" /> {user.total_transactions}{" "}
            exchanges
          </li>
        </ul>
      </div>

      {/* Member Ratings & Community Reviews History */}
      <div className="mt-8 space-y-4">
        <div>
          <h2 className="font-display text-xl font-bold">Community Ratings & Reviews</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Verified feedback from neighbours who have exchanged items with {user.username}.
          </p>
        </div>

        {userReviews.isLoading ? (
          <RowsSkeleton rows={2} />
        ) : (
          <ReviewsList reviews={reviews} targetName={user.username} />
        )}
      </div>

      {/* Open Listings Section */}
      <h2 className="mt-10 mb-4 font-display text-2xl font-bold">Open listings</h2>
      {listings.isLoading ? (
        <ItemGridSkeleton />
      ) : listings.data && listings.data.results.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {listings.data.results.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <EmptyState title="Nothing listed right now" />
      )}
    </SiteLayout>
  );
}
