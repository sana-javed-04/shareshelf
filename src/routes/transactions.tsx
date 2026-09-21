import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  KeyRound,
  ShieldAlert,
  RotateCcw,
  Star,
  UserCheck,
  XCircle,
} from "lucide-react";
import { PageHeader, SiteLayout } from "@/components/SiteLayout";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { RowsSkeleton } from "@/components/LoadingSkeleton";
import { TransactionStatusBadge } from "@/components/StatusBadge";
import { transactionService } from "@/services/transactionService";
import { useAuth } from "@/context/AuthContext";
import { errorMessage } from "@/lib/api/errors";
import { formatDate } from "@/lib/utils/formatters";
import type { Transaction } from "@/lib/types";
import { ReturnDisputeModal } from "@/components/ReturnDisputeModal";

interface TransactionsSearch {
  tab?: "incoming" | "outgoing";
}

export const Route = createFileRoute("/transactions")({
  validateSearch: (search: Record<string, unknown>): TransactionsSearch => {
    return {
      tab: search.tab === "outgoing" ? "outgoing" : "incoming",
    };
  },
  head: () => ({
    meta: [
      { title: "Transactions & Handovers — ShareShelf" },
      { name: "description", content: "Manage item handovers, returns and reviews." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <TransactionsPage />
    </RequireAuth>
  ),
});

function TransactionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const currentTab = search.tab ?? "incoming";

  const [pinInput, setPinInput] = useState<Record<number, string>>({});
  const [reviewTx, setReviewTx] = useState<Transaction | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const { data: incoming = [], isLoading: loadingInc } = useQuery({
    queryKey: ["tx", "incoming"],
    queryFn: transactionService.incoming,
  });

  const { data: outgoing = [], isLoading: loadingOut } = useQuery({
    queryKey: ["tx", "my"],
    queryFn: transactionService.my,
  });

  const act = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      toast.success("Action completed.");
      void queryClient.invalidateQueries({ queryKey: ["tx"] });
      void queryClient.invalidateQueries({ queryKey: ["user", "stats"] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewTx) return;
    if (!reviewComment.trim()) {
      toast.error("Please enter a short review comment.");
      return;
    }
    setSubmittingReview(true);
    try {
      await transactionService.submitReview({
        transaction_id: reviewTx.id,
        rating,
        comment: reviewComment.trim(),
      });
      toast.success("Review submitted! Thank you for building trust.");
      setReviewTx(null);
      setReviewComment("");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmittingReview(false);
    }
  }

  function handleTabChange(val: string) {
    void navigate({
      to: "/transactions",
      search: { tab: val as "incoming" | "outgoing" },
    });
  }

  function renderTransactionCard(tx: Transaction, role: "owner" | "borrower") {
    const isOwner = role === "owner";
    const otherPartyName = isOwner ? tx.borrower_username : tx.owner_username;
    const otherPartyId = isOwner ? tx.borrower_id : tx.owner_id;
    const isAwaitingPickup = tx.status === "Active" && !tx.pin_verified;
    const isInRental = tx.status === "Active" && tx.pin_verified;

    return (
      <div
        key={tx.id}
        className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-soft md:flex-row md:items-center md:justify-between"
      >
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <TransactionStatusBadge status={tx.status} />
            <h3 className="font-semibold truncate text-base">
              {tx.item?.title ?? `Item #${tx.item_id}`}
            </h3>
          </div>

          <p className="text-sm text-muted-foreground">
            {isOwner ? "Requested by" : "Owner"}:{" "}
            <Link
              to="/users/$id"
              params={{ id: String(otherPartyId) }}
              className="font-semibold text-primary underline hover:text-primary/80"
              title="Click to view member profile, ratings and reviews"
            >
              {otherPartyName ?? "Neighbour"}
            </Link>{" "}
            · Created {formatDate(tx.created_at)}
          </p>

          {/* Collateral & Security Reminder */}
          {tx.item?.listing_type === "RENT" && Boolean(tx.item.security_deposit) && (
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
              Security Deposit: Rs {tx.item.security_deposit} (Refundable at return)
            </p>
          )}

          {/* Pickup PIN Display for Borrower */}
          {!isOwner && isAwaitingPickup && tx.pickup_pin && (
            <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              <KeyRound className="size-4" />
              Pickup PIN: {tx.pickup_pin} (Share with owner at pickup)
            </div>
          )}

          {/* Active Rental In Progress Message */}
          {isInRental && (
            <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <UserCheck className="size-4" />
              Item is currently with{" "}
              <Link
                to="/users/$id"
                params={{ id: String(tx.borrower_id) }}
                className="underline hover:text-emerald-700 dark:hover:text-emerald-300"
              >
                {tx.borrower_username}
              </Link>
              . Safe return pending.
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
          {/* 1. Pending State: Owner Controls */}
          {isOwner && tx.status === "Pending" && (
            <>
              <Button size="sm" onClick={() => act.mutate(() => transactionService.approve(tx.id))}>
                <CheckCircle2 className="mr-1.5 size-4" /> Accept Request
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => act.mutate(() => transactionService.reject(tx.id))}
              >
                <XCircle className="mr-1.5 size-4" /> Decline
              </Button>
            </>
          )}

          {/* 2. Step 1: Pickup Handover PIN Entry (Owner Only) */}
          {isOwner && isAwaitingPickup && (
            <div className="flex items-center gap-2">
              <Input
                placeholder="4-digit PIN"
                className="w-28 text-center font-mono"
                maxLength={6}
                value={pinInput[tx.id] || ""}
                onChange={(e) => setPinInput((prev) => ({ ...prev, [tx.id]: e.target.value }))}
              />
              <Button
                size="sm"
                onClick={() => {
                  const pin = pinInput[tx.id];
                  if (!pin) {
                    toast.error("Please enter the borrower's pickup PIN.");
                    return;
                  }
                  act.mutate(() => transactionService.verifyPin(tx.id, pin));
                }}
              >
                Confirm Pickup
              </Button>
            </div>
          )}

          {/* 3. Step 2: Return Handover (Owner Side Action) */}
          {isOwner && isInRental && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() =>
                  act.mutate(async () => {
                    await transactionService.confirmReturn(tx.id);
                    setReviewTx(tx);
                  })
                }
              >
                <RotateCcw className="mr-1.5 size-4" /> Confirm Return & Refund Deposit
              </Button>

              <ReturnDisputeModal
                txId={tx.id}
                itemId={tx.item_id}
                borrowerId={tx.borrower_id}
                borrowerUsername={tx.borrower_username}
                itemTitle={tx.item?.title}
                onDisputed={() => {
                  void queryClient.invalidateQueries({ queryKey: ["tx"] });
                  setReviewTx(tx);
                  setRating(1);
                  setReviewComment("Item damaged / terms violated at return.");
                }}
              />
            </div>
          )}

          {/* 4. Buyer Side Protection: Dispute / Report Dishonest Owner */}
          {!isOwner && (isInRental || tx.status === "Disputed") && (
            <ReturnDisputeModal
              txId={tx.id}
              itemId={tx.item_id}
              borrowerId={tx.owner_id}
              borrowerUsername={tx.owner_username}
              itemTitle={tx.item?.title}
              role="borrower"
              trigger={
                <Button
                  size="sm"
                  className="border border-red-300 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white dark:border-red-800 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-600 dark:hover:text-white transition-colors"
                >
                  <ShieldAlert className="mr-1.5 size-4" />
                  Dispute Deposit / Report Owner
                </Button>
              }
              onDisputed={() => {
                void queryClient.invalidateQueries({ queryKey: ["tx"] });
                setReviewTx(tx);
                setRating(1);
                setReviewComment("Owner refused to return security deposit.");
              }}
            />
          )}

          {/* 5. Disputed State Indicator & Review Option */}
          {tx.status === "Disputed" && (
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">
                Under Dispute (Deposit Withheld)
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setReviewTx(tx);
                  setRating(1);
                  setReviewComment(
                    isOwner
                      ? "Item returned damaged / terms violated."
                      : "Owner refused to refund deposit.",
                  );
                }}
              >
                <Star className="mr-1.5 size-4 text-destructive fill-destructive" />
                Review {isOwner ? "Buyer" : "Owner"}
              </Button>
            </div>
          )}

          {/* 6. Review Button for Successfully Completed Exchanges */}
          {tx.status === "Completed" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setReviewTx(tx);
                setRating(5);
                setReviewComment("");
              }}
            >
              <Star className="mr-1.5 size-4 text-amber-500 fill-amber-500" />
              Rate & Review
            </Button>
          )}

          {/* View Item Button */}
          <Button asChild size="sm" variant="secondary">
            <Link to="/items/$id" params={{ id: String(tx.item_id) }}>
              Item
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SiteLayout wide>
      <PageHeader
        title="Transactions & Handovers"
        description="Verify pickup PINs, confirm item returns, and rate community members."
      />

      <Tabs value={currentTab} onValueChange={handleTabChange} className="mt-6">
        <TabsList>
          <TabsTrigger value="incoming">
            Incoming Requests {incoming.length > 0 && `(${incoming.length})`}
          </TabsTrigger>
          <TabsTrigger value="outgoing">
            My Requests {outgoing.length > 0 && `(${outgoing.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" className="mt-6">
          {loadingInc ? (
            <RowsSkeleton rows={3} />
          ) : incoming.length > 0 ? (
            <div className="space-y-3">
              {incoming.map((tx) => renderTransactionCard(tx, "owner"))}
            </div>
          ) : (
            <EmptyState
              title="No incoming requests"
              description="When neighbours ask to rent, adopt or buy your items, they'll appear here."
            />
          )}
        </TabsContent>

        <TabsContent value="outgoing" className="mt-6">
          {loadingOut ? (
            <RowsSkeleton rows={3} />
          ) : outgoing.length > 0 ? (
            <div className="space-y-3">
              {outgoing.map((tx) => renderTransactionCard(tx, "borrower"))}
            </div>
          ) : (
            <EmptyState
              title="No outgoing requests"
              description="You haven't requested any items yet."
              action={
                <Button asChild>
                  <Link to="/browse">Browse items</Link>
                </Button>
              }
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Review & Rating Dialog */}
      <Dialog open={Boolean(reviewTx)} onOpenChange={(open) => !open && setReviewTx(null)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleReviewSubmit}>
            <DialogHeader>
              <DialogTitle>Leave a Review</DialogTitle>
              <DialogDescription>
                How was your exchange experience for{" "}
                <strong>{reviewTx?.item?.title ?? "this item"}</strong>?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Rating</Label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      className="p-1 transition-transform hover:scale-110"
                      onClick={() => setRating(star)}
                    >
                      <Star
                        className={`size-7 ${
                          star <= rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-sm font-semibold ml-2">{rating} / 5 Stars</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reviewComment">Feedback & Experience</Label>
                <Textarea
                  id="reviewComment"
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="e.g. Item was returned on time and in perfect condition!"
                  maxLength={500}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setReviewTx(null)}
                disabled={submittingReview}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submittingReview}>
                {submittingReview ? "Submitting…" : "Submit Review"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SiteLayout>
  );
}
