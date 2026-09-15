import { getServerSupabaseAdmin } from "../lib/supabase";

async function main() {
  const admin = getServerSupabaseAdmin();
  const ownerEmail = "itsmbillah@gmail.com";
  const shopName = "Reyon Watch";

  console.log(`Inspecting & Setting up ${shopName} for ${ownerEmail}...`);

  // 1. Get or create shop category WATCHES
  let { data: watchCat } = await admin.from("shop_categories").select("id").eq("key", "WATCHES").single();
  if (!watchCat) {
    const { data: firstCat } = await admin.from("shop_categories").select("id").limit(1).single();
    watchCat = firstCat;
  }

  // 2. Find or create Reyon Watch organization
  let { data: org } = await admin
    .from("organizations")
    .select("*, stores(*)")
    .ilike("name", `%${shopName}%`)
    .limit(1)
    .single();

  if (!org) {
    console.log(`Creating organization: ${shopName}...`);
    const { data: newOrg, error: orgErr } = await admin
      .from("organizations")
      .insert({
        name: shopName,
        slug: "reyon-watch",
        plan_tier: "tier_pro",
        subscription_status: "active",
        max_stores: 5,
        max_users: 10,
        max_products: 5000,
      })
      .select()
      .single();

    if (orgErr || !newOrg) {
      console.error("Failed to create org:", orgErr);
      return;
    }
    org = newOrg;

    // Create Primary Store Outlet
    const { data: newStore, error: storeErr } = await admin
      .from("stores")
      .insert({
        organization_id: org.id,
        shop_category_id: watchCat?.id,
        name: `${shopName} - Main Branch`,
        code: "REYON-01",
        currency: "BDT",
        currency_symbol: "৳",
        timezone: "Asia/Dhaka",
        is_active: true,
      })
      .select()
      .single();

    if (storeErr) {
      console.error("Failed to create store:", storeErr);
      return;
    }
    org.stores = [newStore];
  }

  console.log(`Organization: ${org.name} (${org.id})`);
  const primaryStore = org.stores?.[0];
  console.log(`Primary Store: ${primaryStore?.name} (${primaryStore?.id})`);

  // 3. Find or create itsmbillah@gmail.com
  const { data: usersData } = await admin.auth.admin.listUsers();
  let ownerUser = usersData?.users?.find(
    (u) => u.email?.toLowerCase() === ownerEmail.toLowerCase()
  );

  if (!ownerUser) {
    console.log(`Creating auth user: ${ownerEmail}...`);
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: ownerEmail,
      email_confirm: true,
      user_metadata: { full_name: "Masum Billah" },
    });
    if (createErr || !created.user) {
      console.error("Failed to create user:", createErr);
      return;
    }
    ownerUser = created.user;
  }

  console.log(`Auth User ID: ${ownerUser.id} (${ownerUser.email})`);

  // 4. Ensure user_profile has is_super_admin = false (NOT a super admin)
  await admin.from("user_profiles").upsert(
    {
      id: ownerUser.id,
      full_name: "Masum Billah",
      is_super_admin: false, // Strictly false!
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  console.log(`✅ user_profiles: ${ownerEmail} -> is_super_admin = false`);

  // 5. Link to Reyon Watch as role = 'owner'
  await admin.from("organization_members").upsert(
    {
      organization_id: org.id,
      user_id: ownerUser.id,
      role: "owner",
      is_active: true,
    },
    { onConflict: "organization_id,user_id" }
  );
  console.log(`✅ organization_members: ${ownerEmail} -> role = 'owner' on ${org.name}`);

  // 6. Link to Store
  if (primaryStore) {
    await admin.from("store_members").upsert(
      {
        store_id: primaryStore.id,
        user_id: ownerUser.id,
      },
      { onConflict: "store_id,user_id" }
    );
    console.log(`✅ store_members: ${ownerEmail} -> linked to ${primaryStore.name}`);
  }

  // 7. Verify William Masum remains Super Admin
  const william = usersData?.users?.find((u) => u.email?.toLowerCase() === "williammasum@gmail.com");
  if (william) {
    const { data: williamProfile } = await admin.from("user_profiles").select("*").eq("id", william.id).single();
    console.log(`✅ Verified Master Admin williammasum: is_super_admin = ${williamProfile?.is_super_admin}`);
  }
}

main().then(() => {
  console.log("Setup complete.");
  process.exit(0);
});
