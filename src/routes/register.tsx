import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { LocateFixed } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { errorMessage } from "@/lib/api/errors";
import { DEFAULT_CENTER, fuzzCoordinates } from "@/lib/utils/geo";
import MapView from "@/components/MapView";

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
        content: "Join ShareShelf to rent, donate and resell items locally. No phone number required.",
      },
      { property: "og:title", content: "Create your account — ShareShelf" },
      { property: "og:description", content: "Join your neighbourhood's shared shelf in under a minute." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ username: "", email: "", password: "", area_name: "" });
  const [coords, setCoords] = useState(DEFAULT_CENTER);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) void navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Your browser does not support location sharing.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords(fuzzCoordinates(pos.coords.latitude, pos.coords.longitude));
        toast.success("Location set to your approximate area (rounded to ~1 km).");
      },
      () => toast.error("We couldn't read your location. Pick a spot on the map instead."),
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

  const field = (
    name: keyof typeof values,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        value={values[name]}
        onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
        {...props}
      />
      {errors[name] && (
        <p id={`${name}-error`} className="text-sm text-destructive">
          {errors[name]}
        </p>
      )}
    </div>
  );

  return (
    <SiteLayout>
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-2">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Join ShareShelf</h1>
          <p className="mt-2 text-muted-foreground">
            Create an account with an email and a username. We never ask for a phone number, and your exact
            address stays private — only a coarse area is ever shown.
          </p>
          <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5 rounded-2xl border bg-card p-6 shadow-soft">
            {field("username", "Username", { autoComplete: "username", maxLength: 30 })}
            {field("email", "Email", { type: "email", autoComplete: "email", maxLength: 255 })}
            {field("password", "Password", { type: "password", autoComplete: "new-password", maxLength: 128 })}
            {field("area_name", "Your area", {
              placeholder: "e.g. Gulshan-e-Iqbal, Karachi",
              maxLength: 120,
            })}
            <Button type="submit" className="w-full" disabled={submitting}>
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

        <div>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Approximate location</h2>
            <Button type="button" variant="secondary" size="sm" onClick={useMyLocation}>
              <LocateFixed className="mr-2 size-4" aria-hidden="true" />
              Use my location
            </Button>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Tap the map to set the neighbourhood you want to share within. Coordinates are rounded before they
            are stored, so nobody can find your door.
          </p>
          <MapView
            className="mt-4 h-[26rem]"
            selectable
            selected={coords}
            center={coords}
            onSelect={setCoords}
            ariaLabel="Pick your approximate area on the map"
          />
          <p className="mt-3 text-xs text-muted-foreground">
            Selected: {coords.lat.toFixed(3)}, {coords.lng.toFixed(3)} (≈1 km precision)
          </p>
        </div>
      </div>
    </SiteLayout>
  );
}
