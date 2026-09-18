import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { errorMessage } from "@/lib/api/errors";
import { isDemoMode } from "@/lib/api/client";

const schema = z.object({
  username: z.string().trim().min(1, "Enter your username or email").max(120),
  password: z.string().min(1, "Enter your password").max(128),
});

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search.redirect === "string" ? { redirect: search.redirect } : {},
  head: () => ({
    meta: [
      { title: "Sign in — ShareShelf" },
      {
        name: "description",
        content: "Sign in to ShareShelf to rent, donate and resell items with neighbours.",
      },
      { property: "og:title", content: "Sign in — ShareShelf" },
      {
        property: "og:description",
        content: "Access your ShareShelf listings, requests and messages.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [values, setValues] = useState({ username: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) void navigate({ to: redirect ?? "/dashboard", replace: true });
  }, [user, navigate, redirect]);

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
      const u = await login(parsed.data.username, parsed.data.password);
      toast.success(`Welcome back, ${u.username}!`);
      void navigate({ to: redirect ?? "/dashboard", replace: true });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-muted-foreground">
          Sign in to manage your listings, requests and in-app messages.
        </p>

        <form
          onSubmit={onSubmit}
          noValidate
          className="mt-8 space-y-5 rounded-2xl border bg-card p-6 shadow-soft"
        >
          <div className="space-y-2">
            <Label htmlFor="username">Username or email</Label>
            <Input
              id="username"
              autoComplete="username"
              value={values.username}
              onChange={(e) => setValues((v) => ({ ...v, username: e.target.value }))}
              aria-invalid={Boolean(errors.username)}
              aria-describedby={errors.username ? "username-error" : undefined}
            />
            {errors.username && (
              <p id="username-error" className="text-sm text-destructive">
                {errors.username}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={values.password}
              onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
            />
            {errors.password && (
              <p id="password-error" className="text-sm text-destructive">
                {errors.password}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            New to ShareShelf?{" "}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </form>

        {isDemoMode && (
          <div className="mt-6 rounded-xl border border-dashed bg-secondary/50 p-4 text-sm">
            <p className="font-semibold">Preview demo accounts</p>
            <p className="mt-1 text-muted-foreground">
              Member: <code className="font-mono">aisha</code> /{" "}
              <code className="font-mono">password123</code>
              <br />
              Admin: <code className="font-mono">admin</code> /{" "}
              <code className="font-mono">admin12345</code>
            </p>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
