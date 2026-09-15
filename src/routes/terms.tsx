import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHeader } from "@/components/SiteLayout";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of use — ShareShelf" },
      {
        name: "description",
        content:
          "The community rules for renting, donating and reselling on ShareShelf: honest listings, safe handovers, and respectful conduct.",
      },
      { property: "og:title", content: "Terms of use — ShareShelf" },
      { property: "og:description", content: "Community rules for safe, honest local exchanges on ShareShelf." },
    ],
  }),
  component: TermsPage,
});

const SECTIONS = [
  {
    h: "Listing honestly",
    p: "Describe items accurately, including condition and any faults. Only list things you own and are allowed to rent, donate or sell. Illegal, unsafe, counterfeit and recalled items are not permitted.",
  },
  {
    h: "Rentals and returns",
    p: "Agree the rental window before handover. Borrowers are responsible for returning items in the agreed condition by the due date. Owners confirm the return in the app so both sides have a record.",
  },
  {
    h: "Payments",
    p: "ShareShelf does not process payments. Any money changes hands directly between members. Prices in listings are indicative and set by the owner.",
  },
  {
    h: "Safe handovers",
    p: "Meet in a public place where possible, verify the one-time pickup PIN, and never share personal contact details you are not comfortable revealing.",
  },
  {
    h: "Conduct and moderation",
    p: "Harassment, spam and discriminatory behaviour are not tolerated. Moderators may remove listings and suspend accounts that break these rules or accumulate valid reports.",
  },
  {
    h: "Liability",
    p: "ShareShelf connects neighbours; it is not a party to any exchange. Members are responsible for their own items, agreements and safety.",
  },
];

function TermsPage() {
  return (
    <SiteLayout>
      <PageHeader
        title="Terms of use"
        description="Simple rules that keep ShareShelf useful and safe for every local community using it."
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
