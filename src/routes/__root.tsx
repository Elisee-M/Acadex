import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

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

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Acadex — Smarter School Accountability" },
      { name: "description", content: "Track materials, manage students, and eliminate delays." },
      { name: "author", content: "Acadex" },
      { property: "og:title", content: "Acadex — Smarter School Accountability" },
      { property: "og:description", content: "Track materials, manage students, and eliminate delays." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Acadex — Smarter School Accountability" },
      { name: "twitter:description", content: "Track materials, manage students, and eliminate delays." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/7HgeZJ8l4VQoXS6sonF2YcxPNx82/social-images/social-1777291606860-ChatGPT_Image_Apr_27__2026__04_32_40_AM-removebg-preview.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/7HgeZJ8l4VQoXS6sonF2YcxPNx82/social-images/social-1777291606860-ChatGPT_Image_Apr_27__2026__04_32_40_AM-removebg-preview.webp" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
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
  return <Outlet />;
}
