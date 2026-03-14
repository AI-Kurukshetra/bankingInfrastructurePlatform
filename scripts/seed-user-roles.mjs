/**
 * Seed script for role-based user directory demo data.
 *
 * Requires the user_roles_rbac migration to be applied first.
 * Run: pnpm db:seed:user-roles
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const sep = line.indexOf("=");
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    const value = line.slice(sep + 1).trim().replace(/^['\"]|['\"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

const rootDir = process.cwd();
loadEnvFile(path.join(rootDir, ".env"));
loadEnvFile(path.join(rootDir, ".env.local"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in .env.local before running db:seed:user-roles."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const USERS = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Demo Consumer",
    email: "consumer@example.com",
    password_hash: "$2a$10$0JXhoPCBuluk3D6Q/u0N4OzQri5X2x1mJ3xiTkU7zyYUNgsR7mXbC",
    role: "consumer",
    phone: "+14155550101",
    status: "active",
    created_at: "2026-03-14T09:00:00Z"
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Demo Business Owner",
    email: "business@example.com",
    password_hash: "$2a$10$7m6P0YJdwow6V6l9SUki8ekKf5DFH4Qe9k6c2d9YfD5b0I0lW8R9i",
    role: "business",
    phone: "+14155550102",
    status: "active",
    created_at: "2026-03-14T09:05:00Z"
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Compliance Officer",
    email: "compliance@example.com",
    password_hash: "$2a$10$3cD1S2Sp3Fq7J7n4uQdI4OX1P0I8oM7fR1M2MikP5X0pYhFruQ3eW",
    role: "compliance_analyst",
    phone: "+14155550103",
    status: "active",
    created_at: "2026-03-14T09:10:00Z"
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    name: "Platform Admin",
    email: "admin@example.com",
    password_hash: "$2a$10$E6uN2M8dT0X3N3hLuTg9Yurqk3mEitf0wY7F4E0RzYfD0aD9p1P2S",
    role: "admin",
    phone: "+14155550104",
    status: "active",
    created_at: "2026-03-14T09:15:00Z"
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    name: "API Developer",
    email: "developer@example.com",
    password_hash: "$2a$10$N8N59t5K4zKLoRRq6j5b0ef5P9Y1NQy1E4YcW2i4WJ2u0E6w2nK7K",
    role: "developer_partner",
    phone: "+14155550105",
    status: "active",
    created_at: "2026-03-14T09:20:00Z"
  }
];

const CONSUMER_PROFILES = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    user_id: "11111111-1111-4111-8111-111111111111",
    date_of_birth: "1992-04-18",
    address: "245 Market Street, San Francisco, CA 94105",
    kyc_status: "approved",
    created_at: "2026-03-14T10:00:00Z"
  }
];

const BUSINESS_PROFILES = [
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    user_id: "22222222-2222-4222-8222-222222222222",
    company_name: "Demo Business LLC",
    business_type: "fintech_services",
    registration_number: "REG-2026-0001",
    kyb_status: "pending",
    created_at: "2026-03-14T10:05:00Z"
  }
];

const DEVELOPER_PROFILES = [
  {
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    user_id: "55555555-5555-4555-8555-555555555555",
    organization_name: "API Developer Labs",
    api_key: "dev_partner_demo_key_2026",
    sandbox_enabled: true,
    created_at: "2026-03-14T10:10:00Z"
  }
];

async function must(label, promise) {
  const { error } = await promise;
  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }
  console.log(`  ok ${label}`);
}

async function run() {
  console.log("\nSeeding role-based user directory\n");

  await must(
    "users",
    supabase.from("users").upsert(USERS, { onConflict: "id" })
  );

  await must(
    "consumer_profiles",
    supabase.from("consumer_profiles").upsert(CONSUMER_PROFILES, { onConflict: "id" })
  );

  await must(
    "business_profiles",
    supabase.from("business_profiles").upsert(BUSINESS_PROFILES, { onConflict: "id" })
  );

  await must(
    "developer_profiles",
    supabase.from("developer_profiles").upsert(DEVELOPER_PROFILES, { onConflict: "id" })
  );

  console.log("\nUser-role seed complete.\n");
}

run().catch((error) => {
  console.error("\nUser-role seed failed:", error.message);
  process.exit(1);
});
