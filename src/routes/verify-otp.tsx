import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/authService";
import { errorMessage } from "@/lib/api/errors";

export const Route = createFileRoute("/verify-otp")({
  component: VerifyOtpPage,
});

function VerifyOtpPage() {
  const queryParams = new URLSearchParams(window.location.search);
  const initialEmail = queryParams.get("email") || "";

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !otp.trim()) {
      toast.error("Please enter both email and 6-digit OTP code.");
      return;
    }

    setSubmitting(true);
    try {
      const user = await authService.verifyOtp(email.trim(), otp.trim());
      toast.success(`Account verified successfully! Welcome ${user.username}`);
      window.location.href = "/dashboard";
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-md mt-12">
        <div className="rounded-2xl border bg-card p-6 shadow-soft space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="font-display text-2xl font-bold tracking-tight">Verify Your Email</h1>
            <p className="text-sm text-muted-foreground">
              We have sent a 6-digit verification code to your email address. Enter it below to
              activate your account.
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="otp">6-Digit OTP Code</Label>
              <Input
                id="otp"
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="text-center tracking-widest text-lg font-bold"
                required
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting ? "Verifying..." : "Verify Account"}
            </Button>
          </form>
        </div>
      </div>
    </SiteLayout>
  );
}
