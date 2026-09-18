// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import {
//   Outlet,
//   Link,
//   createRootRouteWithContext,
//   useRouter,
//   HeadContent,
//   Scripts,
// } from "@tanstack/react-router";
// import { useEffect, type ReactNode } from "react";

// import appCss from "../styles.css?url";
// import { reportLovableError } from "../lib/lovable-error-reporting";
// import { AuthProvider } from "@/context/AuthContext";
// import { ThemeProvider, themeBootstrapScript } from "@/context/ThemeContext";
// import { Toaster } from "@/components/ui/sonner";

// function NotFoundComponent() {
//   return (
//     <div className="flex min-h-screen items-center justify-center bg-background px-4">
//       <div className="max-w-md text-center">
//         <h1 className="font-display text-7xl font-bold text-foreground">404</h1>
//         <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
//         <p className="mt-2 text-sm text-muted-foreground">
//           This shelf is empty — the page you're looking for doesn't exist or has been moved.
//         </p>
//         <div className="mt-6 flex justify-center gap-2">
//           <Link
//             to="/"
//             className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
//           >
//             Go home
//           </Link>
//           <Link
//             to="/browse"
//             className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
//           >
//             Browse items
//           </Link>
//         </div>
//       </div>
//     </div>
//   );
// }

// function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
//   console.error(error);
//   const router = useRouter();
//   useEffect(() => {
//     reportLovableError(error, { boundary: "tanstack_root_error_component" });
//   }, [error]);

//   return (
//     <div className="flex min-h-screen items-center justify-center bg-background px-4">
//       <div className="max-w-md text-center">
//         <h1 className="text-xl font-semibold tracking-tight text-foreground">
//           This page didn't load
//         </h1>
//         <p className="mt-2 text-sm text-muted-foreground">
//           Something went wrong on our end. You can try refreshing or head back home.
//         </p>
//         <div className="mt-6 flex flex-wrap justify-center gap-2">
//           <button
//             onClick={() => {
//               router.invalidate();
//               reset();
//             }}
//             className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
//           >
//             Try again
//           </button>
//           <a
//             href="/"
//             className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
//           >
//             Go home
//           </a>
//         </div>
//       </div>
//     </div>
//   );
// }

// export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
//   head: () => ({
//     meta: [
//       { charSet: "utf-8" },
//       { name: "viewport", content: "width=device-width, initial-scale=1" },
//       { title: "ShareShelf — Rent, donate and resell locally" },
//       {
//         name: "description",
//         content:
//           "ShareShelf is a privacy-first hyper-local marketplace to rent, donate and resell items with neighbours — no phone numbers, approximate locations only.",
//       },
//       { name: "author", content: "ShareShelf" },
//       { property: "og:type", content: "website" },
//       { name: "twitter:card", content: "summary_large_image" },
//       { name: "theme-color", content: "#1f5c46" },
//     ],
//     links: [
//       { rel: "stylesheet", href: appCss },
//       { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
//       { rel: "preconnect", href: "https://fonts.googleapis.com" },
//       { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
//       {
//         rel: "stylesheet",
//         href: "https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Manrope:wght@400;500;600;700&display=swap",
//       },
//     ],
//     scripts: [{ children: themeBootstrapScript }],
//   }),
//   shellComponent: RootShell,
//   component: RootComponent,
//   notFoundComponent: NotFoundComponent,
//   errorComponent: ErrorComponent,
// });

// function RootShell({ children }: { children: ReactNode }) {
//   return (
//     <html lang="en" suppressHydrationWarning>
//       <head>
//         <HeadContent />
//       </head>
//       <body>
//         {children}
//         <Scripts />
//       </body>
//     </html>
//   );
// }

// function RootComponent() {
//   const { queryClient } = Route.useRouteContext();

//   return (
//     <QueryClientProvider client={queryClient}>
//       <ThemeProvider>
//         <AuthProvider>
//           {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
//           <Outlet />
//           <Toaster position="top-right" richColors closeButton />
//         </AuthProvider>
//       </ThemeProvider>
//     </QueryClientProvider>
//   );
// }

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode } from "react";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider, themeBootstrapScript } from "@/context/ThemeContext";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This shelf is empty — the page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
          <Link
            to="/browse"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            Browse items
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error("Application Error:", error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

// Inline ShareShelf SVG Icon (Browser Tab Favicon)
const brandFaviconSvg = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%231f5c46%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22m7.5 4.27 9 5.15%22/><path d=%22M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z%22/><path d=%22m3.3 7 8.7 5 8.7-5%22/><path d=%22M12 22V12%22/></svg>`;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ShareShelf — Rent, Donate & Buy Locally" },
      {
        name: "description",
        content:
          "ShareShelf is a privacy-first hyper-local community platform to rent, donate, and resell items with neighbours without exposing contact details.",
      },
      { name: "author", content: "ShareShelf" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "ShareShelf — Hyper-local Community Sharing" },
      {
        property: "og:description",
        content: "Borrow, donate, and buy second-hand items safely in your neighbourhood.",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#1f5c46" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Manrope:wght@400;500;600;700&display=swap",
      },
    ],
    scripts: [{ children: themeBootstrapScript }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Outlet />
          <Toaster position="top-right" richColors closeButton />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
