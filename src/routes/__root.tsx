import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { FileQuestion, Home } from "lucide-react";

import Header from "../components/Header";
import { Sidebar } from "../components/layout/Sidebar";
import { ThemeProvider } from "../contexts/ThemeContext";
import { SettingsProvider } from "../contexts/SettingsContext";
import { SidebarProvider } from "../components/ui/sidebar";

import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";

import appCss from "../styles.css?url";

import type { QueryClient } from "@tanstack/react-query";

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "MarkThree v2",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/logo.svg",
      },
    ],
    scripts: [
      {
        src: "https://accounts.google.com/gsi/client",
        async: true,
        defer: true,
      },
      {
        src: "https://apis.google.com/js/api.js",
        async: true,
        defer: true,
      },
    ],
  }),

  shellComponent: RootDocument,
  notFoundComponent: NotFound,
});

function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background">
      <div className="max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mx-auto w-24 h-24 bg-github-blue/10 rounded-full flex items-center justify-center">
          <FileQuestion size={48} className="text-github-blue" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">404 - Not Found</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-github-blue hover:bg-github-blue/80 text-white rounded-lg font-bold transition-all shadow-lg shadow-github-blue/20 hover:scale-105 active:scale-95"
        >
          <Home size={18} />
          Back Home
        </Link>
      </div>
    </div>
  );
}

function RootDocument() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          <SettingsProvider>
            <SidebarProvider defaultOpen>
              <Sidebar />
              <main className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <div className="flex-1 flex flex-col overflow-hidden">
                  <Outlet />
                </div>
              </main>
            </SidebarProvider>
            <TanStackDevtools
              config={{
                position: "bottom-right",
              }}
              plugins={[
                {
                  name: "Tanstack Router",
                  render: <TanStackRouterDevtoolsPanel />,
                },
                TanStackQueryDevtools,
              ]}
            />
            <Scripts />
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
