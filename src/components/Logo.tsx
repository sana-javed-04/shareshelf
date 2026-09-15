import { cn } from "@/lib/utils";

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        className="relative grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-soft"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 7h18" strokeLinecap="round" />
          <path d="M5 7v12h14V7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 12h6" strokeLinecap="round" />
          <path d="M12 3l4 4H8l4-4z" strokeLinejoin="round" />
        </svg>
      </span>
      {showText && (
        <span className="font-display text-lg font-bold tracking-tight">
          Share<span className="text-primary">Shelf</span>
        </span>
      )}
    </span>
  );
}
