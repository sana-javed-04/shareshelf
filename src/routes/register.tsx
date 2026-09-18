import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { ExternalLink, LocateFixed, MapPin } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { errorMessage } from "@/lib/api/errors";
import { DEFAULT_CENTER, fuzzCoordinates } from "@/lib/utils/geo";

const schema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be under 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Use letters, numbers and underscores only"),
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  area_name: z.string().trim().min(2, "Tell neighbours your area").max(120),
});

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create your account — ShareShelf" },
      {
        name: "description",
        content:
          "Join ShareShelf to rent, donate and resell items locally. No phone number required.",
      },
      { property: "og:title", content: "Create your account — ShareShelf" },
      {
        property: "og:description",
        content: "Join your neighbourhood's shared shelf in under a minute.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RegisterPage,
});

// Helper: Extract coordinates from Google Maps link or raw text
function parseCoordsFromInput(text: string): { lat: number; lng: number } | null {
  const match = text.match(/(@|q=|\?ll=)(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match) {
    return { lat: parseFloat(match[2]), lng: parseFloat(match[3]) };
  }
  return null;
}

function RegisterPage() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ username: "", email: "", password: "", area_name: "" });
  const [coords, setCoords] = useState(DEFAULT_CENTER);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (user) void navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);

  function openGoogleMaps() {
    window.open("https://www.google.com/maps", "_blank");
    toast.info("Find your area on Google Maps, then type or paste it below.");
  }

  function checkOnMap() {
    const q = values.area_name.trim();
    if (!q) {
      toast.error("Please enter your area name first.");
      return;
    }
    const url = q.startsWith("http")
      ? q
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
    window.open(url, "_blank");
  }

  function handleAreaChange(val: string) {
    setValues((v) => ({ ...v, area_name: val }));
    const detected = parseCoordsFromInput(val);
    if (detected) {
      const fuzzed = fuzzCoordinates(detected.lat, detected.lng);
      setCoords(fuzzed);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Your browser does not support location sharing.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocating(false);
        const fuzzed = fuzzCoordinates(pos.coords.latitude, pos.coords.longitude);
        setCoords(fuzzed);

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&addressdetails=1`,
            { headers: { "Accept-Language": "en" } },
          );
          const data = await res.json();
          const addr = data?.address || {};
          const detectedArea =
            addr.suburb || addr.neighbourhood || addr.city || addr.town || "Local Area";
          setValues((v) => ({ ...v, area_name: detectedArea }));
          toast.success(`Location set to ${detectedArea}`);
        } catch {
          toast.success("Location locked to your current device GPS.");
        }
      },
      () => {
        setLocating(false);
        toast.error("Could not read your GPS location.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (next[String(i.path[0])] = i.message));
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const u = await register({ ...parsed.data, latitude: coords.lat, longitude: coords.lng });
      toast.success(`Welcome to ShareShelf, ${u.username}!`);
      void navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-xl">
        <h1 className="font-display text-3xl font-bold tracking-tight">Join ShareShelf</h1>
        <p className="mt-2 text-muted-foreground">
          Create an account with an email and a username. Your exact address is never shared — only
          your neighbourhood is shown for easy exchanges.
        </p>
        <form
          onSubmit={onSubmit}
          noValidate
          className="mt-8 space-y-5 rounded-2xl border bg-card p-6 shadow-soft"
        >
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={values.username}
              autoComplete="username"
              maxLength={30}
              placeholder="e.g. hassan_99"
              onChange={(e) => setValues((v) => ({ ...v, username: e.target.value }))}
            />
            {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              maxLength={255}
              placeholder="you@example.com"
              onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              maxLength={128}
              onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
            />
            {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
          </div>

          {/* --- Google Maps Unified Location Section --- */}
          <div className="space-y-3 rounded-xl border bg-muted/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor="area" className="text-sm font-semibold">
                Your Area / Neighbourhood
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-primary hover:bg-primary/10"
                  onClick={openGoogleMaps}
                >
                  <MapPin className="mr-1 size-3" />
                  Open Google Maps
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={locating}
                  onClick={useMyLocation}
                >
                  <LocateFixed className="mr-1 size-3" />
                  {locating ? "Locating…" : "Use GPS"}
                </Button>
              </div>
            </div>

            <Input
              id="area"
              value={values.area_name}
              placeholder="e.g. Model Town, Okara or Johar Town, Lahore"
              maxLength={120}
              onChange={(e) => handleAreaChange(e.target.value)}
            />

            <div className="flex items-center justify-between pt-0.5 text-xs text-muted-foreground">
              <span>Neighbours use this area to discover nearby listings.</span>
              {values.area_name.trim() && (
                <button
                  type="button"
                  onClick={checkOnMap}
                  className="inline-flex items-center gap-1 font-medium text-foreground underline hover:text-primary"
                >
                  Check on Map
                  <ExternalLink className="size-3" />
                </button>
              )}
            </div>
            {errors.area_name && <p className="text-sm text-destructive">{errors.area_name}</p>}
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? "Creating account…" : "Create account"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already a member?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </SiteLayout>
  );
}
