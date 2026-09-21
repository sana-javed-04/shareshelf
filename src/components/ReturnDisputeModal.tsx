import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Camera, ShieldAlert, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { reportService } from "@/services/reportService";
import { transactionService } from "@/services/transactionService";
import { readImageAsDataUrl, validateImage } from "@/services/itemService";
import { errorMessage } from "@/lib/api/errors";
import { useAuth } from "@/context/AuthContext";

// Seller reporting Borrower reasons
const OWNER_REPORT_REASONS = [
  "Item returned damaged or broken",
  "Borrower disappeared / item not returned",
  "Parts, cables or accessories missing",
  "Borrower refused to pay agreed rent/deposit",
  "Severe violation of rental terms",
] as const;

// Buyer reporting Owner reasons
const BORROWER_REPORT_REASONS = [
  "Owner refused to refund security deposit",
  "Owner made false or unfair damage accusations",
  "Item was already defective / broken before pickup",
  "Owner demanded extra unfair cash / charges",
  "Abusive behavior or harassment",
] as const;

export function ReturnDisputeModal({
  txId,
  itemId,
  borrowerId,
  borrowerUsername,
  itemTitle,
  trigger,
  role = "owner",
  onDisputed,
}: {
  txId: number;
  itemId: number;
  borrowerId: number;
  borrowerUsername?: string;
  itemTitle?: string;
  trigger?: ReactNode;
  role?: "owner" | "borrower";
  onDisputed?: () => void;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const isBorrowerReporting = role === "borrower";
  const activeReasons = isBorrowerReporting ? BORROWER_REPORT_REASONS : OWNER_REPORT_REASONS;

  const [reason, setReason] = useState<string>(activeReasons[0]);
  const [description, setDescription] = useState("");
  const [damageImage, setDamageImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onPhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateImage(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      const dataUrl = await readImageAsDataUrl(file);
      setDamageImage(dataUrl);
    } catch {
      toast.error("Failed to load selected photo.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to lodge a dispute.");
      return;
    }

    if (!description.trim()) {
      toast.error("Please provide brief details of the dispute.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Transaction ko Disputed lock karein
      try {
        await transactionService.dispute(txId);
      } catch {
        // Agar pehle se dispute hai toh aage report bhej sake
      }

      // 2. Admin ke paas report record bhejein
      const prefix = isBorrowerReporting ? "[DEPOSIT DISPUTE]" : "[DAMAGE DISPUTE]";

      await reportService.create({
        reason: `${prefix} ${reason}`,
        description: description.trim(), // Sirf clean text bhejenge
        evidence_image: damageImage || undefined, // Base64 picture
        reported_item_id: Number(itemId),
        reported_user_id: Number(borrowerId),
      });

      toast.warning("Dispute lodged! Platform admin will review the case.");
      setOpen(false);
      setDescription("");
      setDamageImage(null);

      if (onDisputed) {
        onDisputed();
      }
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="destructive">
            <ShieldAlert className="mr-1.5 size-4" /> Report Damage / Issue
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="size-5" />
              {isBorrowerReporting ? "Dispute Deposit with Owner" : "Report Return Handover Issue"}
            </DialogTitle>
            <DialogDescription>
              Filing a dispute against{" "}
              <strong>{borrowerUsername ?? (isBorrowerReporting ? "owner" : "borrower")}</strong>{" "}
              for <strong>{itemTitle ?? "this item"}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isBorrowerReporting
                ? "What is the issue with the owner?"
                : "What went wrong at return?"}
            </Label>
            <RadioGroup value={reason} onValueChange={setReason} className="gap-2">
              {activeReasons.map((r) => (
                <label
                  key={r}
                  htmlFor={`dispute-${r}`}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition hover:bg-muted/50"
                >
                  <RadioGroupItem value={r} id={`dispute-${r}`} />
                  <span className="text-sm font-medium leading-none">{r}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dispute-details">Detailed Explanation *</Label>
            <Textarea
              id="dispute-details"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                isBorrowerReporting
                  ? "Explain why the owner refused to return the deposit or what happened..."
                  : "Explain how the item was damaged or what happened..."
              }
              maxLength={1500}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Evidence / Photo Proof (Optional)</Label>
            {damageImage ? (
              <div className="relative h-36 w-full overflow-hidden rounded-xl border bg-card">
                <img src={damageImage} alt="Evidence" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setDamageImage(null)}
                  className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-black/70 text-white hover:bg-destructive"
                  aria-label="Remove photo"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="dispute-photo-input"
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-destructive/40 bg-destructive/5 p-4 text-center transition hover:bg-destructive/10"
              >
                <Camera className="size-6 text-destructive" />
                <span className="mt-1 text-sm font-semibold text-destructive">
                  Upload screenshot of payment, chat, or item condition
                </span>
                <span className="text-xs text-muted-foreground">Admin review proof</span>
                <input
                  id="dispute-photo-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void onPhotoSelect(e)}
                />
              </label>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit Dispute to Admin"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
