import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, SiteLayout } from "@/components/SiteLayout";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { RowsSkeleton } from "@/components/LoadingSkeleton";
import { TransactionStatusBadge } from "@/components/StatusBadge";
import { transactionService } from "@/services/transactionService";
import { formatDate } from "@/lib/utils/formatters";

export const Route = createFileRoute("/my-requests")({
  head: () => ({
    meta: [
      { title: "My requests — ShareShelf" },
      { name: "description", content: "Track the items you have asked to borrow, adopt or buy." },
      { property: "og:title", content: "My requests — ShareShelf" },
      { property: "og:description", content: "Follow the status of every request you have sent." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <MyRequestsPage />
    </RequireAuth>
  ),
});

function MyRequestsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["tx", "my"], queryFn: transactionService.my });

  return (
    <SiteLayout>
      <PageHeader title="My requests" description="Every item you have asked a neighbour for." />
      {isLoading ? (
        <RowsSkeleton />
      ) : data && data.length > 0 ? (
        <div className="space-y-3">
          {data.map((tx) => (
            <div
              key={tx.id}
              className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <TransactionStatusBadge status={tx.status} />
                  <h3 className="truncate font-semibold">{tx.item?.title ?? `Item #${tx.item_id}`}</h3>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Requested {formatDate(tx.created_at)}
                  {tx.owner_username ? ` · from ${tx.owner_username}` : ""}
                </p>
                {tx.pickup_pin && (
                  <p className="mt-1 text-sm font-semibold text-primary">Pickup PIN: {tx.pickup_pin}</p>
                )}
              </div>
              <Button asChild size="sm" variant="secondary">
                <Link to="/items/$id" params={{ id: String(tx.item_id) }}>
                  View item
                </Link>
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No requests yet"
          description="Browse your neighbourhood shelf and ask for something you need."
          action={
            <Button asChild>
              <Link to="/browse">Browse items</Link>
            </Button>
          }
        />
      )}
    </SiteLayout>
  );
}
