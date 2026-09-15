import { Link } from "@tanstack/react-router";
import { Leaf, Lock, MapPin } from "lucide-react";
import { Logo } from "@/components/Logo";

export function Footer() {
  return (
    <footer className="mt-24 border-t bg-sidebar/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            ShareShelf is a hyper-local shelf your neighbourhood shares. Rent what you need for a weekend,
            donate what you have outgrown, and sell what deserves a second life — without ever handing over
            your phone number.
          </p>
          <ul className="mt-5 flex flex-wrap gap-4 text-xs font-medium text-muted-foreground">
            <li className="inline-flex items-center gap-1.5">
              <Lock className="size-3.5" aria-hidden="true" /> No phone numbers
            </li>
            <li className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5" aria-hidden="true" /> Approximate locations only
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Leaf className="size-3.5" aria-hidden="true" /> Circular by design
            </li>
          </ul>
        </div>
        <nav aria-label="Explore">
          <h2 className="text-sm font-semibold">Explore</h2>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            <li>
              <Link to="/browse" className="hover:text-foreground">
                Browse items
              </Link>
            </li>
            <li>
              <Link to="/post-item" className="hover:text-foreground">
                Post an item
              </Link>
            </li>
            <li>
              <Link to="/dashboard" className="hover:text-foreground">
                Dashboard
              </Link>
            </li>
            <li>
              <Link to="/how-it-works" className="hover:text-foreground">
                How it works
              </Link>
            </li>
            <li>
              <Link to="/register" className="hover:text-foreground">
                Create an account
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Legal">
          <h2 className="text-sm font-semibold">Trust &amp; legal</h2>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            <li>
              <Link to="/safety" className="hover:text-foreground">
                Safety &amp; trust
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="hover:text-foreground">
                Privacy policy
              </Link>
            </li>
            <li>
              <Link to="/terms" className="hover:text-foreground">
                Terms of use
              </Link>
            </li>
            <li>
              <Link to="/login" className="hover:text-foreground">
                Sign in
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t px-4 py-6 text-center text-xs text-muted-foreground sm:px-6">
        © {new Date().getFullYear()} ShareShelf. Built for local communities, campuses and towns.
      </div>
    </footer>
  );
}
