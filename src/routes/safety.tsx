import { createFileRoute, Link } from "@tanstack/react-router";
import { EyeOff, Flag, KeyRound, MapPinned, Users } from "lucide-react";
import { PageHeader, SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/safety")({
  head: () => ({
    meta: [
      { title: "Safety & trust on ShareShelf" },
      {
        name: "description",
        content:
          "Pickup PINs, approximate locations, private in-app chat and moderated reports — how ShareShelf keeps local exchanges safe.",
      },
      { property: "og:title", content: "Safety & trust on ShareShelf" },
      {
        property: "og:description",
        content: "Practical tips and the protections built into every ShareShelf exchange.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SafetyPage,
});

const PROTECTIONS = [
  {
    Icon: MapPinned,
    title: "Approximate locations only",
    body: "Coordinates are rounded to about a one-kilometre grid before anyone sees them. Your street is never published.",
  },
  {
    Icon: EyeOff,
    title: "No contact details",
    body: "Emails are private and phone numbers are never collected. Everything happens in ShareShelf chat.",
  },
  {
    Icon: KeyRound,
    title: "One-time pickup PINs",
    body: "Only the approved borrower receives the PIN, and the owner verifies it at handover.",
  },
  {
    Icon: Flag,
    title: "Moderated reports",
    body: "Any listing or member can be reported privately. Moderators review every submission.",
  },
];

const TIPS = [
  "Meet in a busy, public spot — a café, campus square or building lobby.",
  "Inspect the item together before the PIN is verified.",
  "Agree the return date in chat so both of you have a written record.",
  "Never move the conversation to another app or send money in advance.",
  "Report anything that feels off; you stay anonymous to the reported member.",
];

function SafetyPage() {
  return (
    <SiteLayout>
      <PageHeader
        title="Safety & trust"
        description="What ShareShelf protects automatically, and what you can do at every handover."
        actions={
          <Button asChild variant="secondary">
            <Link to="/how-it-works">How it works</Link>
          </Button>
        }
      />
      <div className="grid gap-5 md:grid-cols-2">
        {PROTECTIONS.map(({ Icon, title, body }) => (
          <section key={title} className="rounded-2xl border bg-card p-6 shadow-soft">
            <span className="grid size-11 place-items-center rounded-xl border surface-gradient">
              <Icon className="size-5 text-primary" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </section>
        ))}
      </div>

      <section className="mt-10 rounded-2xl border bg-card p-6 shadow-soft">
        <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
          <Users className="size-5 text-primary" aria-hidden="true" /> Tips for a smooth handover
        </h2>
        <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
          {TIPS.map((tip) => (
            <li key={tip} className="flex gap-2">
              <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              {tip}
            </li>
          ))}
        </ul>
      </section>
    </SiteLayout>
  );
}
