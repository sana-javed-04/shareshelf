import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader, SiteLayout } from "@/components/SiteLayout";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RowsSkeleton } from "@/components/LoadingSkeleton";
import { itemService } from "@/services/itemService";
import { errorMessage } from "@/lib/api/errors";
import { CATEGORIES, CONDITIONS, LISTING_TYPES } from "@/lib/types";
import type { Category, Condition, ItemStatus, ListingType } from "@/lib/types";

const STATUSES: ItemStatus[] = ["Available", "Reserved", "Rented", "Sold"];

export const Route = createFileRoute("/items_/$id/edit")({
  head: () => ({
    meta: [
      { title: "Edit listing — ShareShelf" },
      {
        name: "description",
        content: "Update the details, price and status of your ShareShelf listing.",
      },
      { property: "og:title", content: "Edit listing — ShareShelf" },
      { property: "og:description", content: "Keep your listing accurate for neighbours." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <EditItemPage />
    </RequireAuth>
  ),
});

function EditItemPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const itemId = Number(id);

  const { data, isLoading } = useQuery({
    queryKey: ["item", itemId],
    queryFn: () => itemService.get(itemId),
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("Other");
  const [condition, setCondition] = useState<Condition>("Good");
  const [listingType, setListingType] = useState<ListingType>("RENT");
  const [price, setPrice] = useState("0");
  const [securityDeposit, setSecurityDeposit] = useState("0");
  const [maxDays, setMaxDays] = useState("7");
  const [quantity, setQuantity] = useState("1");
  const [areaName, setAreaName] = useState("");
  const [status, setStatus] = useState<ItemStatus>("Available");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setTitle(data.title);
    setDescription(data.description);
    setCategory(data.category);
    setCondition(data.item_condition);
    setListingType(data.listing_type);
    setPrice(String(data.price));
    setSecurityDeposit(String(data.security_deposit ?? 0));
    setMaxDays(String(data.max_rental_days ?? 7));
    setQuantity(String(data.quantity ?? 1));
    setAreaName(data.area_name);
    setStatus(data.status);
  }, [data]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await itemService.update(itemId, {
        title: title.trim(),
        description: description.trim(),
        category,
        item_condition: condition,
        listing_type: listingType,
        price: listingType === "DONATE" ? 0 : Number(price || 0),
        security_deposit: listingType === "RENT" ? Number(securityDeposit || 0) : 0,
        max_rental_days: listingType === "RENT" ? Number(maxDays || 7) : null,
        quantity: Math.max(1, Number(quantity || 1)),
        area_name: areaName.trim(),
        status,
      });
      toast.success("Listing updated.");
      await queryClient.invalidateQueries({ queryKey: ["item", itemId] });
      void navigate({ to: "/items/$id", params: { id } });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    try {
      await itemService.remove(itemId);
      toast.success("Listing removed.");
      await queryClient.invalidateQueries({ queryKey: ["items"] });
      void navigate({ to: "/my-listings" });
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title="Edit listing"
          description="Keep the details fresh so neighbours know what to expect."
        />

        {isLoading || !data ? (
          <RowsSkeleton rows={4} />
        ) : (
          <form
            onSubmit={save}
            className="mt-6 grid gap-5 rounded-2xl border bg-card p-6 shadow-soft"
          >
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Condition</Label>
                <Select value={condition} onValueChange={(v) => setCondition(v as Condition)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Listing type</Label>
                <Select value={listingType} onValueChange={(v) => setListingType(v as ListingType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LISTING_TYPES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Pricing, Deposit, Max Days & Available Stock Amount */}
            <div
              className={`grid gap-5 ${
                listingType === "RENT"
                  ? "sm:grid-cols-4"
                  : listingType === "DONATE"
                    ? "sm:grid-cols-1"
                    : "sm:grid-cols-2"
              }`}
            >
              {listingType !== "DONATE" && (
                <div className="space-y-2">
                  <Label htmlFor="price">
                    {listingType === "RENT" ? "Daily Rent (Rs)" : "Selling Price (Rs)"}
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    min={0}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
              )}

              {listingType === "RENT" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="deposit">Security Deposit (Rs)</Label>
                    <Input
                      id="deposit"
                      type="number"
                      min={0}
                      value={securityDeposit}
                      onChange={(e) => setSecurityDeposit(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="days">Max days</Label>
                    <Input
                      id="days"
                      type="number"
                      min={1}
                      value={maxDays}
                      onChange={(e) => setMaxDays(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* Available Units / Stock Input */}
              <div className="space-y-2">
                <Label htmlFor="quantity">Stock / Available Units</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  max={100}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="area">Pickup area</Label>
                <Input
                  id="area"
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  placeholder="e.g. Model Town, Okara"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as ItemStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
              <Button type="button" variant="destructive" onClick={() => void remove()}>
                Delete listing
              </Button>
            </div>
          </form>
        )}
      </div>
    </SiteLayout>
  );
}
