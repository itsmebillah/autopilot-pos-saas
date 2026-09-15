import { getServerSupabaseAdmin } from "../lib/supabase";

async function bootstrap() {
  const admin = getServerSupabaseAdmin();
  const masterEmail = "williammasum@gmail.com";

  console.log(`Checking Master Admin account: ${masterEmail}`);

  const { data: usersData, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) {
    console.error("Failed to list users:", listErr);
    return;
  }

  let masterUser = usersData.users.find(
    (u) => u.email?.toLowerCase() === masterEmail.toLowerCase()
  );

  if (!masterUser) {
    console.log(`Master admin user not found in auth.users. Creating account...`);
    // Create master user with email confirmed
    const { data: createdUser, error: createErr } = await admin.auth.admin.createUser({
      email: masterEmail,
      email_confirm: true,
      user_metadata: { full_name: "William Masum (Platform Owner)" },
    });

    if (createErr) {
      console.error("Failed to create master user:", createErr);
      return;
    }
    masterUser = createdUser.user;
    console.log(`Created auth user: ${masterUser.id}`);
  } else {
    console.log(`Found existing auth user: ${masterUser.id} (${masterUser.email})`);
  }

  if (masterUser) {
    // Upsert into user_profiles with is_super_admin = true
    const { error: profileErr } = await admin.from("user_profiles").upsert(
      {
        id: masterUser.id,
        full_name: "William Masum",
        is_super_admin: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (profileErr) {
      console.error("Failed to update user profile:", profileErr);
    } else {
      console.log(`✅ Master Admin user profile set to is_super_admin = true`);
    }

    // Ensure master admin has an active platform organization & store membership
    const { data: orgs } = await admin.from("organizations").select("id").limit(1);
    if (orgs && orgs.length > 0) {
      const orgId = orgs[0].id;
      await admin.from("organization_members").upsert(
        {
          organization_id: orgId,
          user_id: masterUser.id,
          role: "owner",
          is_active: true,
        },
        { onConflict: "organization_id,user_id" }
      );

      const { data: stores } = await admin.from("stores").select("id").eq("organization_id", orgId).limit(1);
      if (stores && stores.length > 0) {
        await admin.from("store_members").upsert(
          {
            store_id: stores[0].id,
            user_id: masterUser.id,
          },
          { onConflict: "store_id,user_id" }
        );
      }
      console.log(`✅ Master Admin memberships linked to primary organization & store.`);
    }
  }
}

bootstrap().then(() => {
  console.log("Bootstrap complete.");
  process.exit(0);
});
