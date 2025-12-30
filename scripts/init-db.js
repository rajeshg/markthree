#!/usr/bin/env node

/**
 * Database initialization script for MarkThree
 * 
 * This script creates Better Auth tables before the server starts.
 * Better Auth does NOT create tables automatically, so we need to create them manually.
 * 
 * The schema is stable and matches Better Auth's expected structure:
 * - user: User accounts
 * - session: Active sessions
 * - account: OAuth provider accounts (Google Drive)
 * - verification: Email/token verification
 * 
 * All CREATE TABLE statements use "IF NOT EXISTS" making this script idempotent.
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get database path from environment or use default
const dbPath = process.env.DB_PATH || './sqlite.db';
const dbDir = dirname(resolve(dbPath));

console.log('[DB Init] Starting database initialization...');
console.log(`[DB Init] Database path: ${dbPath}`);
console.log(`[DB Init] Database directory: ${dbDir}`);

// Ensure database directory exists
if (!existsSync(dbDir)) {
  console.log(`[DB Init] Creating database directory: ${dbDir}`);
  mkdirSync(dbDir, { recursive: true });
}

// Initialize database with Better Auth schema
try {
  const db = new Database(dbPath);
  
  console.log('[DB Init] Creating Better Auth tables (if they don\'t exist)...');
  
  // Create user table
  db.exec(`
    CREATE TABLE IF NOT EXISTS "user" (
      "id" text not null primary key,
      "name" text not null,
      "email" text not null unique,
      "emailVerified" integer not null,
      "image" text,
      "createdAt" date not null,
      "updatedAt" date not null
    );
  `);
  
  // Create session table
  db.exec(`
    CREATE TABLE IF NOT EXISTS "session" (
      "id" text not null primary key,
      "expiresAt" date not null,
      "token" text not null unique,
      "createdAt" date not null,
      "updatedAt" date not null,
      "ipAddress" text,
      "userAgent" text,
      "userId" text not null references "user" ("id") on delete cascade
    );
  `);
  
  // Create session index
  db.exec(`
    CREATE INDEX IF NOT EXISTS "session_userId_idx" on "session" ("userId");
  `);
  
  // Create account table
  db.exec(`
    CREATE TABLE IF NOT EXISTS "account" (
      "id" text not null primary key,
      "accountId" text not null,
      "providerId" text not null,
      "userId" text not null references "user" ("id") on delete cascade,
      "accessToken" text,
      "refreshToken" text,
      "idToken" text,
      "accessTokenExpiresAt" date,
      "refreshTokenExpiresAt" date,
      "scope" text,
      "password" text,
      "createdAt" date not null,
      "updatedAt" date not null
    );
  `);
  
  // Create account index
  db.exec(`
    CREATE INDEX IF NOT EXISTS "account_userId_idx" on "account" ("userId");
  `);
  
  // Create verification table
  db.exec(`
    CREATE TABLE IF NOT EXISTS "verification" (
      "id" text not null primary key,
      "identifier" text not null,
      "value" text not null,
      "expiresAt" date not null,
      "createdAt" date not null,
      "updatedAt" date not null
    );
  `);
  
  // Create verification index
  db.exec(`
    CREATE INDEX IF NOT EXISTS "verification_identifier_idx" on "verification" ("identifier");
  `);
  
  // Verify tables were created
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('[DB Init] Tables in database:', tables.map(t => t.name).join(', '));
  
  db.close();
  
  console.log('[DB Init] ✅ Database initialization complete!');
  process.exit(0);
  
} catch (error) {
  console.error('[DB Init] ❌ Database initialization failed:', error);
  process.exit(1);
}
