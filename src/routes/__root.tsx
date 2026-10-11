import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { useIdleLogout } from "@/hooks/use-idle-logout";
import { RoleGate } from "@/components/auth/RoleGate";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
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

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "bilirim | işini bilirim, çözümü bilirim" },
      {
        name: "description",
        content:
          "Ön muhasebe, POS satış kasası, adisyon/masa yönetimi ve teknik servis modüllerine tek ekrandan erişin.",
      },
      { name: "author", content: "Lovable" },
      { name: "theme-color", content: "#0b1533" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Bilirim PDKS" },
      { property: "og:title", content: "Ana Yönetim Paneli — Bilirim ERP" },
      {
        property: "og:description",
        content:
          "Ön muhasebe, POS satış kasası, adisyon/masa yönetimi ve teknik servis modüllerine tek ekrandan erişin.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Ana Yönetim Paneli — Bilirim ERP" },
      {
        name: "twitter:description",
        content:
          "Ön muhasebe, POS satış kasası, adisyon/masa yönetimi ve teknik servis modüllerine tek ekrandan erişin.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8ab12acf-4602-4d9c-a953-9cb51ca26da7/id-preview-9211e18d--a23b7e4f-0d67-4efd-997c-4b9efe657da6.lovable.app-1785613753689.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8ab12acf-4602-4d9c-a953-9cb51ca26da7/id-preview-9211e18d--a23b7e4f-0d67-4efd-997c-4b9efe657da6.lovable.app-1785613753689.png",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/pdks-icon-192.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent as never,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
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
  useIdleLogout();

  return (
    <QueryClientProvider client={queryClient}>
      <RoleGate />
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Footer />
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-5 sm:flex-row">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Bilirim ERP. Tüm hakları saklıdır.
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <Link to="/kvkk" className="hover:text-foreground hover:underline">
            KVKK ve Gizlilik
          </Link>
          <Link to="/mesafeli-satis" className="hover:text-foreground hover:underline">
            Mesafeli Satış Sözleşmesi
          </Link>
          <Link to="/iptal-iade" className="hover:text-foreground hover:underline">
            İptal ve İade Koşulları
          </Link>
        </nav>
      </div>
    </footer>
  );
}
