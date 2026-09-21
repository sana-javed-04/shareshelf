import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, Clock, Image as ImageIcon, LifeBuoy, X, XCircle } from "lucide-react";
import { PageHeader, SiteLayout } from "@/components/SiteLayout";
import { RequireAuth } from "@/components/RequireAuth";
import { EmptyState } from "@/components/EmptyState";
import { RowsSkeleton } from "@/components/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { reportService } from "@/services/reportService";
import { formatDate } from "@/lib/utils/formatters";
import type { Report } from "@/lib/types";

export const Route = createFileRoute("/my-reports")({
  head: () => ({
    meta: [
      { title: "My Reports & Disputes — ShareShelf" },
      {
        name: "description",
        content:
          "Track your return disputes and safety reports submitted to ShareShelf moderation.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <MyReportsPage />
    </RequireAuth>
  ),
});

function getBadgeStyle(status: string) {
  if (status === "Reviewed") {
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  }
  if (status === "Dismissed") {
    return "bg-muted text-muted-foreground";
  }
  return "bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse";
}

function StatusIcon({ status }: { status: string }) {
  if (status === "Reviewed") {
    return <CheckCircle2 className="size-3" />;
  }
  if (status === "Dismissed") {
    return <XCircle className="size-3" />;
  }
  return <Clock className="size-3" />;
}

function MyReportsPage() {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const { data: reports = [], isLoading } = useQuery<Report[]>({
    queryKey: ["reports", "my"],
    queryFn: () => reportService.myReports(),
    refetchInterval: 15000,
  });

  return (
    <SiteLayout>
      {/* Lightbox for Evidence Images */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-h-[90vh] max-w-2xl overflow-hidden rounded-2xl bg-card p-2 shadow-2xl">
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-black/70 text-white hover:bg-destructive transition"
            >
              <X className="size-4" />
            </button>
            <img
              src={selectedPhoto}
              alt="Dispute evidence"
              className="max-h-[80vh] w-auto rounded-xl object-contain"
            />
          </div>
        </div>
      )}

      <PageHeader
        title="My Reports & Disputes"
        description="Track the status of damaged returns, deposit disputes, and conduct reports filed with administration."
      />

      {isLoading ? (
        <RowsSkeleton rows={3} />
      ) : reports.length > 0 ? (
        <div className="space-y-4">
          {reports.map((r) => {
            const isPending = r.status === "Pending";
            const isReviewed = r.status === "Reviewed";
            const isDismissed = r.status === "Dismissed";

            return (
              <div
                key={r.id}
                className={`flex flex-col gap-4 rounded-2xl border p-5 shadow-soft transition ${
                  isPending ? "border-amber-500/30 bg-amber-500/2" : "border-border bg-card"
                }`}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${getBadgeStyle(
                          r.status,
                        )}`}
                      >
                        <StatusIcon status={r.status} />
                        {r.status}
                      </span>

                      <h3 className="font-semibold text-base text-foreground">{r.reason}</h3>
                    </div>

                    <span className="text-xs text-muted-foreground">
                      Filed on {formatDate(r.created_at)}
                    </span>
                  </div>

                  {/* Accused & Target Details */}
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    {r.reported_user_id && (
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-destructive">Reported Member:</span>
                        <Link
                          to="/users/$id"
                          params={{ id: String(r.reported_user_id) }}
                          className="font-semibold text-foreground underline hover:text-primary"
                        >
                          {r.reported_username ?? `Member #${r.reported_user_id}`}
                        </Link>
                      </div>
                    )}

                    {r.reported_item_id && (
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-foreground">Target Item:</span>
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

                  {/* User Statement */}
                  {r.description && (
                    <div className="rounded-xl bg-muted/40 p-3 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      "{r.description}"
                    </div>
                  )}

                  {/* Photo Proof Preview if Available */}
                  {r.evidence_image && (
                    <div className="space-y-1.5 pt-1">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        <ImageIcon className="size-3.5" /> Your Attached Photo Proof:
                      </span>
                      <div
                        onClick={() => setSelectedPhoto(r.evidence_image || null)}
                        className="group relative h-28 w-44 cursor-pointer overflow-hidden rounded-xl border bg-black/5 hover:opacity-90 transition"
                      >
                        <img
                          src={r.evidence_image}
                          alt="Submitted Evidence"
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                        <span className="absolute inset-0 grid place-items-center bg-black/40 text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition">
                          Click to enlarge
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Action Link -> Chat with Official Support */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 mt-1">
                    <p className="text-xs text-muted-foreground">
                      {isPending &&
                        "Under review by admin moderation. You can chat directly with Support below."}
                      {isReviewed && "Admin has reviewed and taken action on this dispute."}
                      {isDismissed && "This dispute was reviewed and closed by moderation."}
                    </p>

                    <Button size="sm" variant="outline" asChild className="h-8 text-xs gap-1.5">
                      <Link
                        to="/chat"
                        search={{
                          item: 0,
                          partner: 1,
                        }}
                      >
                        <LifeBuoy className="size-3.5 text-primary" />
                        Chat with Support Desk
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No disputes or reports filed"
          description="If any handover or return issues occur, you can report them directly from your active transactions."
          action={
            <Button asChild>
              <Link to="/transactions" search={{ tab: "outgoing" }}>
                View Transactions
              </Link>
            </Button>
          }
        />
      )}
    </SiteLayout>
  );
}
