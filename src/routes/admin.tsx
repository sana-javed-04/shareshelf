import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  Image as ImageIcon,
  MessageSquare,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import { PageHeader, SiteLayout } from "@/components/SiteLayout";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/EmptyState";
import { RowsSkeleton, StatsSkeleton } from "@/components/LoadingSkeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { adminService } from "@/services/adminService";
import { errorMessage } from "@/lib/api/errors";
import { formatDate } from "@/lib/utils/formatters";
import type { Report } from "@/lib/types";

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
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [activeReportDetails, setActiveReportDetails] = useState<Report | null>(null);

  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: adminService.stats });
  const users = useQuery({ queryKey: ["admin", "users"], queryFn: adminService.users });
  const items = useQuery({ queryKey: ["admin", "items"], queryFn: adminService.items });
  const reports = useQuery({ queryKey: ["admin", "reports"], queryFn: adminService.reports });

  const act = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      toast.success("Action completed.");
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
      setActiveReportDetails(null);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const handleDeleteReportedItem = (itemId: number, reportId: number) => {
    act.mutate(async () => {
      await adminService.removeItem(itemId);
      await adminService.reviewReport(reportId);
    });
  };

  const handleBanReportedUser = (userId: number, reportId: number) => {
    act.mutate(async () => {
      await adminService.ban(userId);
      await adminService.reviewReport(reportId);
    });
  };

  const openReportsCount =
    reports.data?.filter((r) => r.status === "Pending").length ?? stats.data?.pending_reports ?? 0;

  return (
    <SiteLayout wide>
      <PageHeader title="Moderation" description="Keep ShareShelf safe, fair and spam-free." />

      {/* Lightbox Modal for Evidence Images */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl bg-card p-2 shadow-2xl">
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-black/70 text-white hover:bg-destructive transition"
            >
              <X className="size-5" />
            </button>
            <img
              src={selectedPhoto}
              alt="Dispute evidence full"
              className="max-h-[85vh] w-auto rounded-xl object-contain"
            />
          </div>
        </div>
      )}

      {/* Full Detailed Report Modal */}
      {activeReportDetails && (
        <Dialog
          open={Boolean(activeReportDetails)}
          onOpenChange={() => setActiveReportDetails(null)}
        >
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md p-5 rounded-2xl">
            <DialogHeader className="pb-1">
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-destructive">
                <ShieldAlert className="size-4.5" />
                Case Report #{activeReportDetails.id}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 pt-1">
              <div className="rounded-xl border bg-muted/40 p-2.5 text-xs">
                <p className="font-semibold text-foreground">{activeReportDetails.reason}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Filed on: {formatDate(activeReportDetails.created_at)} · Status:{" "}
                  <span className="font-bold">{activeReportDetails.status}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border p-2">
                  <span className="text-[11px] text-muted-foreground block font-medium">
                    Reported By:
                  </span>
                  <Link
                    to="/users/$id"
                    params={{ id: String(activeReportDetails.reported_by) }}
                    className="font-semibold text-primary underline"
                  >
                    {activeReportDetails.reported_by_username ??
                      `User #${activeReportDetails.reported_by}`}
                  </Link>
                </div>
                <div className="rounded-lg border p-2">
                  <span className="text-[11px] text-muted-foreground block font-medium">
                    Accused:
                  </span>
                  {activeReportDetails.reported_user_id ? (
                    <Link
                      to="/users/$id"
                      params={{ id: String(activeReportDetails.reported_user_id) }}
                      className="font-semibold text-destructive underline"
                    >
                      {activeReportDetails.reported_username ??
                        `User #${activeReportDetails.reported_user_id}`}
                    </Link>
                  ) : (
                    "No specific user"
                  )}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Full Statement / Description:
                </span>
                <div className="rounded-xl border bg-card p-2.5 text-xs leading-relaxed whitespace-pre-wrap">
                  {activeReportDetails.description || "No description provided."}
                </div>
              </div>

              {activeReportDetails.evidence_image && (
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Uploaded Damage / Payment Evidence:
                  </span>
                  <div
                    onClick={() => setSelectedPhoto(activeReportDetails.evidence_image || null)}
                    className="group relative h-48 w-full cursor-pointer overflow-hidden rounded-xl border bg-black/5 hover:opacity-95"
                  >
                    <img
                      src={activeReportDetails.evidence_image}
                      alt="Uploaded proof"
                      className="h-full w-full object-contain p-1 transition group-hover:scale-102"
                    />
                    <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                      Click to expand
                    </span>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

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
            ["Open reports", openReportsCount],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border bg-card p-4 shadow-sm">
              <p className="font-display text-2xl font-bold">{value}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      )}

      <Tabs defaultValue="reports" className="mt-8">
        <TabsList className="h-11">
          <TabsTrigger value="reports" className="relative gap-2">
            Reports
            {openReportsCount > 0 && (
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-destructive text-[11px] font-bold text-destructive-foreground">
                {openReportsCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="users">Members</TabsTrigger>
          <TabsTrigger value="items">Listings</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-6">
          {reports.isLoading ? (
            <RowsSkeleton />
          ) : reports.data && reports.data.length > 0 ? (
            <div className="space-y-4">
              {reports.data.map((r: Report) => {
                const isPending = r.status === "Pending";
                const isReviewed = r.status === "Reviewed";
                const isDismissed = r.status === "Dismissed";

                return (
                  <div
                    key={r.id}
                    className={`flex flex-col gap-4 rounded-2xl border p-5 transition shadow-sm ${
                      isPending ? "border-destructive/30 bg-destructive/2" : "border-border bg-card"
                    }`}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              isReviewed
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : isDismissed
                                  ? "bg-muted text-muted-foreground"
                                  : "bg-destructive/10 text-destructive animate-pulse"
                            }`}
                          >
                            {r.status}
                          </span>
                          <h3 className="font-semibold text-base text-foreground">{r.reason}</h3>
                        </div>

                        {/* View Full Report Button */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1.5"
                          onClick={() => setActiveReportDetails(r)}
                        >
                          <Eye className="size-3.5 text-primary" /> View Details
                        </Button>
                      </div>

                      {/* Reported By -> Accused Link Flow */}
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Reported by:</span>
                        <Link
                          to="/users/$id"
                          params={{ id: String(r.reported_by) }}
                          className="font-semibold text-primary underline hover:text-primary/80"
                        >
                          {r.reported_by_username ?? `Member #${r.reported_by}`}
                        </Link>

                        {r.reported_user_id && (
                          <>
                            <ArrowRight className="size-3.5 text-muted-foreground" />
                            <span className="font-medium text-destructive">Accused:</span>
                            <Link
                              to="/users/$id"
                              params={{ id: String(r.reported_user_id) }}
                              className="font-semibold text-destructive underline hover:text-destructive/80"
                            >
                              {r.reported_username ?? `Member #${r.reported_user_id}`}
                            </Link>
                          </>
                        )}
                      </div>

                      {/* Statement Preview */}
                      {r.description && (
                        <div className="rounded-xl bg-muted/40 p-3 text-sm text-foreground leading-relaxed whitespace-pre-wrap line-clamp-2">
                          "{r.description}"
                        </div>
                      )}

                      {/* Photo Thumbnail if Available */}
                      {r.evidence_image && (
                        <div className="space-y-1 pt-1">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                            <ImageIcon className="size-3.5" /> Attached Evidence Photo:
                          </span>
                          <div
                            onClick={() => setSelectedPhoto(r.evidence_image || null)}
                            className="group relative h-24 w-36 cursor-pointer overflow-hidden rounded-xl border bg-black/5 hover:opacity-90"
                          >
                            <img
                              src={r.evidence_image}
                              alt="Proof"
                              className="h-full w-full object-cover transition group-hover:scale-105"
                            />
                            <span className="absolute inset-0 grid place-items-center bg-black/35 text-[11px] font-bold text-white opacity-0 group-hover:opacity-100 transition">
                              Click to view full
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-muted-foreground">
                        <span>Reported on: {formatDate(r.created_at)}</span>
                        {r.reported_item_id && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-foreground">Target item:</span>
                            <Link
                              to="/items/$id"
                              params={{ id: String(r.reported_item_id) }}
                              className="font-semibold text-primary underline hover:text-primary/80"
                            >
                              {r.item_title ?? `Item #${r.reported_item_id}`}
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 mt-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" variant="ghost" asChild className="h-8 text-xs gap-1.5">
                          <Link
                            to="/chat"
                            search={{
                              item: r.reported_item_id ?? 0,
                              partner: r.reported_by,
                            }}
                          >
                            <MessageSquare className="size-3.5 text-primary" />
                            Message Reporter
                          </Link>
                        </Button>

                        {r.reported_user_id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            asChild
                            className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive"
                          >
                            <Link
                              to="/chat"
                              search={{
                                item: r.reported_item_id ?? 0,
                                partner: r.reported_user_id,
                              }}
                            >
                              <MessageSquare className="size-3.5" />
                              Message Accused
                            </Link>
                          </Button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {isPending && (
                          <>
                            {r.reported_user_id && (
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 text-xs gap-1"
                                onClick={() => handleBanReportedUser(r.reported_user_id!, r.id)}
                              >
                                <ShieldAlert className="size-3.5" /> Ban Accused
                              </Button>
                            )}

                            {r.reported_item_id && (
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 text-xs gap-1"
                                onClick={() => handleDeleteReportedItem(r.reported_item_id!, r.id)}
                              >
                                <Trash2 className="size-3.5" /> Delete Item
                              </Button>
                            )}

                            <Button
                              size="sm"
                              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                              onClick={() => act.mutate(() => adminService.reviewReport(r.id))}
                            >
                              <CheckCircle2 className="size-3.5" /> Mark Resolved
                            </Button>

                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8 text-xs"
                              onClick={() => act.mutate(() => adminService.dismissReport(r.id))}
                            >
                              Dismiss
                            </Button>
                          </>
                        )}

                        {isReviewed && (
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="size-3.5" /> Case Resolved
                          </span>
                        )}

                        {isDismissed && (
                          <span className="text-xs text-muted-foreground">Case Dismissed</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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
                  className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        to="/users/$id"
                        params={{ id: String(u.id) }}
                        className="font-semibold text-foreground underline hover:text-primary"
                      >
                        {u.username}
                      </Link>
                      {u.role === "admin" && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                          admin
                        </span>
                      )}
                      {u.is_banned && (
                        <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive">
                          Banned
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {u.area_name ?? "Unknown area"} · {u.total_transactions} transactions · joined{" "}
                      {formatDate(u.created_at)}
                    </p>
                  </div>
                  {u.role !== "admin" && (
                    <Button
                      size="sm"
                      variant={u.is_banned ? "secondary" : "destructive"}
                      className="gap-1.5"
                      onClick={() =>
                        act.mutate(() =>
                          u.is_banned ? adminService.unban(u.id) : adminService.ban(u.id),
                        )
                      }
                    >
                      {u.is_banned ? (
                        <>
                          <UserCheck className="size-3.5" /> Unban
                        </>
                      ) : (
                        <>
                          <UserX className="size-3.5" /> Ban
                        </>
                      )}
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
                  className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm"
                >
                  <div className="min-w-0">
                    <Link
                      to="/items/$id"
                      params={{ id: String(item.id) }}
                      className="truncate font-semibold text-foreground underline hover:text-primary block"
                    >
                      {item.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {item.category} · {item.area_name} · Status: {item.status}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1.5"
                    onClick={() => act.mutate(() => adminService.removeItem(item.id))}
                  >
                    <Trash2 className="size-3.5" /> Remove
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
