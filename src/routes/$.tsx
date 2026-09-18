import { createFileRoute, Link } from "@tanstack/react-router";
import { Compass } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/$")({
  head: () => ({
    meta: [
      { title: "Page not found — ShareShelf" },
      {
        name: "description",
        content: "This ShareShelf page does not exist. Head back to the shelf.",
      },
      { property: "og:title", content: "Page not found — ShareShelf" },
      {
        property: "og:description",
        content: "The page you were looking for has moved or never existed.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotFoundPage,
});

function NotFoundPage() {
  return (
    <SiteLayout>
      <h1 className="sr-only">Page not found</h1>
      <EmptyState
        icon={Compass}
        title="We could not find that page"
        description="The link may be broken, or the listing might have been taken down."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link to="/browse">Browse items</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/">Go home</Link>
            </Button>
          </div>
        }
      />
    </SiteLayout>
  );
}
