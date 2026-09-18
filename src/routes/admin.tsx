import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, Trash2 } from "lucide-react";
import { PageHeader, SiteLayout } from "@/components/SiteLayout";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/EmptyState";
import { RowsSkeleton, StatsSkeleton } from "@/components/LoadingSkeleton";
import { adminService } from "@/services/adminService";
import { errorMessage } from "@/lib/api/errors";
import { formatDate } from "@/lib/utils/formatters";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Moderation — ShareShelf" },
      { name: "description", content: "Moderate members, listings and reports across ShareShelf." },
      { property: "og:title", content: "Moderation — ShareShelf" },
      { property: "og:description", content: "Admin tools for keeping the shelf safe." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireAuth admin>
      <AdminPage />
    </RequireAuth>
  ),
});

function AdminPage() {
  const queryClient = useQueryClient();
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: adminService.stats });
  const users = useQuery({ queryKey: ["admin", "users"], queryFn: adminService.users });
  const items = useQuery({ queryKey: ["admin", "items"], queryFn: adminService.items });
  const reports = useQuery({ queryKey: ["admin", "reports"], queryFn: adminService.reports });

  const act = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      toast.success("Action completed.");
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  // Helper: item remove karein aur report resolve karein
  const handleDeleteReportedItem = (itemId: number, reportId: number) => {
    act.mutate(async () => {
      await adminService.removeItem(itemId);
      await adminService.reviewReport(reportId);
    });
  };

  return (
    <SiteLayout wide>
      <PageHeader title="Moderation" description="Keep ShareShelf safe, fair and spam-free." />
      {stats.isLoading || !stats.data ? (
        <StatsSkeleton count={6} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[
            ["Members", stats.data.total_users],
            ["Listings", stats.data.total_listings],
            ["Available", stats.data.available_listings],
            ["Active", stats.data.active_transactions],
            ["Completed", stats.data.completed_transactions],
            ["Open reports", stats.data.pending_reports],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border bg-card p-4">
              <p className="font-display text-2xl font-bold">{value}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      )}

      <Tabs defaultValue="reports" className="mt-8">
        <TabsList>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="users">Members</TabsTrigger>
          <TabsTrigger value="items">Listings</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-6">
          {reports.isLoading ? (
            <RowsSkeleton />
          ) : reports.data && reports.data.length > 0 ? (
            <div className="space-y-3">
              {reports.data.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="font-semibold">
                      {r.reason} ·{" "}
                      <span
                        className={
                          r.status === "Reviewed"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : r.status === "Dismissed"
                              ? "text-muted-foreground"
                              : "text-amber-600 dark:text-amber-400 font-medium"
                        }
                      >
                        {r.status}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {r.description ? `"${r.description}" · ` : ""}
                      Reported {formatDate(r.created_at)}
                    </p>

                    {r.reported_item_id && (
                      <div className="flex items-center gap-2 pt-1 text-xs">
                        <span className="font-medium text-foreground">Target item:</span>
                        <span>{r.item_title ?? `#${r.reported_item_id}`}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {r.reported_item_id && (
                      <Button size="sm" variant="outline" asChild>
                        <a
                          href={`/items/${r.reported_item_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5"
                        >
                          <ExternalLink className="size-3.5" />
                          View Listing
                        </a>
                      </Button>
                    )}

                    {r.status === "Pending" && (
                      <>
                        {r.reported_item_id && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="flex items-center gap-1.5"
                            onClick={() => handleDeleteReportedItem(r.reported_item_id!, r.id)}
                          >
                            <Trash2 className="size-3.5" />
                            Delete Listing
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => act.mutate(() => adminService.reviewReport(r.id))}
                        >
                          Mark reviewed
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => act.mutate(() => adminService.dismissReport(r.id))}
                        >
                          Dismiss
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No reports" description="Nothing needs your attention right now." />
          )}
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          {users.isLoading ? (
            <RowsSkeleton />
          ) : (
            <div className="space-y-3">
              {(users.data ?? []).map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between rounded-xl border bg-card p-4"
                >
                  <div>
                    <p className="font-semibold">
                      {u.username}{" "}
                      {u.role === "admin" && <span className="text-primary">· admin</span>}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {u.area_name ?? "Unknown area"} · joined {formatDate(u.created_at)}
                    </p>
                  </div>
                  {u.role !== "admin" && (
                    <Button
                      size="sm"
                      variant={u.is_banned ? "secondary" : "destructive"}
                      onClick={() =>
                        act.mutate(() =>
                          u.is_banned ? adminService.unban(u.id) : adminService.ban(u.id),
                        )
                      }
                    >
                      {u.is_banned ? "Unban" : "Ban"}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="items" className="mt-6">
          {items.isLoading ? (
            <RowsSkeleton />
          ) : (
            <div className="space-y-3">
              {(items.data ?? []).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border bg-card p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{item.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.category} · {item.area_name} · {item.status}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => act.mutate(() => adminService.removeItem(item.id))}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </SiteLayout>
  );
}
