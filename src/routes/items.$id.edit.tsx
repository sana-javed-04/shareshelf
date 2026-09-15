import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
import type { ItemStatus } from "@/lib/types";

const STATUSES: ItemStatus[] = ["Available", "Reserved", "Rented", "Sold"];

export const Route = createFileRoute("/items/$id/edit")({
  head: () => ({
    meta: [
      { title: "Edit listing — ShareShelf" },
      { name: "description", content: "Update the details, price and status of your ShareShelf listing." },
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
  const itemId = Number(id);
  const { data, isLoading } = useQuery({
    queryKey: ["item", itemId],
    queryFn: () => itemService.get(itemId),
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [areaName, setAreaName] = useState("");
  const [status, setStatus] = useState<ItemStatus>("Available");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setTitle(data.title);
    setDescription(data.description);
    setPrice(String(data.price));
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
        price: Number(price || 0),
        area_name: areaName.trim(),
      });
      toast.success("Listing updated.");
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
      void navigate({ to: "/my-listings" });
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <SiteLayout>
      <PageHeader title="Edit listing" description="Keep the details fresh so neighbours know what to expect." />
      {isLoading || !data ? (
        <RowsSkeleton rows={3} />
      ) : (
        <form onSubmit={save} className="grid max-w-2xl gap-5 rounded-2xl border bg-card p-6 shadow-soft">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price">Price (Rs)</Label>
              <Input
                id="price"
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
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
          <div className="space-y-2">
            <Label htmlFor="area">Pickup area</Label>
            <Input id="area" value={areaName} onChange={(e) => setAreaName(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button type="button" variant="destructive" onClick={() => void remove()}>
              Delete listing
            </Button>
          </div>
        </form>
      )}
    </SiteLayout>
  );
}
