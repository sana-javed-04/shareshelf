import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
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
import { CATEGORIES, CONDITIONS, LISTING_TYPES } from "@/lib/types";
import type { Category, Condition, ListingType } from "@/lib/types";
import { itemService, readImageAsDataUrl, validateImage } from "@/services/itemService";
import { errorMessage } from "@/lib/api/errors";
import { useAuth } from "@/context/AuthContext";

const schema = z.object({
  title: z.string().trim().min(3, "Give your item a clear title").max(120),
  description: z.string().trim().min(10, "Add at least a sentence of detail").max(2000),
  area_name: z.string().trim().min(3, "Enter area name (e.g. Johar Town, Lahore)").max(120),
  price: z.number().min(0, "Price cannot be negative"),
});

export const Route = createFileRoute("/post-item")({
  head: () => ({
    meta: [
      { title: "Post an item — ShareShelf" },
      {
        name: "description",
        content: "List an item to rent, donate or sell to neighbours nearby.",
      },
      { property: "og:title", content: "Post an item — ShareShelf" },
      { property: "og:description", content: "Share what you own with your local community." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <PostItemPage />
    </RequireAuth>
  ),
});

// Helper function to extract Lat/Lng from Google Maps link or provide fallback
function parseCoordinates(
  mapUrl: string,
  fallbackLat?: number | null,
  fallbackLng?: number | null,
): [number, number] {
  // Check for @lat,lng or ?q=lat,lng or ll=lat,lng
  const match = mapUrl.match(/(@|q=|\?ll=)(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match) {
    return [parseFloat(match[2]), parseFloat(match[3])];
  }
  // Fallback to logged in user's coordinates or standard local coords
  return [fallbackLat ?? 30.813, fallbackLng ?? 73.45];
}

function PostItemPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("Other");
  const [condition, setCondition] = useState<Condition>("Good");
  const [listingType, setListingType] = useState<ListingType>("RENT");
  const [price, setPrice] = useState("0");
  const [maxDays, setMaxDays] = useState("7");

  const [areaName, setAreaName] = useState(user?.area_name ?? "");
  const [mapLink, setMapLink] = useState("");

  const [image, setImage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function openGoogleMaps() {
    window.open("https://www.google.com/maps", "_blank");
    toast.info("Google Maps par apni location dhoond kar share link copy karein.");
  }

  function verifyMapLink() {
    const link = mapLink.trim() || areaName.trim();
    if (!link) {
      toast.error("Pehle area name ya map link likhein.");
      return;
    }
    if (link.startsWith("http://") || link.startsWith("https://")) {
      window.open(link, "_blank");
    } else {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(link)}`,
        "_blank",
      );
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    const problem = validateImage(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    setImage(await readImageAsDataUrl(file));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = schema.safeParse({
      title,
      description,
      area_name: areaName,
      price: listingType === "DONATE" ? 0 : Number(price || 0),
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        next[String(i.path[0])] = i.message;
      });
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitting(true);

    const finalLocationString = mapLink.trim()
      ? `${parsed.data.area_name} || ${mapLink.trim()}`
      : parsed.data.area_name;

    // Calculate concrete coordinates
    const [finalLat, finalLng] = parseCoordinates(mapLink, user?.latitude, user?.longitude);

    try {
      const item = await itemService.create({
        title: parsed.data.title,
        description: parsed.data.description,
        area_name: finalLocationString,
        price: parsed.data.price,
        category,
        item_condition: condition,
        listing_type: listingType,
        max_rental_days: listingType === "RENT" ? Number(maxDays || 7) : null,
        latitude: finalLat,
        longitude: finalLng,
        image_path: image,
      });
      toast.success("Your listing is live.");
      void navigate({ to: "/items/$id", params: { id: String(item.id) } });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SiteLayout>
      <PageHeader
        title="Post an item"
        description="Rent it out, pass it on, or sell it — your neighbours are one shelf away."
      />
      <form
        onSubmit={submit}
        className="grid max-w-3xl gap-5 rounded-2xl border bg-card p-6 shadow-soft"
      >
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />
          {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
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

        {listingType !== "DONATE" && (
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price">
                {listingType === "RENT" ? "Price per day (Rs)" : "Price (Rs)"}
              </Label>
              <Input
                id="price"
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              {errors.price && <p className="text-sm text-destructive">{errors.price}</p>}
            </div>
            {listingType === "RENT" && (
              <div className="space-y-2">
                <Label htmlFor="days">Max rental days</Label>
                <Input
                  id="days"
                  type="number"
                  min={1}
                  value={maxDays}
                  onChange={(e) => setMaxDays(e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        {/* --- Location Section (Display Name + Optional Exact Link) --- */}
        <div className="space-y-4 rounded-xl border bg-muted/40 p-4">
          <div className="space-y-1">
            <Label htmlFor="area">Pickup Area (Visible to everyone)</Label>
            <Input
              id="area"
              value={areaName}
              placeholder="e.g. Johar Town, Lahore or Model Town, Okara"
              onChange={(e) => setAreaName(e.target.value)}
            />
            {errors.area_name && <p className="text-sm text-destructive">{errors.area_name}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="maplink" className="text-xs font-semibold text-muted-foreground">
                Exact Google Maps Link (Optional, for precise direction)
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-primary hover:bg-primary/10"
                onClick={openGoogleMaps}
              >
                📍 Open Google Maps
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                id="maplink"
                value={mapLink}
                placeholder="Paste Google Maps share link (e.g. https://maps.app.goo.gl/...)"
                onChange={(e) => setMapLink(e.target.value)}
              />
              <Button type="button" variant="outline" size="sm" onClick={verifyMapLink}>
                Test Link
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="photo">Photo (optional)</Label>
          <Input
            id="photo"
            type="file"
            accept="image/*"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          {image && (
            <img
              src={image}
              alt="Preview of your listing"
              className="mt-2 h-40 rounded-xl object-cover"
            />
          )}
        </div>

        <div>
          <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={submitting}>
            {submitting ? "Publishing…" : "Publish listing"}
          </Button>
        </div>
      </form>
    </SiteLayout>
  );
}
