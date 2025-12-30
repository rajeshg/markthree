import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth/auth-client";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { useEffect } from "react";

function LoadingComponent() {
  return (
    <div className="flex-1 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
        <Loader2 className="w-8 h-8 animate-spin text-github-blue" />
        <span className="text-xs text-muted-foreground font-mono uppercase tracking-widest">
          Checking session...
        </span>
      </div>
    </div>
  );
}

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/")({
  validateSearch: searchSchema,
  beforeLoad: async ({ search }) => {
    const { data: session } = await authClient.getSession();
    
    if (session) {
      // If there's a redirect parameter, we'll handle it in the component
      // to avoid SSR/client mismatch issues
      if (search.redirect) {
        return; // Let the component handle the redirect
      }
      
      // Check if user has completed setup
      const settings = typeof window !== "undefined" 
        ? localStorage.getItem("app-settings") 
        : null;
      
      if (settings) {
        try {
          const parsed = JSON.parse(settings);
          if (parsed.driveFolderId) {
            throw redirect({ to: "/editor" });
          }
        } catch (err) {
          if (err instanceof Response) throw err;
          // If parsing failed, continue to setup
        }
      }
      
      // User is authenticated but hasn't set up Drive folder
      throw redirect({ to: "/setup" });
    }
  },
  pendingComponent: LoadingComponent,
  component: HomeComponent,
});

function HomeComponent() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  // Handle redirect parameter on the client side
  useEffect(() => {
    if (search.redirect) {
      // Parse the redirect URL
      const redirectUrl = search.redirect;
      const [path, searchString] = redirectUrl.split('?');
      
      if (searchString) {
        // Parse search params
        const params = new URLSearchParams(searchString);
        const searchObj: any = {};
        params.forEach((value, key) => {
          searchObj[key] = value;
        });
        
        navigate({ 
          to: path as any,
          search: searchObj,
          replace: true,
        });
      } else {
        navigate({ 
          to: path as any,
          replace: true,
        });
      }
    }
  }, [search.redirect, navigate]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6 bg-background">
      <h1 className="text-5xl font-bold tracking-tighter text-github-blue">
        MarkThree <span className="text-github-fg/50">v2</span>
      </h1>
      <p className="max-w-[600px] text-muted-foreground text-lg">
        A minimalist markdown editor that syncs directly to your Google Drive.
        GitHub aesthetic, terminal speed, your data.
      </p>

      <div className="pt-8">
        <p className="text-sm text-muted-foreground mb-4">
          Sign in to get started
        </p>
        <button
          onClick={() => authClient.signIn.social({ provider: "google" })}
          className="px-8 py-3 bg-github-blue hover:bg-github-blue/90 text-white rounded-lg font-bold text-lg transition-all transform hover:scale-105 shadow-lg"
        >
          Connect Google Drive
        </button>
      </div>
    </div>
  );
}
