import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader, SiteLayout } from "@/components/SiteLayout";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/EmptyState";
import { RowsSkeleton } from "@/components/LoadingSkeleton";
import { TransactionStatusBadge } from "@/components/StatusBadge";
import { transactionService } from "@/services/transactionService";
import { formatDate } from "@/lib/utils/formatters";
import { errorMessage } from "@/lib/api/errors";
import type { Transaction } from "@/lib/types";

export const Route = createFileRoute("/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — ShareShelf" },
      {
        name: "description",
        content: "Approve, hand over and close out your ShareShelf exchanges.",
      },
      { property: "og:title", content: "Transactions — ShareShelf" },
      { property: "og:description", content: "Manage incoming and outgoing item exchanges." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <TransactionsPage />
    </RequireAuth>
  ),
});

function TransactionRow({
  tx,
  role,
  onDone,
}: {
  tx: Transaction;
  role: "owner" | "borrower";
  onDone: () => void;
}) {
  const [pin, setPin] = useState("");

  const run = useMutation({
    mutationFn: (action: () => Promise<Transaction>) => action(),
    onSuccess: () => {
      toast.success("Transaction updated.");
      onDone();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <TransactionStatusBadge status={tx.status} />
          <h3 className="truncate font-semibold">{tx.item?.title ?? `Item #${tx.item_id}`}</h3>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {role === "owner"
            ? `Requested by ${tx.borrower_username ?? "a neighbour"}`
            : `Owner: ${tx.owner_username ?? "neighbour"}`}
          {" · "}
          {formatDate(tx.created_at)}
          {tx.due_date ? ` · due ${formatDate(tx.due_date)}` : ""}
        </p>
        {tx.pickup_pin && (
          <p className="mt-1 text-sm font-semibold text-primary">
            Your pickup PIN: {tx.pickup_pin}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {role === "owner" && tx.status === "Pending" && (
          <>
            <Button size="sm" onClick={() => run.mutate(() => transactionService.approve(tx.id))}>
              Approve
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => run.mutate(() => transactionService.reject(tx.id))}
            >
              Reject
            </Button>
          </>
        )}
        {role === "owner" && tx.status === "Active" && !tx.pin_verified && (
          <div className="flex items-center gap-2">
            <Input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Pickup PIN"
              className="h-9 w-32"
              aria-label="Pickup PIN"
            />
            <Button
              size="sm"
              onClick={() => run.mutate(() => transactionService.verifyPin(tx.id, pin))}
            >
              Verify
            </Button>
          </div>
        )}
        {role === "owner" && tx.status === "Active" && tx.pin_verified && (
          <Button
            size="sm"
            onClick={() => run.mutate(() => transactionService.confirmReturn(tx.id))}
          >
            Confirm return
          </Button>
        )}
        {tx.status === "Pending" && role === "borrower" && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => run.mutate(() => transactionService.cancel(tx.id))}
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

function List({
  items,
  loading,
  role,
  onDone,
  emptyTitle,
}: {
  items: Transaction[] | undefined;
  loading: boolean;
  role: "owner" | "borrower";
  onDone: () => void;
  emptyTitle: string;
}) {
  if (loading) return <RowsSkeleton />;
  if (!items || items.length === 0) return <EmptyState title={emptyTitle} />;
  return (
    <div className="space-y-3">
      {items.map((tx) => (
        <TransactionRow key={tx.id} tx={tx} role={role} onDone={onDone} />
      ))}
    </div>
  );
}

function TransactionsPage() {
  const queryClient = useQueryClient();
  const incoming = useQuery({ queryKey: ["tx", "incoming"], queryFn: transactionService.incoming });
  const mine = useQuery({ queryKey: ["tx", "my"], queryFn: transactionService.my });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["tx"] });

  return (
    <SiteLayout>
      <PageHeader
        title="Transactions"
        description="Approve requests, verify pickup PINs and close the loop when items come home."
      />
      <Tabs defaultValue="incoming">
        <TabsList>
          <TabsTrigger value="incoming">Incoming requests</TabsTrigger>
          <TabsTrigger value="mine">My borrowings</TabsTrigger>
        </TabsList>
        <TabsContent value="incoming" className="mt-6">
          <List
            items={incoming.data}
            loading={incoming.isLoading}
            role="owner"
            onDone={refresh}
            emptyTitle="No incoming requests yet"
          />
        </TabsContent>
        <TabsContent value="mine" className="mt-6">
          <List
            items={mine.data}
            loading={mine.isLoading}
            role="borrower"
            onDone={refresh}
            emptyTitle="You have not requested any items yet"
          />
        </TabsContent>
      </Tabs>
    </SiteLayout>
  );
}
