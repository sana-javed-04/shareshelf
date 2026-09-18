import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin, PackageCheck } from "lucide-react";
import { PageHeader, SiteLayout } from "@/components/SiteLayout";
import { ItemCard } from "@/components/ItemCard";
import { EmptyState } from "@/components/EmptyState";
import { ItemGridSkeleton, RowsSkeleton } from "@/components/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { ReportModal } from "@/components/ReportModal";
import { userService } from "@/services/authService";
import { itemService } from "@/services/itemService";
import { formatDate, initials } from "@/lib/utils/formatters";

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
  });
  const listings = useQuery({
    queryKey: ["public-user-items", userId],
    queryFn: () => itemService.list({ owner_id: userId, page_size: 24 }),
  });

  if (profile.isLoading) {
    return (
      <SiteLayout>
        <RowsSkeleton rows={2} />
      </SiteLayout>
    );
  }

  if (!profile.data) {
    return (
      <SiteLayout>
        <EmptyState
          title="Member not found"
          description="This profile may have been removed."
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

  return (
    <SiteLayout>
      <PageHeader
        title={user.username}
        description="Public profile — ShareShelf never shows emails, phone numbers or exact addresses."
        actions={<ReportModal userId={user.id} label="Report member" />}
      />
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

      <h2 className="mt-10 mb-4 font-display text-2xl font-bold">Open listings</h2>
      {listings.isLoading ? (
        <ItemGridSkeleton count={3} />
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
