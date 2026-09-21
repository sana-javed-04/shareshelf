import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PlusCircle } from "lucide-react";
import { PageHeader, SiteLayout } from "@/components/SiteLayout";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { ItemCard } from "@/components/ItemCard";
import { EmptyState } from "@/components/EmptyState";
import { ItemGridSkeleton } from "@/components/LoadingSkeleton";
import { itemService } from "@/services/itemService";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/my-listings")({
  head: () => ({
    meta: [
      { title: "My listings — ShareShelf" },
      { name: "description", content: "Manage the items you have listed on ShareShelf." },
      { property: "og:title", content: "My listings — ShareShelf" },
      { property: "og:description", content: "Edit, pause or remove your ShareShelf listings." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <MyListingsPage />
    </RequireAuth>
  ),
});

function MyListingsPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["my-listings", user?.id],
    queryFn: () =>
      itemService.list({
        owner_id: Number(user?.id),
        page_size: 50,
      }),
    enabled: Boolean(user?.id),
  });

  return (
    <SiteLayout>
      <PageHeader
        title="My listings"
        description="Everything you have shared with your neighbourhood."
        actions={
          <Button asChild>
            <Link to="/post-item">
              <PlusCircle className="mr-2 size-4" aria-hidden="true" /> Post an item
            </Link>
          </Button>
        }
      />
      {isLoading ? (
        <ItemGridSkeleton />
      ) : data && data.results && data.results.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {data.results.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No listings yet"
          description="Post your first item and let neighbours borrow, adopt or buy it."
          action={
            <Button asChild>
              <Link to="/post-item">Post an item</Link>
            </Button>
          }
        />
      )}
    </SiteLayout>
  );
}
