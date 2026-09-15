import { createFileRoute, Link } from "@tanstack/react-router";
import { KeyRound, MessagesSquare, PackageSearch, PlusCircle, RotateCcw, ShieldCheck } from "lucide-react";
import { PageHeader, SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How ShareShelf works — rent, donate, resell locally" },
      {
        name: "description",
        content:
          "Post an item, agree in chat, hand it over with a one-time pickup PIN and confirm the return. Here is every step.",
      },
      { property: "og:title", content: "How ShareShelf works" },
      {
        property: "og:description",
        content: "A five-step, privacy-first flow for renting, donating and reselling with neighbours.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HowItWorksPage,
});

const STEPS = [
  {
    Icon: PlusCircle,
    title: "1. Post or browse",
    body: "List something you rarely use, or search your neighbourhood by category, condition, price and radius.",
  },
  {
    Icon: PackageSearch,
    title: "2. Send a request",
    body: "Ask the owner for the item. They see your username and approximate area — never your contact details.",
  },
  {
    Icon: MessagesSquare,
    title: "3. Agree in chat",
    body: "Built-in messaging keeps the whole conversation on ShareShelf. No phone numbers change hands.",
  },
  {
    Icon: KeyRound,
    title: "4. Hand over with a PIN",
    body: "Approved borrowers get a one-time pickup PIN. The owner verifies it in person to start the exchange.",
  },
  {
    Icon: RotateCcw,
    title: "5. Return and close",
    body: "The owner confirms the return, the listing frees up and both members' exchange counts go up.",
  },
];

function HowItWorksPage() {
  return (
    <SiteLayout>
      <PageHeader
        title="How ShareShelf works"
        description="Five steps from cluttered cupboard to a neighbour who actually needs it."
        actions={
          <Button asChild>
            <Link to="/browse">Browse items</Link>
          </Button>
        }
      />
      <ol className="grid gap-5 md:grid-cols-2">
        {STEPS.map(({ Icon, title, body }) => (
          <li key={title} className="rounded-2xl border bg-card p-6 shadow-soft">
            <span className="grid size-11 place-items-center rounded-xl border surface-gradient">
              <Icon className="size-5 text-primary" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </li>
        ))}
        <li className="rounded-2xl border border-dashed bg-card/60 p-6">
          <span className="grid size-11 place-items-center rounded-xl border surface-gradient">
            <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">Privacy by default</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Locations are coarsened to roughly a one-kilometre grid, emails stay private and moderators review
            every report.
          </p>
          <Button asChild variant="secondary" size="sm" className="mt-4">
            <Link to="/safety">Read the safety guide</Link>
          </Button>
        </li>
      </ol>
    </SiteLayout>
  );
}
