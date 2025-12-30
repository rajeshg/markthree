import { auth } from "@/lib/auth/auth";
import { createFileRoute } from "@tanstack/react-router";
import Database from "better-sqlite3";

// Use DB_PATH from environment or default to ./sqlite.db for development
const dbPath = process.env.DB_PATH || "./sqlite.db";

export const Route = createFileRoute("/api/drive/token")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const session = await auth.api.getSession({
            headers: request.headers,
          });

          if (!session) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          // Better-Auth API filters out accessToken. We'll fetch it directly from the DB.
          const db = new Database(dbPath);
          const account = db
            .prepare("SELECT accessToken FROM account WHERE userId = ? AND providerId = ?")
            .get(session.user.id, "google") as { accessToken: string } | undefined;
          db.close();

          if (!account?.accessToken) {
            return new Response(JSON.stringify({ error: "No access token found" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          return new Response(account.accessToken, {
            headers: { "Content-Type": "text/plain" },
          });
        } catch (err) {
          console.error("Token retrieval error:", err);
          return new Response(JSON.stringify({ error: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});

// Export the function for backward compatibility
export async function getDriveToken(): Promise<string | null> {
  try {
    const response = await fetch("/api/drive/token", {
      method: "GET",
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.log("[Auth] User not authenticated");
        return null;
      }
      console.error("Failed to get drive token:", response.status);
      return null;
    }

    const token = await response.text();
    return token || null;
  } catch (err) {
    console.error("Error getting drive token:", err);
    return null;
  }
}
