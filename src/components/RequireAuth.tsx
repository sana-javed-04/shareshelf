import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { SiteLayout } from "@/components/SiteLayout";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { Link } from "@tanstack/react-router";

function FullPageLoader({ label }: { label: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
      <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function RequireAuth({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      void navigate({ to: "/login", search: { redirect: window.location.pathname }, replace: true });
    }
  }, [loading, user, navigate]);

  if (loading) return <FullPageLoader label="Checking your session" />;
  if (!user) return <FullPageLoader label="Redirecting to sign in" />;

  if (admin && !isAdmin) {
    return (
      <SiteLayout>
        <EmptyState
          icon={ShieldAlert}
          title="Admins only"
          description="You do not have permission to perform this action. If you believe this is a mistake, contact a ShareShelf moderator."
          action={
            <Button asChild>
              <Link to="/dashboard">Back to dashboard</Link>
            </Button>
          }
        />
      </SiteLayout>
    );
  }

  return <>{children}</>;
}
