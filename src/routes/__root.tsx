import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { FileQuestion, Home } from "lucide-react";

import Header from "../components/Header";
import { Sidebar } from "../components/layout/Sidebar";
import { ThemeProvider } from "../contexts/ThemeContext";
import { SettingsProvider } from "../contexts/SettingsContext";
import { SidebarProvider } from "../components/ui/sidebar";
import { SearchModal } from "../components/modals/SearchModal";

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
        name: "color-scheme",
        content: "dark light",
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Load Google scripts client-side only to avoid hydration mismatch
  useEffect(() => {
    const loadGoogleScripts = () => {
      // Load Google Sign-In
      if (!document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
        const gsiScript = document.createElement("script");
        gsiScript.src = "https://accounts.google.com/gsi/client";
        gsiScript.async = true;
        gsiScript.defer = true;
        document.head.appendChild(gsiScript);
      }

      // Load Google API
      if (!document.querySelector('script[src="https://apis.google.com/js/api.js"]')) {
        const gapiScript = document.createElement("script");
        gapiScript.src = "https://apis.google.com/js/api.js";
        gapiScript.async = true;
        gapiScript.defer = true;
        document.head.appendChild(gapiScript);
      }
    };

    loadGoogleScripts();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSearchOpen((prev: boolean) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme') || 'dark';
                  const root = document.documentElement;
                  
                  if (theme === 'system') {
                    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                    root.classList.add(systemTheme);
                  } else {
                    root.classList.add(theme);
                  }
                } catch (e) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
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
              <SearchModal 
                isOpen={isSearchOpen} 
                onClose={() => setIsSearchOpen(false)} 
              />
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
