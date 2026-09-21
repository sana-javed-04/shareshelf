import { useState, useMemo } from "react";
import { Star, ShieldAlert, Filter } from "lucide-react";
import { Link } from "@tanstack/react-router";

export interface ReviewItem {
  id: number;
  item_id: number;
  reviewer_id: number;
  reviewer?: {
    id: number;
    username: string;
  };
  rating: number;
  comment: string;
  created_at: string;
}

export function ReviewsList({
  reviews = [],
  targetName = "member",
}: {
  reviews: ReviewItem[];
  targetName?: string;
}) {
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "highest" | "lowest">("newest");

  // Summary statistics
  const stats = useMemo(() => {
    if (!reviews.length) return { avg: 0, count: 0, count1Star: 0 };
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const count1 = reviews.filter((r) => r.rating === 1).length;
    return {
      avg: (sum / reviews.length).toFixed(1),
      count: reviews.length,
      count1Star: count1,
    };
  }, [reviews]);

  // Filter and Sort logic
  const filteredReviews = useMemo(() => {
    let list = [...reviews];

    if (ratingFilter === "warning") {
      list = list.filter((r) => r.rating === 1);
    } else if (ratingFilter !== "all") {
      list = list.filter((r) => r.rating === Number(ratingFilter));
    }

    if (sortBy === "newest") {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === "highest") {
      list.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === "lowest") {
      list.sort((a, b) => a.rating - b.rating);
    }

    return list;
  }, [reviews, ratingFilter, sortBy]);

  if (!reviews.length) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-muted-foreground text-sm">
        No reviews yet for {targetName}. Ratings will appear here once exchanges are completed.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Filter & Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex items-center text-amber-500 font-bold text-lg">
            <Star className="size-5 fill-amber-500 mr-1" />
            {stats.avg}
          </div>
          <span className="text-sm text-muted-foreground">({stats.count} verified reviews)</span>
          {stats.count1Star > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
              <ShieldAlert className="size-3" />
              {stats.count1Star} warning{stats.count1Star > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Filter className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Filter:</span>
          </div>

          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="h-8 rounded-lg border bg-background px-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All ratings</option>
            <option value="warning">1-Star Warnings only</option>
            <option value="5">5 Stars only</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "newest" | "highest" | "lowest")}
            className="h-8 rounded-lg border bg-background px-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="newest">Most Recent</option>
            <option value="highest">Highest Rated</option>
            <option value="lowest">Lowest Rated</option>
          </select>
        </div>
      </div>

      {/* Reviews Cards List */}
      {filteredReviews.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No reviews match your selected filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReviews.map((rev) => {
            const isWarning = rev.rating === 1;
            return (
              <div
                key={rev.id}
                className={`rounded-xl border p-4 transition ${
                  isWarning ? "border-destructive/30 bg-destructive/5" : "bg-card hover:bg-muted/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={idx}
                          className={`size-3.5 ${
                            idx < rev.rating
                              ? isWarning
                                ? "text-destructive fill-destructive"
                                : "text-amber-500 fill-amber-500"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                      {isWarning && (
                        <span className="ml-1 text-xs font-bold text-destructive">
                          Dispute / Warning
                        </span>
                      )}
                    </div>

                    <p className="text-sm leading-relaxed text-foreground/90 font-normal">
                      "{rev.comment}"
                    </p>
                  </div>

                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {new Date(rev.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="mt-2 text-xs text-muted-foreground">
                  by{" "}
                  {rev.reviewer ? (
                    <Link
                      to="/users/$id"
                      params={{ id: String(rev.reviewer.id) }}
                      className="font-medium text-foreground underline hover:text-primary"
                    >
                      {rev.reviewer.username}
                    </Link>
                  ) : (
                    "Verified Neighbour"
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
