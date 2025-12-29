import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import Database from "better-sqlite3";

export const auth = betterAuth({
    database: new Database("./sqlite.db"),
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        },
    },
    plugins: [tanstackStartCookies()]
})
