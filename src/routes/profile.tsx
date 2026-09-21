import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { ExternalLink, LocateFixed, MapPin } from "lucide-react";
import { PageHeader, SiteLayout } from "@/components/SiteLayout";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/authService";
import { errorMessage } from "@/lib/api/errors";
import { fuzzCoordinates } from "@/lib/utils/geo";
import { formatDate } from "@/lib/utils/formatters";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — ShareShelf" },
      { name: "description", content: "Update your display name and neighbourhood on ShareShelf." },
      { property: "og:title", content: "Your profile — ShareShelf" },
      { property: "og:description", content: "Control what neighbours can see about you." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <ProfilePage />
    </RequireAuth>
  ),
});

function parseCoordsFromInput(text: string): { lat: number; lng: number } | null {
  const match = text.match(/(@|q=|\?ll=)(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match) {
    return { lat: parseFloat(match[2]), lng: parseFloat(match[3]) };
  }
  return null;
}

function ProfilePage() {
  const { user, setUser } = useAuth();
  const [username, setUsername] = useState(user?.username ?? "");
  const [areaName, setAreaName] = useState(user?.area_name ?? "");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    user?.latitude != null && user?.longitude != null
      ? { lat: user.latitude, lng: user.longitude }
      : null,
  );
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  function openGoogleMaps() {
    window.open("https://www.google.com/maps", "_blank");
    toast.info("Pick your location from Google Maps and enter it below.");
  }

  function checkOnMap() {
    const q = areaName.trim();
    if (!q) {
      toast.error("Please enter an area name first.");
      return;
    }
    const url = q.startsWith("http")
      ? q
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
    window.open(url, "_blank");
  }

  function handleAreaChange(val: string) {
    setAreaName(val);
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
        setCoords({ lat: fuzzed.lat, lng: fuzzed.lng });

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&addressdetails=1`,
            { headers: { "Accept-Language": "en" } },
          );
          const data = await res.json();
          const addr = data?.address || {};
          const detectedCity =
            addr.suburb || addr.neighbourhood || addr.city || addr.town || "Local Area";
          setAreaName(detectedCity);
          toast.success(`Location updated to ${detectedCity}`);
        } catch {
          toast.success("Location locked to your device GPS.");
        }
      },
      () => {
        setLocating(false);
        toast.error("Could not read your location.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await authService.updateMe({
        username: username.trim(),
        area_name: areaName.trim(),
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
      });
      setUser(updated);
      toast.success("Profile saved successfully.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title="Your profile"
          description="Neighbours only ever see your username, approximate area and activity count."
        />
        <div className="mt-6">
          <form onSubmit={save} className="grid gap-5 rounded-2xl border bg-card p-6 shadow-soft">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email (private)</Label>
              <Input id="email" value={user?.email ?? ""} readOnly disabled className="bg-muted" />
            </div>

            {/* Google Maps Location Section */}
            <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="area" className="text-sm font-semibold">
                  Primary Neighbourhood / City
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs font-medium text-foreground hover:bg-accent"
                    onClick={openGoogleMaps}
                  >
                    <MapPin className="mr-1 size-3 text-primary" />
                    Open Google Maps
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs font-medium text-foreground hover:bg-accent"
                    disabled={locating}
                    onClick={useMyLocation}
                  >
                    <LocateFixed className="mr-1 size-3 text-primary" />
                    {locating ? "Locating…" : "Use GPS"}
                  </Button>
                </div>
              </div>

              <Input
                id="area"
                value={areaName}
                placeholder="e.g. Model Town, Okara or Johar Town, Lahore"
                onChange={(e) => handleAreaChange(e.target.value)}
              />

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Used as your default location for nearby discovery.</span>
                {areaName.trim() && (
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
            </div>

            <p className="text-sm text-muted-foreground">
              Member since {formatDate(user?.created_at)} · {user?.total_transactions ?? 0}{" "}
              completed exchanges
            </p>

            <div>
              <Button type="submit" size="lg" disabled={saving}>
                {saving ? "Saving…" : "Save profile"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </SiteLayout>
  );
}
