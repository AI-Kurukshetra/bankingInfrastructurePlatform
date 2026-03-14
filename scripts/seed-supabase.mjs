/**
 * Seed script for FinStack demo data.
 *
 * Covers all MVP tables:
 *   profiles, organizations, organization_memberships,
 *   bank_accounts, cards, transfers, transactions,
 *   onboarding_applications, documents,
 *   webhook_events, api_keys, alerts, cases, audit_logs
 *
 * Run: pnpm db:seed
 * Safe to re-run — all inserts use upsert with deterministic IDs.
 */

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// ── Environment ───────────────────────────────────────────────────────────────

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
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in .env.local before seeding."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function findUserByEmail(email) {
  let page = 1;
  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (data.users.length < 200) return null;
    page += 1;
  }
  return null;
}

async function ensureUser({ email, password, fullName, role }) {
  const existing = await findUserByEmail(email);
  if (existing) {
    await supabase.auth.admin.updateUserById(existing.id, {
      password,
      user_metadata: { full_name: fullName, role }
    });
    return existing;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role }
  });

  if (error || !data.user) throw error ?? new Error(`Unable to create user: ${email}`);
  return data.user;
}

function upsert(table, rows, conflict) {
  return supabase.from(table).upsert(rows, { onConflict: conflict });
}

async function must(label, promise) {
  const { error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  console.log(`  ✓ ${label}`);
}

// ── Deterministic IDs ─────────────────────────────────────────────────────────

const IDS = {
  org:            "d5809c45-5a7b-47fe-9fa7-11b3a1d06010",
  accountCustomer:"ae0fc4c3-7204-4018-a81b-1aa6c2530f51",
  accountOps:     "4b96f74b-6e6e-44be-9d0f-caf9d9bdb13a",
  card:           "2e3698cf-5a5d-4507-b760-5206bc25c90f",
  transfer:       "b0d6cbf3-9252-4f3e-a8a2-e395a8ae2f6f",
  txnFunding:     "c1000001-0000-0000-0000-000000000001",
  txnCoffee:      "c1000001-0000-0000-0000-000000000002",
  txnSaas:        "c1000001-0000-0000-0000-000000000003",
  txnRefund:      "c1000001-0000-0000-0000-000000000004",
  onboardingCons: "ob000001-0000-0000-0000-000000000001",
  onboardingBiz:  "ob000001-0000-0000-0000-000000000002",
  docId:          "dc000001-0000-0000-0000-000000000001",
  docBankStmt:    "dc000001-0000-0000-0000-000000000002",
  webhookOk:      "wh000001-0000-0000-0000-000000000001",
  webhookFail:    "wh000001-0000-0000-0000-000000000002",
  apiKey:         "ak000001-0000-0000-0000-000000000001",
  alert:          "01f6139d-7f23-44d7-a5bf-dc96a4ce6801",
  case:           "6d1ca959-a660-4479-90a5-c2b64f84e177",
};

// Demo API key — raw value shown in output; only the hash is stored.
const DEMO_RAW_API_KEY = "fsk_live_00000000000000000000000000000000000000000000000000000000deadbeef";
const DEMO_KEY_HASH = createHash("sha256").update(DEMO_RAW_API_KEY).digest("hex");
const DEMO_KEY_PREFIX = "fsk_live_00000000";

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log("\nFinStack — seeding demo data\n");

  // Users
  console.log("Users:");
  const adminUser     = await ensureUser({ email: "admin@finstack.dev",     password: "Admin#12345",     fullName: "Platform Admin",  role: "admin"     });
  const analystUser   = await ensureUser({ email: "analyst@finstack.dev",   password: "Analyst#12345",   fullName: "Risk Analyst",    role: "analyst"   });
  const customerUser  = await ensureUser({ email: "customer@finstack.dev",  password: "Customer#12345",  fullName: "Demo Customer",   role: "customer"  });
  const developerUser = await ensureUser({ email: "developer@finstack.dev", password: "Developer#12345", fullName: "Demo Developer",  role: "developer" });
  console.log("  ✓ 4 users ensured");

  // Profiles
  console.log("\nProfiles:");
  await must("profiles", upsert("profiles", [
    { id: adminUser.id,     email: adminUser.email,     full_name: "Platform Admin",  role: "admin"     },
    { id: analystUser.id,   email: analystUser.email,   full_name: "Risk Analyst",    role: "analyst"   },
    { id: customerUser.id,  email: customerUser.email,  full_name: "Demo Customer",   role: "customer"  },
    { id: developerUser.id, email: developerUser.email, full_name: "Demo Developer",  role: "developer" },
  ], "id"));

  // Organization
  console.log("\nOrganization:");
  await must("organization", upsert("organizations", {
    id: IDS.org,
    name: "Demo Fintech Inc",
    created_by: adminUser.id
  }, "id"));

  // Memberships
  console.log("\nMemberships:");
  await must("memberships", upsert("organization_memberships", [
    { organization_id: IDS.org, user_id: adminUser.id,     role: "admin"     },
    { organization_id: IDS.org, user_id: analystUser.id,   role: "analyst"   },
    { organization_id: IDS.org, user_id: customerUser.id,  role: "customer"  },
    { organization_id: IDS.org, user_id: developerUser.id, role: "developer" },
  ], "organization_id,user_id"));

  // Bank accounts
  console.log("\nBank accounts:");
  await must("bank_accounts", upsert("bank_accounts", [
    {
      id: IDS.accountCustomer,
      organization_id: IDS.org,
      owner_user_id: customerUser.id,
      account_name: "Customer Checking",
      account_number: "1000000001",
      status: "active",
      currency: "USD",
      available_balance: 2850.75
    },
    {
      id: IDS.accountOps,
      organization_id: IDS.org,
      owner_user_id: adminUser.id,
      account_name: "Operations Reserve",
      account_number: "1000000002",
      status: "active",
      currency: "USD",
      available_balance: 127500.00
    }
  ], "id"));

  // Card
  console.log("\nCards:");
  await must("card", upsert("cards", {
    id: IDS.card,
    account_id: IDS.accountCustomer,
    last4: "4821",
    status: "active",
    spending_limit_cents: 250000
  }, "id"));

  // Transfer
  console.log("\nTransfers:");
  await must("transfer", upsert("transfers", {
    id: IDS.transfer,
    source_account_id: IDS.accountOps,
    destination_account_id: IDS.accountCustomer,
    amount: 1250.00,
    currency: "USD",
    status: "settled",
    memo: "Initial funding",
    created_by: adminUser.id
  }, "id"));

  // Transactions
  console.log("\nTransactions:");
  await must("transactions", upsert("transactions", [
    {
      id: IDS.txnFunding,
      account_id: IDS.accountCustomer,
      transfer_id: IDS.transfer,
      type: "credit",
      amount: 1250.00,
      currency: "USD",
      running_balance: 1250.00,
      description: "Initial funding transfer",
      synctera_transaction_id: "synctera_txn_0001",
      posted_at: new Date("2026-03-01T10:00:00Z").toISOString()
    },
    {
      id: IDS.txnCoffee,
      account_id: IDS.accountCustomer,
      card_id: IDS.card,
      type: "debit",
      amount: -4.75,
      currency: "USD",
      running_balance: 1245.25,
      description: "Card purchase",
      merchant_name: "Blue Bottle Coffee",
      merchant_category_code: "5812",
      synctera_transaction_id: "synctera_txn_0002",
      posted_at: new Date("2026-03-05T08:22:00Z").toISOString()
    },
    {
      id: IDS.txnSaas,
      account_id: IDS.accountCustomer,
      card_id: IDS.card,
      type: "debit",
      amount: -49.00,
      currency: "USD",
      running_balance: 1196.25,
      description: "Subscription charge",
      merchant_name: "GitHub",
      merchant_category_code: "7372",
      synctera_transaction_id: "synctera_txn_0003",
      posted_at: new Date("2026-03-10T00:00:00Z").toISOString()
    },
    {
      id: IDS.txnRefund,
      account_id: IDS.accountCustomer,
      card_id: IDS.card,
      type: "reversal",
      amount: 4.75,
      currency: "USD",
      running_balance: 1201.00,
      description: "Merchant refund",
      merchant_name: "Blue Bottle Coffee",
      merchant_category_code: "5812",
      synctera_transaction_id: "synctera_txn_0004",
      posted_at: new Date("2026-03-11T14:00:00Z").toISOString()
    }
  ], "id"));

  // Onboarding applications
  console.log("\nOnboarding applications:");
  await must("onboarding_applications", upsert("onboarding_applications", [
    {
      id: IDS.onboardingCons,
      applicant_user_id: customerUser.id,
      organization_id: IDS.org,
      type: "consumer",
      status: "in_review",
      form_data: {
        first_name: "Demo",
        last_name: "Customer",
        date_of_birth: "1990-06-15",
        ssn_last4: "1234",
        address: {
          line1: "123 Main St",
          city: "San Francisco",
          state: "CA",
          zip: "94105",
          country: "US"
        },
        phone: "+14155550100",
        employment_status: "employed"
      },
      submitted_at: new Date("2026-03-12T09:00:00Z").toISOString()
    },
    {
      id: IDS.onboardingBiz,
      applicant_user_id: customerUser.id,
      organization_id: IDS.org,
      type: "business",
      status: "draft",
      form_data: {
        business_name: "Demo Fintech Inc",
        ein: "12-3456789",
        business_type: "llc",
        industry: "financial_services"
      }
    }
  ], "id"));

  // Documents
  console.log("\nDocuments:");
  await must("documents", upsert("documents", [
    {
      id: IDS.docId,
      onboarding_application_id: IDS.onboardingCons,
      uploaded_by: customerUser.id,
      type: "government_id",
      status: "under_review",
      storage_bucket: "identity-documents",
      storage_path: `${customerUser.id}/govt_id_front.jpg`,
      file_name: "govt_id_front.jpg",
      file_size_bytes: 204800,
      mime_type: "image/jpeg"
    },
    {
      id: IDS.docBankStmt,
      onboarding_application_id: IDS.onboardingCons,
      uploaded_by: customerUser.id,
      type: "bank_statement",
      status: "uploaded",
      storage_bucket: "identity-documents",
      storage_path: `${customerUser.id}/bank_statement_march.pdf`,
      file_name: "bank_statement_march.pdf",
      file_size_bytes: 512000,
      mime_type: "application/pdf"
    }
  ], "id"));

  // Webhook events
  console.log("\nWebhook events:");
  await must("webhook_events", upsert("webhook_events", [
    {
      id: IDS.webhookOk,
      event_id: "synctera_evt_0001",
      provider: "synctera",
      event_type: "payment.updated",
      status: "processed",
      retry_count: 0,
      raw_payload: {
        id: "synctera_evt_0001",
        type: "payment.updated",
        data: { payment_id: IDS.transfer, status: "settled" }
      },
      received_at: new Date("2026-03-01T10:01:00Z").toISOString(),
      processed_at: new Date("2026-03-01T10:01:02Z").toISOString()
    },
    {
      id: IDS.webhookFail,
      event_id: "synctera_evt_0002",
      provider: "synctera",
      event_type: "account.status_updated",
      status: "failed",
      retry_count: 3,
      raw_payload: {
        id: "synctera_evt_0002",
        type: "account.status_updated",
        data: { account_id: "ext_acct_unknown" }
      },
      last_error: "Account not found in local database",
      last_error_at: new Date("2026-03-10T05:30:00Z").toISOString(),
      received_at: new Date("2026-03-10T05:29:00Z").toISOString()
    }
  ], "id"));

  // API key
  console.log("\nAPI keys:");
  await must("api_key", upsert("api_keys", {
    id: IDS.apiKey,
    organization_id: IDS.org,
    created_by: developerUser.id,
    name: "Demo Integration Key",
    key_hash: DEMO_KEY_HASH,
    key_prefix: DEMO_KEY_PREFIX,
    status: "active"
  }, "id"));

  // Alerts
  console.log("\nAlerts:");
  await must("alert", upsert("alerts", {
    id: IDS.alert,
    account_id: IDS.accountCustomer,
    transfer_id: IDS.transfer,
    severity: "medium",
    title: "Higher-than-usual transfer",
    description: "Transfer crossed seeded review threshold.",
    status: "open"
  }, "id"));

  // Cases
  console.log("\nCases:");
  await must("case", upsert("cases", {
    id: IDS.case,
    alert_id: IDS.alert,
    assignee_user_id: analystUser.id,
    status: "investigating",
    resolution_notes: null
  }, "id"));

  // Audit log
  console.log("\nAudit logs:");
  const { error: logError } = await supabase.from("audit_logs").insert({
    actor_user_id: adminUser.id,
    action: "seed.run",
    entity_type: "organization",
    entity_id: IDS.org,
    request_id: "seed-script",
    after_state: { seeded_at: new Date().toISOString() },
    metadata: { source: "scripts/seed-supabase.mjs" }
  });
  // Audit logs don't use upsert — duplicate inserts on re-runs are fine.
  if (logError && !logError.message.includes("duplicate")) {
    throw new Error(`audit_logs: ${logError.message}`);
  }
  console.log("  ✓ audit log");

  // Summary
  console.log("\n─────────────────────────────────────────────");
  console.log("Seed complete. Demo credentials:\n");
  console.log("  admin@finstack.dev     / Admin#12345     (admin)");
  console.log("  analyst@finstack.dev   / Analyst#12345   (analyst)");
  console.log("  customer@finstack.dev  / Customer#12345  (customer)");
  console.log("  developer@finstack.dev / Developer#12345 (developer)");
  console.log("\nDemo API key (raw — never stored):");
  console.log(`  ${DEMO_RAW_API_KEY}`);
  console.log("  Prefix :", DEMO_KEY_PREFIX);
  console.log("  Hash   :", DEMO_KEY_HASH);
  console.log("─────────────────────────────────────────────\n");
}

run().catch((err) => {
  console.error("\nSeed failed:", err.message);
  process.exit(1);
});
