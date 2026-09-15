import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { LocateFixed } from "lucide-react";
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
      { name: "description", content: "Update your display name and approximate neighbourhood." },
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

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Your browser does not support location sharing.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const fuzzed = fuzzCoordinates(pos.coords.latitude, pos.coords.longitude);
        setCoords({ lat: fuzzed.lat, lng: fuzzed.lng });
        toast.success("Location updated to an approximate point.");
      },
      () => toast.error("Could not read your location."),
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
      toast.success("Profile saved.");
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
      <form onSubmit={save} className="grid max-w-xl gap-5 rounded-2xl border bg-card p-6 shadow-soft">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email (private)</Label>
          <Input id="email" value={user?.email ?? ""} readOnly disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="area">Area</Label>
          <Input id="area" value={areaName} onChange={(e) => setAreaName(e.target.value)} />
        </div>
        <div className="flex items-center justify-between rounded-xl border p-3 text-sm">
          <span className="text-muted-foreground">
            {coords ? `Approximate point: ${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}` : "No location set"}
          </span>
          <Button type="button" variant="secondary" size="sm" onClick={useMyLocation}>
            <LocateFixed className="mr-2 size-4" aria-hidden="true" /> Use my location
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Member since {formatDate(user?.created_at)} · {user?.total_transactions ?? 0} completed exchanges
        </p>
        <div>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </form>
    </SiteLayout>
  );
}
