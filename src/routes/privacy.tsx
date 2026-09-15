import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/SiteLayout";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy policy — ShareShelf" },
      {
        name: "description",
        content:
          "How ShareShelf protects your identity: no phone numbers, coarsened locations, in-app chat only, and strict data minimisation.",
      },
      { property: "og:title", content: "Privacy policy — ShareShelf" },
      {
        property: "og:description",
        content: "Our privacy commitments: contact details stay hidden and locations are always approximate.",
      },
    ],
  }),
  component: PrivacyPage,
});

const SECTIONS = [
  {
    h: "What we collect",
    p: "A username, an email address for sign-in, an area label, and an approximate coordinate you choose yourself. Listings you publish and messages you send are stored so the marketplace works. We never ask for a phone number, a home address, or a payment card.",
  },
  {
    h: "How locations are handled",
    p: "Coordinates are rounded to roughly a one-kilometre grid before they are stored and again before they are shown to anyone else. Maps display the approximate neighbourhood of a listing, never a precise address. Distances shown to other members are derived from these coarsened points.",
  },
  {
    h: "Contact details are never exposed",
    p: "Other members can only reach you through ShareShelf's in-app chat, scoped to a specific listing. Your email is never displayed on your public profile, in listings, or in chat.",
  },
  {
    h: "Handover PINs",
    p: "When an owner approves a request, a one-time pickup PIN is generated and shown to the borrower once. Only a hash of the PIN is stored, and the owner verifies it at handover. PINs are invalidated as soon as they are used.",
  },
  {
    h: "Reports and moderation",
    p: "You can report a listing or a member at any time. Reports are visible only to moderators, and the reported member is never told who filed the report.",
  },
  {
    h: "Your controls",
    p: "You can edit your username, area and approximate location at any time, delete your own listings, and cancel pending requests. Deleting a listing removes it from public browse immediately.",
  },
];

function PrivacyPage() {
  return (
    <SiteLayout>
      <PageHeader
        title="Privacy policy"
        description="ShareShelf is designed so that neighbours can trade with each other without ever exchanging personal contact details."
      />
      <div className="max-w-3xl space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.h}>
            <h2 className="font-display text-xl font-semibold">{s.h}</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">{s.p}</p>
          </section>
        ))}
      </div>
    </SiteLayout>
  );
}
