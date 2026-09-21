import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
import { MapPin, ShieldAlert, UploadCloud, X } from "lucide-react";
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
  area_name: z.string().trim().min(3, "Enter area name (e.g. Model Town, Okara)").max(120),
  price: z.number().min(0, "Price cannot be negative"),
  security_deposit: z.number().min(0, "Security deposit cannot be negative").optional(),
  quantity: z.number().min(1, "At least 1 item must be available"),
});

export const Route = createFileRoute("/post-item")({
  head: () => ({
    meta: [
      { title: "Post an item — ShareShelf" },
      {
        name: "description",
        content: "List items to rent, donate or sell to neighbours nearby.",
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

function parseCoordinates(
  mapUrl: string,
  fallbackLat?: number | null,
  fallbackLng?: number | null,
): [number, number] {
  const match = mapUrl.match(/(@|q=|\?ll=)(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match) {
    return [parseFloat(match[2]), parseFloat(match[3])];
  }
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
  const [securityDeposit, setSecurityDeposit] = useState("0");
  const [quantity, setQuantity] = useState("1");
  const [maxDays, setMaxDays] = useState("7");

  const [areaName, setAreaName] = useState(user?.area_name ?? "");
  const [mapLink, setMapLink] = useState("");

  // Multiple Images State
  const [images, setImages] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function openGoogleMaps() {
    window.open("https://www.google.com/maps", "_blank");
    toast.info("Find your location on Google Maps and copy the share link.");
  }

  function verifyMapLink() {
    const link = mapLink.trim() || areaName.trim();
    if (!link) {
      toast.error("Please enter an area name or map link first.");
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

  // Handle multiple file selection
  async function onFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    if (images.length + fileList.length > 5) {
      toast.error("You can upload a maximum of 5 photos.");
      return;
    }

    const newImages: string[] = [];
    for (const file of Array.from(fileList)) {
      const problem = validateImage(file);
      if (problem) {
        toast.error(`${file.name}: ${problem}`);
        continue;
      }
      const dataUrl = await readImageAsDataUrl(file);
      newImages.push(dataUrl);
    }

    if (newImages.length > 0) {
      setImages((prev) => [...prev, ...newImages]);
    }
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = schema.safeParse({
      title,
      description,
      area_name: areaName,
      price: listingType === "DONATE" ? 0 : Number(price || 0),
      security_deposit: listingType === "RENT" ? Number(securityDeposit || 0) : 0,
      quantity: Number(quantity || 1),
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

    const [finalLat, finalLng] = parseCoordinates(mapLink, user?.latitude, user?.longitude);

    // Join multiple base64/cloud URLs using delimiter or JSON
    const packedImages = images.length > 0 ? images.join("||") : null;

    try {
      const item = await itemService.create({
        title: parsed.data.title,
        description: parsed.data.description,
        area_name: finalLocationString,
        price: parsed.data.price,
        security_deposit: parsed.data.security_deposit ?? 0,
        quantity: parsed.data.quantity,
        category,
        item_condition: condition,
        listing_type: listingType,
        max_rental_days: listingType === "RENT" ? Number(maxDays || 7) : null,
        latitude: finalLat,
        longitude: finalLng,
        image_path: packedImages,
      });

      toast.success("Your listing is live!");
      void navigate({ to: "/items/$id", params: { id: String(item.id) } });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title="Post an item"
          description="Rent it out, pass it on, or sell it — your neighbours are one shelf away."
        />
        <form
          onSubmit={submit}
          className="mt-6 grid gap-5 rounded-2xl border bg-card p-6 shadow-soft"
        >
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="e.g. Canon 80D Camera, Power drill, Mountain Bike"
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe condition, included accessories, pickup terms..."
            />
            {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
          </div>

          {/* Category, Condition, Listing Type */}
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

          {/* Price, Security Deposit & Available Units */}
          <div className="grid gap-5 sm:grid-cols-3">
            {listingType !== "DONATE" ? (
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
                {errors.price && <p className="text-sm text-destructive">{errors.price}</p>}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Price</Label>
                <Input disabled value="Free donation" />
              </div>
            )}

            {/* Total Quantity Input */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity available</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={50}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              {errors.quantity && <p className="text-sm text-destructive">{errors.quantity}</p>}
            </div>

            {listingType === "RENT" ? (
              <div className="space-y-2">
                <Label htmlFor="deposit">Security Deposit (Rs)</Label>
                <Input
                  id="deposit"
                  type="number"
                  min={0}
                  value={securityDeposit}
                  onChange={(e) => setSecurityDeposit(e.target.value)}
                  placeholder="e.g. 3000"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Security terms</Label>
                <Input disabled value="Not required" />
              </div>
            )}
          </div>

          {/* Max rental days for Rent */}
          {listingType === "RENT" && (
            <div className="space-y-2">
              <Label htmlFor="days">Max rental duration (days)</Label>
              <Input
                id="days"
                type="number"
                min={1}
                max={60}
                value={maxDays}
                onChange={(e) => setMaxDays(e.target.value)}
              />
            </div>
          )}

          {listingType === "RENT" && Number(securityDeposit) > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-primary/10 p-3 text-xs text-primary">
              <ShieldAlert className="size-4 shrink-0" />
              <span>
                Borrowers will be required to provide <strong>Rs {securityDeposit}</strong>{" "}
                refundable cash or a verified ID card at pickup, returned upon safe return of the
                item.
              </span>
            </div>
          )}

          {/* Pickup Location */}
          <div className="space-y-4 rounded-xl border bg-muted/40 p-4">
            <div className="space-y-1">
              <Label htmlFor="area">Pickup Area (Visible to everyone)</Label>
              <Input
                id="area"
                value={areaName}
                placeholder="e.g. Model Town, Okara or Johar Town, Lahore"
                onChange={(e) => setAreaName(e.target.value)}
              />
              {errors.area_name && <p className="text-sm text-destructive">{errors.area_name}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="maplink" className="text-xs font-semibold text-muted-foreground">
                  Exact Google Maps Link (Optional)
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs font-medium"
                  onClick={openGoogleMaps}
                >
                  <MapPin className="mr-1 size-3 text-primary" />
                  Open Google Maps
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

          {/* Multiple Photos Upload Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="photos">Photos (Up to 5 images)</Label>
              <span className="text-xs text-muted-foreground">
                {images.length} / 5 photos added
              </span>
            </div>

            {images.length < 5 && (
              <label
                htmlFor="photos"
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/20 p-5 transition hover:bg-muted/40"
              >
                <UploadCloud className="size-7 text-muted-foreground" />
                <span className="mt-2 text-sm font-medium text-foreground">
                  Click to select one or multiple photos
                </span>
                <span className="text-xs text-muted-foreground">PNG, JPG, WebP supported</span>
                <input
                  id="photos"
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void onFiles(e.target.files)}
                />
              </label>
            )}

            {/* Thumbnails Preview Grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 pt-2">
                {images.map((src, index) => (
                  <div
                    key={index}
                    className="group relative h-24 overflow-hidden rounded-xl border bg-card shadow-sm"
                  >
                    <img
                      src={src}
                      alt={`Preview ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-black/70 text-white transition hover:bg-destructive"
                      aria-label="Remove image"
                    >
                      <X className="size-3.5" />
                    </button>
                    {index === 0 && (
                      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] font-semibold text-white">
                        Cover
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3">
            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={submitting}>
              {submitting ? "Publishing…" : "Publish listing"}
            </Button>
          </div>
        </form>
      </div>
    </SiteLayout>
  );
}
