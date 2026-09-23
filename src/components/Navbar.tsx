import { useState, useEffect } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { AdminStats, DashboardStats, Report } from "@/lib/types";
import {
  AlertTriangle,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  Repeat,
  Shield,
  User as UserIcon,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api/client";
import { adminService } from "@/services/adminService";

const PUBLIC_LINKS = [
  { to: "/browse", label: "Browse items" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/safety", label: "Safety" },
] as const;

export function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Close mobile drawer when route changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // User notifications
  const { data: stats } = useQuery({
    queryKey: ["user", "stats"],
    queryFn: () => api.get<DashboardStats>("/users/me/stats"),
    enabled: Boolean(user),
    refetchInterval: 10000,
  });

  // Admin stats
  const { data: adminStats } = useQuery<AdminStats>({
    queryKey: ["admin", "stats"],
    queryFn: adminService.stats,
    enabled: Boolean(isAdmin),
    refetchInterval: 15000,
  });

  // Admin reports to track latest report creation timestamp
  const { data: adminReports } = useQuery<Report[]>({
    queryKey: ["admin", "reports"],
    queryFn: adminService.reports,
    enabled: Boolean(isAdmin),
    refetchInterval: 15000,
  });

  // Unread logic
  const [hasUnseenAdminReports, setHasUnseenAdminReports] = useState(false);

  useEffect(() => {
    if (!isAdmin || !adminReports) {
      setHasUnseenAdminReports(false);
      return;
    }

    const pendingList = adminReports.filter((r) => r.status === "Pending");
    if (pendingList.length === 0) {
      setHasUnseenAdminReports(false);
      return;
    }

    const lastSeenTime = Number(localStorage.getItem("admin_reports_last_seen") || "0");
    const latestPendingTime = Math.max(...pendingList.map((r) => new Date(r.created_at).getTime()));

    setHasUnseenAdminReports(latestPendingTime > lastSeenTime);
  }, [isAdmin, adminReports, pathname]);

  useEffect(() => {
    if (pathname === "/admin" && isAdmin) {
      localStorage.setItem("admin_reports_last_seen", String(Date.now()));
      setHasUnseenAdminReports(false);
    }
  }, [pathname, isAdmin]);

  const pendingRequests = stats?.pending_requests ?? 0;
  const unreadMessages = stats?.unread_messages ?? 0;
  const pendingReportsCount = adminStats?.pending_reports ?? 0;
  const totalUserAlerts = pendingRequests + unreadMessages;

  async function handleLogout() {
    await logout();
    setOpen(false);
    void navigate({ to: "/", replace: true });
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur-lg">
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6"
      >
        <Link to="/" aria-label="ShareShelf home" className="shrink-0">
          <Logo />
        </Link>

        {/* Desktop Navigation */}
        <ul className="ml-4 hidden items-center gap-1 md:flex">
          {PUBLIC_LINKS.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                  pathname === link.to && "text-foreground",
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right side controls */}
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />

          {user ? (
            <>
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link to="/post-item">
                  <Plus className="mr-1.5 size-4" aria-hidden="true" />
                  Post an item
                </Link>
              </Button>

              {/* Desktop User Avatar Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="relative rounded-full font-bold text-xs"
                    aria-label="Account menu"
                  >
                    <span>{user.username.slice(0, 2).toUpperCase()}</span>

                    {(hasUnseenAdminReports || totalUserAlerts > 0) && (
                      <span className="absolute -top-0.5 -right-0.5 flex size-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                        <span className="relative inline-flex size-2.5 rounded-full bg-red-600 ring-2 ring-background" />
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate">Hi, {user.username}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard">
                      <LayoutDashboard className="mr-2 size-4" /> Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/my-listings">My listings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/transactions" className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Repeat className="mr-2 size-4" /> Transactions
                      </div>
                      {pendingRequests > 0 && (
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
                          {pendingRequests} new
                        </span>
                      )}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/my-reports" className="flex items-center gap-2">
                      <AlertTriangle className="size-4 text-amber-500" />
                      <span>Disputes & Reports</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/chat" className="flex items-center justify-between">
                      <div className="flex items-center">
                        <MessageSquare className="mr-2 size-4" /> Messages
                      </div>
                      {unreadMessages > 0 && (
                        <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-xs font-semibold text-destructive">
                          {unreadMessages}
                        </span>
                      )}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile">
                      <UserIcon className="mr-2 size-4" /> Profile
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Shield className="mr-2 size-4 text-primary" /> Admin panel
                          </div>
                          {pendingReportsCount > 0 && (
                            <span
                              className={cn(
                                "rounded-full px-1.5 py-0.5 text-xs font-bold",
                                hasUnseenAdminReports
                                  ? "bg-destructive text-destructive-foreground animate-pulse"
                                  : "bg-muted text-muted-foreground",
                              )}
                            >
                              {pendingReportsCount} open
                            </span>
                          )}
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={handleLogout}>
                    <LogOut className="mr-2 size-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/register">Join ShareShelf</Link>
              </Button>
            </div>
          )}

          {/* Mobile Hamburger Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {open && (
        <div className="border-b bg-background/95 px-4 pb-5 pt-2 backdrop-blur-lg md:hidden">
          <ul className="flex flex-col space-y-1">
            {PUBLIC_LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block rounded-lg px-3 py-2 text-base font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                    pathname === link.to && "bg-secondary text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t pt-4">
            {user ? (
              <div className="flex flex-col space-y-2">
                <div className="px-3 py-1 text-sm font-semibold text-foreground">
                  Signed in as <span className="text-primary">{user.username}</span>
                </div>
                <Button asChild className="w-full justify-start" size="sm">
                  <Link to="/post-item" onClick={() => setOpen(false)}>
                    <Plus className="mr-2 size-4" /> Post an item
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start" size="sm">
                  <Link to="/dashboard" onClick={() => setOpen(false)}>
                    <LayoutDashboard className="mr-2 size-4" /> Dashboard
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start" size="sm">
                  <Link
                    to="/transactions"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between"
                  >
                    <span className="flex items-center">
                      <Repeat className="mr-2 size-4" /> Transactions
                    </span>
                    {pendingRequests > 0 && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {pendingRequests} new
                      </span>
                    )}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start" size="sm">
                  <Link
                    to="/chat"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between"
                  >
                    <span className="flex items-center">
                      <MessageSquare className="mr-2 size-4" /> Messages
                    </span>
                    {unreadMessages > 0 && (
                      <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                        {unreadMessages}
                      </span>
                    )}
                  </Link>
                </Button>
                {isAdmin && (
                  <Button asChild variant="outline" className="w-full justify-start" size="sm">
                    <Link to="/admin" onClick={() => setOpen(false)}>
                      <Shield className="mr-2 size-4 text-primary" /> Admin Panel
                    </Link>
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full justify-start"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 size-4" /> Sign out
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/login" onClick={() => setOpen(false)}>
                    Sign in
                  </Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/register" onClick={() => setOpen(false)}>
                    Join ShareShelf
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
