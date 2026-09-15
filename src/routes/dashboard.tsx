import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Boxes, Inbox, MessageSquare, PackageCheck, PlusCircle } from "lucide-react";
import { PageHeader, SiteLayout } from "@/components/SiteLayout";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { StatsSkeleton } from "@/components/LoadingSkeleton";
import { itemService } from "@/services/itemService";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your dashboard — ShareShelf" },
      { name: "description", content: "See your listings, requests and messages at a glance." },
      { property: "og:title", content: "Your dashboard — ShareShelf" },
      { property: "og:description", content: "Track your ShareShelf activity in one place." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <DashboardPage />
    </RequireAuth>
  ),
});

function StatCard({ label, value, Icon }: { label: string; value: number; Icon: typeof Boxes }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft">
      <span className="grid size-10 place-items-center rounded-xl border surface-gradient">
        <Icon className="size-5 text-primary" aria-hidden="true" />
      </span>
      <p className="mt-4 font-display text-3xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["my-stats"],
    queryFn: () => itemService.myStats(),
  });

  return (
    <SiteLayout>
      <PageHeader
        title={`Welcome back, ${user?.username ?? "neighbour"}`}
        description="Everything happening on your shelf right now."
        actions={
          <Button asChild>
            <Link to="/post-item">
              <PlusCircle className="mr-2 size-4" aria-hidden="true" /> Post an item
            </Link>
          </Button>
        }
      />
      {isLoading || !data ? (
        <StatsSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Active listings" value={data.active_listings} Icon={Boxes} />
          <StatCard label="Pending requests" value={data.pending_requests} Icon={Inbox} />
          <StatCard label="Active transactions" value={data.active_transactions} Icon={PackageCheck} />
          <StatCard label="Unread messages" value={data.unread_messages} Icon={MessageSquare} />
        </div>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild variant="secondary">
          <Link to="/my-listings">My listings</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/my-requests">My requests</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/transactions">Transactions</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/chat">Messages</Link>
        </Button>
      </div>
    </SiteLayout>
  );
}
