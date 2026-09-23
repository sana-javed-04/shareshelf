import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  ArrowRight,
  HandHeart,
  Lock,
  MapPin,
  MessageSquare,
  Recycle,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { ItemCard } from "@/components/ItemCard";
import { ItemGridSkeleton } from "@/components/LoadingSkeleton";
import { itemService } from "@/services/itemService";
import { EmptyState } from "@/components/EmptyState";
import { formatCurrency, formatDistance } from "@/lib/utils/formatters";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ShareShelf — Rent, donate and resell with your neighbours" },
      {
        name: "description",
        content:
          "Borrow a drill for the weekend, donate the books you've outgrown, resell what you no longer need. Hyper-local, privacy-first, no phone numbers shared.",
      },
      { property: "og:title", content: "ShareShelf — Your neighbourhood's shared shelf" },
      {
        property: "og:description",
        content:
          "A privacy-first hyper-local marketplace for renting, donating and reselling items within your community.",
      },
    ],
  }),
  component: Home,
});

const STEPS = [
  {
    icon: Tag,
    title: "List it in a minute",
    body: "Add a photo, pick rent, donate or sell, and drop a pin on your approximate area — never your exact address.",
  },
  {
    icon: MessageSquare,
    title: "Chat inside ShareShelf",
    body: "Neighbours message you through in-app chat. No phone numbers, no emails, no social handles required.",
  },
  {
    icon: ShieldCheck,
    title: "Hand over with a PIN",
    body: "Approve a request and a one-time pickup PIN is generated. Verify it at handover so every exchange is confirmed.",
  },
  {
    icon: Recycle,
    title: "Return and close the loop",
    body: "Mark returns complete, build your transaction history, and keep good items circulating locally.",
  },
];

const VALUES = [
  {
    icon: Lock,
    title: "Privacy by default",
    body: "Contact details are never exposed. Chat stays in-app.",
  },
  {
    icon: MapPin,
    title: "Approximate locations",
    body: "Coordinates are coarsened before anyone sees them.",
  },
  {
    icon: HandHeart,
    title: "Community-first",
    body: "Donations sit beside rentals — generosity is the default.",
  },
];

function formatListingSubtitle(item: {
  listing_type: string;
  price?: number | null;
  pricing_unit?: string | null;
}) {
  const priceText = item.price != null ? formatCurrency(item.price) : "Free";
  if (item.listing_type === "Donate") return "Donation · Free";
  if (item.listing_type === "Rent") {
    return `For rent · ${priceText}/${item.pricing_unit ?? "day"}`;
  }
  return `For sale · ${priceText}`;
}

function Home() {
  const { data, isLoading } = useQuery({
    queryKey: ["items", "featured"],
    queryFn: () => itemService.list({ page_size: 6, sort: "newest" }),
  });

  const heroItems = data?.results?.slice(0, 4) ?? [];

  return (
    <SiteLayout className="w-full max-w-full overflow-x-hidden p-0">
      {/* Hero Section */}
      <section className="relative w-full overflow-hidden px-4 pb-12 pt-6 sm:px-6 sm:pb-20 sm:pt-16">
        <div className="hero-glow pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center gap-8 lg:grid lg:grid-cols-[1.1fr_0.9fr]">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-full min-w-0"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-card/70 px-3 py-1 text-xs font-semibold text-muted-foreground backdrop-blur">
              <Lock className="size-3.5 text-primary shrink-0" aria-hidden="true" />
              <span>Privacy-preserving · Hyper-local</span>
            </span>

            <h1 className="mt-4 font-display text-2xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl wrap-break-words">
              Your neighbourhood already owns{" "}
              <span className="text-primary block sm:inline">everything you need.</span>
            </h1>

            <p className="mt-4 w-full max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-lg wrap-break-words">
              ShareShelf lets people in the same street, campus or town rent, donate and resell
              things to each other — without ever handing over a phone number or an exact address.
            </p>

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <Button asChild size="default" className="w-full sm:w-auto">
                <Link to="/browse">
                  Browse nearby items
                  <ArrowRight className="ml-1.5 size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="default" variant="secondary" className="w-full sm:w-auto">
                <Link to="/post-item">Post something</Link>
              </Button>
            </div>

            <dl className="mt-8 grid grid-cols-3 gap-2 border-t pt-6 sm:gap-6 sm:border-0 sm:pt-0">
              {[
                { k: "3 ways", v: "Rent · Donate · Sell" },
                { k: "0", v: "Phone numbers" },
                { k: "1 km", v: "Precision" },
              ].map((s) => (
                <div key={s.k} className="min-w-0">
                  <dt className="font-display text-base font-bold text-primary sm:text-2xl truncate">
                    {s.k}
                  </dt>
                  <dd className="text-[11px] text-muted-foreground sm:text-xs truncate">{s.v}</dd>
                </div>
              ))}
            </dl>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-full min-w-0"
          >
            <div className="surface-gradient w-full rounded-2xl border p-4 shadow-soft sm:rounded-3xl sm:p-6">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-xs">
                  On the shelf near you
                </p>
                <Link to="/browse" className="text-xs font-medium text-primary hover:underline">
                  View all
                </Link>
              </div>

              <ul className="mt-3.5 space-y-2.5">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <li key={idx} className="h-14 animate-pulse rounded-xl border bg-card/50" />
                  ))
                ) : heroItems.length > 0 ? (
                  heroItems.map((item) => {
                    const rawArea = item.area_name ?? "";
                    const cleanArea = rawArea.split("||")[0].split("http")[0].trim() || "Nearby";

                    return (
                      <li key={item.id} className="min-w-0">
                        <a
                          href={`/items/${item.id}`}
                          className="group flex items-center justify-between gap-2.5 rounded-xl border bg-card/80 px-3 py-2.5 backdrop-blur transition-colors hover:border-primary/40 hover:bg-card"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-semibold text-foreground group-hover:text-primary transition-colors sm:text-sm">
                              {item.title}
                            </span>
                            <span className="block truncate text-[11px] text-muted-foreground mt-0.5">
                              {formatListingSubtitle(item)}
                            </span>
                          </div>

                          <div className="shrink-0 text-right">
                            <span className="inline-block max-w-24 truncate text-[11px] font-medium text-primary sm:max-w-32 sm:text-xs">
                              {item.distance_km != null
                                ? formatDistance(item.distance_km)
                                : cleanArea}
                            </span>
                          </div>
                        </a>
                      </li>
                    );
                  })
                ) : (
                  <li className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                    No active items yet. Be the first to list!
                  </li>
                )}
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-24 w-full px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-4xl">
            How ShareShelf works
          </h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Four steps from “I need this for a weekend” to a confirmed, privacy-safe handover.
          </p>
        </div>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 sm:mt-12 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <motion.li
              key={step.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
              className="card-lift rounded-2xl border bg-card p-5 sm:p-6"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary sm:size-11">
                <step.icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-sm font-semibold sm:text-base">
                {i + 1}. {step.title}
              </h3>
              <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">{step.body}</p>
            </motion.li>
          ))}
        </ol>
      </section>

      {/* Fresh on the shelf */}
      <section className="w-full px-4 py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Fresh on the shelf
            </h2>
            <p className="mt-1 text-xs text-muted-foreground sm:text-base">
              The newest listings from members around you.
            </p>
          </div>
          <Button asChild variant="secondary" size="sm" className="w-fit">
            <Link to="/browse">See all listings</Link>
          </Button>
        </div>
        <div className="mt-6 sm:mt-8">
          {isLoading ? (
            <ItemGridSkeleton count={6} />
          ) : data && data.results.length > 0 ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
              {data.results.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No listings yet"
              description="Be the first to put something on the shelf for your community."
              action={
                <Button asChild>
                  <Link to="/post-item">Post an item</Link>
                </Button>
              }
            />
          )}
        </div>
      </section>

      {/* Values */}
      <section className="w-full px-4 py-12 sm:py-16">
        <div className="surface-gradient grid gap-6 rounded-2xl border p-6 sm:rounded-3xl sm:p-12 lg:grid-cols-3">
          {VALUES.map((v) => (
            <div key={v.title}>
              <v.icon className="size-5 text-primary sm:size-6" aria-hidden="true" />
              <h3 className="mt-2.5 text-sm font-semibold sm:text-base">{v.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{v.body}</p>
            </div>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
