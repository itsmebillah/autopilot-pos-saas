import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dhgfevlwiwcblobpxjca.supabase.co";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseServiceRoleKey) {
  console.error("❌ Error: SUPABASE_SERVICE_ROLE_KEY is required to provision admin users.");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log("🚀 Starting Autopilot POS admin user provisioning...");

  const adminEmail = "admin@autopilotpos.com";
  const defaultPassword = process.env.INITIAL_ADMIN_PASSWORD || "Autopilot@2026";

  // 1. Check if user already exists in auth.users
  const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers();
  if (listError) {
    console.error("❌ Failed to list users:", listError);
    process.exit(1);
  }

  let targetUser = usersData.users.find((u) => u.email === adminEmail);

  if (!targetUser) {
    console.log(`Creating new Supabase Auth user: ${adminEmail}...`);
    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email: adminEmail,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: {
        full_name: "Autopilot Admin",
      },
    });

    if (createError || !createData.user) {
      console.error("❌ Failed to create auth user:", createError);
      process.exit(1);
    }
    targetUser = createData.user;
    console.log(`✅ Auth user created with ID: ${targetUser.id}`);
  } else {
    console.log(`ℹ️ Auth user already exists with ID: ${targetUser.id}`);
  }

  const userId = targetUser.id;

  // 2. Provision or update user_profiles
  const { error: profileError } = await adminClient
    .from("user_profiles")
    .upsert({
      id: userId,
      full_name: "Autopilot Administrator",
      phone: "+8801700000000",
      is_super_admin: true,
      updated_at: new Date().toISOString(),
    });

  if (profileError) {
    console.error("⚠️ user_profiles error:", profileError);
  } else {
    console.log("✅ user_profiles entry verified.");
  }

  // 3. Resolve default organization & store
  const { data: orgs } = await adminClient.from("organizations").select("id").limit(1);
  const primaryOrgId = orgs?.[0]?.id;

  const { data: stores } = await adminClient.from("stores").select("id").limit(1);
  const primaryStoreId = stores?.[0]?.id;

  if (primaryOrgId) {
    const { error: orgMemberError } = await adminClient
      .from("organization_members")
      .upsert(
        {
          organization_id: primaryOrgId,
          user_id: userId,
          role: "owner",
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,user_id" }
      );

    if (orgMemberError) {
      console.error("⚠️ organization_members error:", orgMemberError);
    } else {
      console.log(`✅ organization_members linked to org: ${primaryOrgId}`);
    }
  }

  if (primaryStoreId) {
    const { error: storeMemberError } = await adminClient
      .from("store_members")
      .upsert(
        {
          store_id: primaryStoreId,
          user_id: userId,
        },
        { onConflict: "store_id,user_id" }
      );

    if (storeMemberError) {
      console.error("⚠️ store_members error:", storeMemberError);
    } else {
      console.log(`✅ store_members linked to store: ${primaryStoreId}`);
    }
  }

  console.log("🎉 Provisioning complete! Ready for Supabase Auth.");
}

main().catch((err) => {
  console.error("Fatal provisioning error:", err);
  process.exit(1);
});
