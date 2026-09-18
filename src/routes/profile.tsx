import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, Flag, LocateFixed, MapPin } from "lucide-react";
import { PageHeader, SiteLayout } from "@/components/SiteLayout";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/authService";
import { reportService } from "@/services/reportService";
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

  // Buyer ki apni submit ki hui reports
  const { data: myReports, isLoading: reportsLoading } = useQuery({
    queryKey: ["reports", "my"],
    queryFn: reportService.myReports,
  });

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
      <PageHeader
        title="Your profile"
        description="Neighbours only ever see your username, approximate area and activity count."
      />
      <div className="grid max-w-xl gap-8">
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
            Member since {formatDate(user?.created_at)} · {user?.total_transactions ?? 0} completed
            exchanges
          </p>

          <div>
            <Button type="submit" size="lg" disabled={saving}>
              {saving ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </form>

        {/* Buyer's Submitted Reports Section */}
        <div className="rounded-2xl border bg-card p-6 shadow-soft space-y-4">
          <div className="flex items-center gap-2">
            <Flag className="size-5 text-primary" />
            <h2 className="text-lg font-semibold">Your Submitted Reports</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Track the status of listings or members you have reported for safety.
          </p>

          {reportsLoading ? (
            <p className="text-xs text-muted-foreground">Loading reports…</p>
          ) : !myReports || myReports.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">You haven't reported any listings.</p>
          ) : (
            <div className="divide-y rounded-xl border">
              {myReports.map((r) => (
                <div key={r.id} className="p-3.5 space-y-1.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground">{r.reason}</span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.status === "Reviewed"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : r.status === "Dismissed"
                            ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                  {r.item_title && (
                    <p className="text-xs text-muted-foreground">
                      Listing: <span className="font-medium text-foreground">{r.item_title}</span>
                    </p>
                  )}
                  {r.description && (
                    <p className="text-xs text-muted-foreground italic">"{r.description}"</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Submitted on {formatDate(r.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
