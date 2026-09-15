import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Flag } from "lucide-react";
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
import { REPORT_REASONS } from "@/lib/types";
import { reportService } from "@/services/reportService";
import { errorMessage } from "@/lib/api/errors";
import { useAuth } from "@/context/AuthContext";

export function ReportModal({
  itemId,
  userId,
  trigger,
  label = "Report listing",
}: {
  itemId?: number;
  userId?: number;
  trigger?: ReactNode;
  label?: string;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!user) {
      toast.error("Please sign in to submit a report.");
      return;
    }
    setSubmitting(true);
    try {
      await reportService.create({
        reason,
        description: description.trim() || undefined,
        reported_item_id: itemId,
        reported_user_id: userId,
      });
      toast.success("Report submitted. Our moderators will review it.");
      setOpen(false);
      setDescription("");
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
          <Button variant="ghost" size="sm">
            <Flag className="mr-2 size-4" aria-hidden="true" />
            {label}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report to moderators</DialogTitle>
          <DialogDescription>
            Reports are private. Our team reviews every submission and never shares your identity with the
            reported member.
          </DialogDescription>
        </DialogHeader>
        <fieldset className="space-y-3">
          <legend className="mb-2 text-sm font-medium">Reason</legend>
          <RadioGroup value={reason} onValueChange={setReason} className="gap-2">
            {REPORT_REASONS.map((r) => (
              <div key={r} className="flex items-center gap-3 rounded-lg border p-3">
                <RadioGroupItem value={r} id={`reason-${r}`} />
                <Label htmlFor={`reason-${r}`} className="cursor-pointer font-normal">
                  {r}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </fieldset>
        <div className="space-y-2">
          <Label htmlFor="report-description">Additional details (optional)</Label>
          <Textarea
            id="report-description"
            value={description}
            maxLength={1000}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell us what happened…"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
