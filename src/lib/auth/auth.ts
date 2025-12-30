import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import Database from "better-sqlite3";

// Use DB_PATH from environment or default to ./sqlite.db for development
const dbPath = process.env.DB_PATH || "./sqlite.db";

export const auth = betterAuth({
  database: new Database(dbPath),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      scope: ["https://www.googleapis.com/auth/drive.file", "email", "profile"],
    },
  },
  plugins: [tanstackStartCookies()],
});
