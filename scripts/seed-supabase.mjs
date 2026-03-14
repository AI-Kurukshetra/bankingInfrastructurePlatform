import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['\"]|['\"]$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
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
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function findUserByEmail(email) {
  let page = 1;
  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      throw error;
    }

    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) {
      return match;
    }

    if (data.users.length < 200) {
      return null;
    }

    page += 1;
  }

  return null;
}

async function ensureUser({ email, password, fullName, role }) {
  const existing = await findUserByEmail(email);
  if (existing) {
    await supabase.auth.admin.updateUserById(existing.id, {
      password,
      user_metadata: {
        full_name: fullName,
        role
      }
    });

    return existing;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role
    }
  });

  if (error || !data.user) {
    throw error ?? new Error(`Unable to create user for ${email}`);
  }

  return data.user;
}

async function run() {
  const adminUser = await ensureUser({
    email: "admin@bankinginfra.dev",
    password: "Admin#12345",
    fullName: "Platform Admin",
    role: "admin"
  });

  const analystUser = await ensureUser({
    email: "analyst@bankinginfra.dev",
    password: "Analyst#12345",
    fullName: "Risk Analyst",
    role: "analyst"
  });

  const customerUser = await ensureUser({
    email: "customer@bankinginfra.dev",
    password: "Customer#12345",
    fullName: "Demo Customer",
    role: "customer"
  });

  const organizationId = "d5809c45-5a7b-47fe-9fa7-11b3a1d06010";
  const customerAccountId = "ae0fc4c3-7204-4018-a81b-1aa6c2530f51";
  const opsAccountId = "4b96f74b-6e6e-44be-9d0f-caf9d9bdb13a";
  const transferId = "b0d6cbf3-9252-4f3e-a8a2-e395a8ae2f6f";
  const alertId = "01f6139d-7f23-44d7-a5bf-dc96a4ce6801";
  const caseId = "6d1ca959-a660-4479-90a5-c2b64f84e177";
  const cardId = "2e3698cf-5a5d-4507-b760-5206bc25c90f";

  const { error: profileError } = await supabase.from("profiles").upsert(
    [
      {
        id: adminUser.id,
        email: adminUser.email,
        full_name: "Platform Admin",
        role: "admin"
      },
      {
        id: analystUser.id,
        email: analystUser.email,
        full_name: "Risk Analyst",
        role: "analyst"
      },
      {
        id: customerUser.id,
        email: customerUser.email,
        full_name: "Demo Customer",
        role: "customer"
      }
    ],
    { onConflict: "id" }
  );

  if (profileError) {
    throw profileError;
  }

  const { error: organizationError } = await supabase.from("organizations").upsert(
    {
      id: organizationId,
      name: "Demo Fintech Inc",
      created_by: adminUser.id
    },
    { onConflict: "id" }
  );

  if (organizationError) {
    throw organizationError;
  }

  const { error: membershipError } = await supabase
    .from("organization_memberships")
    .upsert(
      [
        {
          organization_id: organizationId,
          user_id: adminUser.id,
          role: "admin"
        },
        {
          organization_id: organizationId,
          user_id: analystUser.id,
          role: "analyst"
        },
        {
          organization_id: organizationId,
          user_id: customerUser.id,
          role: "customer"
        }
      ],
      { onConflict: "organization_id,user_id" }
    );

  if (membershipError) {
    throw membershipError;
  }

  const { error: accountsError } = await supabase.from("bank_accounts").upsert(
    [
      {
        id: customerAccountId,
        organization_id: organizationId,
        owner_user_id: customerUser.id,
        account_name: "Customer Checking",
        account_number: "1000000001",
        status: "active",
        currency: "USD",
        available_balance: 2850.75
      },
      {
        id: opsAccountId,
        organization_id: organizationId,
        owner_user_id: adminUser.id,
        account_name: "Operations Reserve",
        account_number: "1000000002",
        status: "active",
        currency: "USD",
        available_balance: 127500.0
      }
    ],
    { onConflict: "id" }
  );

  if (accountsError) {
    throw accountsError;
  }

  const { error: cardsError } = await supabase.from("cards").upsert(
    {
      id: cardId,
      account_id: customerAccountId,
      last4: "4821",
      status: "active",
      spending_limit_cents: 250000
    },
    { onConflict: "id" }
  );

  if (cardsError) {
    throw cardsError;
  }

  const { error: transfersError } = await supabase.from("transfers").upsert(
    {
      id: transferId,
      source_account_id: opsAccountId,
      destination_account_id: customerAccountId,
      amount: 1250.0,
      currency: "USD",
      status: "settled",
      memo: "Initial funding",
      created_by: adminUser.id
    },
    { onConflict: "id" }
  );

  if (transfersError) {
    throw transfersError;
  }

  const { error: alertsError } = await supabase.from("alerts").upsert(
    {
      id: alertId,
      account_id: customerAccountId,
      transfer_id: transferId,
      severity: "medium",
      title: "Higher-than-usual transfer",
      description: "Transfer crossed seeded review threshold.",
      status: "open"
    },
    { onConflict: "id" }
  );

  if (alertsError) {
    throw alertsError;
  }

  const { error: casesError } = await supabase.from("cases").upsert(
    {
      id: caseId,
      alert_id: alertId,
      assignee_user_id: analystUser.id,
      status: "investigating",
      resolution_notes: null
    },
    { onConflict: "id" }
  );

  if (casesError) {
    throw casesError;
  }

  const { error: logsError } = await supabase.from("audit_logs").insert([
    {
      actor_user_id: adminUser.id,
      action: "seeded_demo_data",
      entity_type: "organization",
      entity_id: organizationId,
      metadata: {
        source: "scripts/seed-supabase.mjs"
      }
    }
  ]);

  if (logsError) {
    throw logsError;
  }

  console.log("Seed completed.");
  console.log("Demo credentials:");
  console.log("admin@bankinginfra.dev / Admin#12345");
  console.log("analyst@bankinginfra.dev / Analyst#12345");
  console.log("customer@bankinginfra.dev / Customer#12345");
}

run().catch((error) => {
  console.error("Seed failed:", error.message);
  process.exit(1);
});
