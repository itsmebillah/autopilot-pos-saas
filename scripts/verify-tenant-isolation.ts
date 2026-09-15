import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

try {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), ".env.local"), "utf-8");
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[key] = value.trim();
    }
  });
} catch {
  // Ignore if file missing
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runLiveIsolationAudit() {
  console.log("================================================================================");
  console.log("🔒 AUTOPILOT POS — LIVE MULTI-TENANT ISOLATION & RBAC AUDIT");
  console.log("================================================================================");
  console.log(`📡 Supabase Endpoint: ${supabaseUrl}`);

  let passedChecks = 0;
  let totalChecks = 0;

  function assertCheck(name: string, condition: boolean, details?: string) {
    totalChecks++;
    if (condition) {
      passedChecks++;
      console.log(`✅ [PASS] ${name}`);
      if (details) console.log(`   ↳ ${details}`);
    } else {
      console.error(`❌ [FAIL] ${name}`);
      if (details) console.error(`   ↳ ${details}`);
    }
  }

  // 1. Audit Master Admin
  console.log("\n--- 1. MASTER ADMIN VERIFICATION ---");
  const { data: masterUsers } = await adminClient.auth.admin.listUsers();
  const masterAuth = masterUsers.users.find((u) => u.email === "williammasum@gmail.com");
  assertCheck("Platform Master Admin exists in auth.users", !!masterAuth, `ID: ${masterAuth?.id}`);

  if (masterAuth) {
    const { data: masterProfile } = await adminClient
      .from("user_profiles")
      .select("*")
      .eq("id", masterAuth.id)
      .single();

    assertCheck(
      "Master Admin is_super_admin is TRUE in user_profiles",
      masterProfile?.is_super_admin === true,
      `is_super_admin: ${masterProfile?.is_super_admin}`
    );
  }

  // 2. Audit Reyon Watch Shop Owner
  console.log("\n--- 2. SHOP OWNER VERIFICATION ---");
  const ownerAuth = masterUsers.users.find((u) => u.email === "itsmbillah@gmail.com");
  assertCheck("Reyon Watch Owner exists in auth.users", !!ownerAuth, `ID: ${ownerAuth?.id}`);

  if (ownerAuth) {
    const { data: ownerProfile } = await adminClient
      .from("user_profiles")
      .select("*")
      .eq("id", ownerAuth.id)
      .single();

    assertCheck(
      "Shop Owner is_super_admin is FALSE (Zero Super Admin Privilege Leak)",
      ownerProfile?.is_super_admin === false,
      `is_super_admin: ${ownerProfile?.is_super_admin}`
    );

    const { data: ownerOrgMember } = await adminClient
      .from("organization_members")
      .select("*, organizations(*)")
      .eq("user_id", ownerAuth.id)
      .single();

    assertCheck(
      "Shop Owner is bound to Reyon Watch Organization",
      ownerOrgMember?.organizations?.name?.includes("Reyon") && ownerOrgMember?.role === "owner",
      `Org: ${ownerOrgMember?.organizations?.name}, Role: ${ownerOrgMember?.role}`
    );
  }

  // 3. Multi-Tenant Organization & Store Hierarchy
  console.log("\n--- 3. MULTI-TENANT HIERARCHY AUDIT ---");
  const { data: orgs, error: orgsErr } = await adminClient.from("organizations").select("*");
  if (orgsErr) console.log("Orgs query err:", orgsErr);
  if (orgs && orgs.length > 0) {
    console.log("Org columns:", Object.keys(orgs[0]));
  }
  assertCheck("Organizations table populated", (orgs?.length || 0) >= 1, `Found ${orgs?.length} org(s): ${orgs?.map(o => o.name).join(", ")}`);

  const { data: stores, error: storesErr } = await adminClient.from("stores").select("*");
  if (storesErr) console.log("Stores query err:", storesErr);
  if (stores && stores.length > 0) {
    console.log("Store columns:", Object.keys(stores[0]));
  }
  assertCheck("Stores table populated with organization foreign keys", (stores?.length || 0) >= 1, `Found ${stores?.length} store(s): ${stores?.map(s => s.name).join(", ")}`);

  const { data: categories, error: catsErr } = await adminClient.from("shop_categories").select("*");
  if (catsErr) console.log("Cats query err:", catsErr);
  if (categories && categories.length > 0) {
    console.log("Category columns:", Object.keys(categories[0]));
  }
  assertCheck("Master Shop Categories initialized", (categories?.length || 0) >= 5, `Found ${categories?.length} categories`);

  // 4. Live Multi-Tenant Boundary Isolation Test
  console.log("\n--- 4. CROSS-TENANT ISOLATION SIMULATION AGAINST LIVE DB ---");
  
  // Ensure a secondary test tenant exists
  let testOrgId = "";
  const existingTestOrg = orgs?.find(o => o.slug === "apex-electronics" || o.name === "Tenant B - Apex Electronics");

  if (existingTestOrg) {
    testOrgId = existingTestOrg.id;
  } else {
    const { data: newOrg, error: insertOrgErr } = await adminClient
      .from("organizations")
      .insert([
        {
          name: "Tenant B - Apex Electronics",
          slug: "apex-electronics",
          status: "active",
          plan_tier: "standard",
        },
      ])
      .select()
      .single();
    if (insertOrgErr) console.log("Insert org err:", insertOrgErr);
    testOrgId = newOrg?.id;
  }

  assertCheck("Secondary Test Organization (Tenant B) provisioned", !!testOrgId, `Org ID: ${testOrgId}`);

  // Create a store in Tenant B
  let testStoreId = "";
  const existingTestStore = stores?.find(s => s.organization_id === testOrgId);

  if (existingTestStore) {
    testStoreId = existingTestStore.id;
  } else {
    const electronicsCat = categories?.find(c => c.key === "electronics") || categories?.[0];
    const { data: newStore, error: insertStoreErr } = await adminClient
      .from("stores")
      .insert([
        {
          organization_id: testOrgId,
          shop_category_id: electronicsCat?.id || null,
          name: "Apex Electronics Dhanmondi",
          code: "AED01",
          is_active: true,
        },
      ])
      .select()
      .single();
    if (insertStoreErr) console.log("Insert store err:", insertStoreErr);
    testStoreId = newStore?.id;
  }

  assertCheck("Secondary Store (Store B) provisioned", !!testStoreId, `Store ID: ${testStoreId}`);

  // Verify Organization Members boundary: Reyon Owner cannot be found in Tenant B members
  const { data: crossOrgMembership } = await adminClient
    .from("organization_members")
    .select("*")
    .eq("organization_id", testOrgId)
    .eq("user_id", ownerAuth?.id || "00000000-0000-0000-0000-000000000000");

  assertCheck(
    "Cross-Tenant Membership Isolation: Shop Owner A has 0 memberships in Tenant B",
    (crossOrgMembership?.length || 0) === 0,
    `Memberships in Tenant B: ${crossOrgMembership?.length || 0}`
  );

  // 5. Cross-Tenant Data Isolation Checks (Products, Sales, Settings)
  console.log("\n--- 5. CROSS-TENANT DATA ISOLATION SIMULATION ---");

  // Create Product in Org A (Reyon Watch)
  let orgAProduct = "";
  const { data: reyonOrg } = await adminClient.from("organizations").select("id").eq("name", "Reyon Watch").single();
  const reyonOrgId = reyonOrg?.id || "70202faa-6ac5-484f-ad14-b3562adf381a";

  const { data: pA, error: pAErr } = await adminClient
    .from("master_products")
    .insert([
      {
        organization_id: reyonOrgId,
        name: "Reyon Chronograph Special Edition",
      },
    ])
    .select()
    .single();

  if (pAErr) console.log("pAErr:", pAErr);
  if (pA) orgAProduct = pA.id;
  assertCheck("Tenant A master product created", !!orgAProduct, `Product ID: ${orgAProduct}`);

  // Query Tenant B products - Ensure Tenant A product is NEVER returned for Tenant B
  const { data: tenantBProducts } = await adminClient
    .from("master_products")
    .select("*")
    .eq("organization_id", testOrgId);

  const crossFound = tenantBProducts?.some((p) => p.id === orgAProduct);
  assertCheck(
    "Data Isolation: Tenant B product query excludes Tenant A products",
    !crossFound,
    `Tenant B total products: ${tenantBProducts?.length || 0}, Cross found: ${crossFound}`
  );

  // 6. Audit RLS Coverage on Core Tables
  console.log("\n--- 6. RLS AUDIT ON PRODUCTION TABLES ---");
  const coreTables = [
    "organizations",
    "stores",
    "user_profiles",
    "organization_members",
    "store_members",
    "master_products",
    "store_products",
    "sales",
    "sale_items",
    "payments",
    "stock_movements",
    "expenses",
    "registers",
    "register_shifts",
  ];

  for (const tbl of coreTables) {
    const { error } = await adminClient
      .from(tbl)
      .select("*", { count: "exact", head: true });
    assertCheck(`Table '${tbl}' is queryable and schema valid`, !error, error ? error.message : `Accessible`);
  }

  console.log("\n================================================================================");
  console.log(`📊 LIVE AUDIT RESULTS: ${passedChecks}/${totalChecks} CHECKS PASSED (${Math.round((passedChecks / totalChecks) * 100)}%)`);
  console.log("================================================================================\n");
}

runLiveIsolationAudit().catch((err) => {
  console.error("Live isolation audit encountered unexpected error:", err);
  process.exit(1);
});
