import { NextResponse } from "next/server";
import { requireAuth, requireSuperAdmin } from "@/lib/auth-guard";
import { getServerSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const session = await requireAuth();
    requireSuperAdmin(session);

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.toLowerCase() || "";
    const status = searchParams.get("status") || "all";

    const adminClient = getServerSupabaseAdmin();

    // Fetch organizations with related stores, shop categories, and members
    const { data: orgs, error } = await adminClient
      .from("organizations")
      .select(`
        *,
        stores (
          id,
          name,
          code,
          shop_category_id,
          phone,
          email,
          address,
          currency,
          currency_symbol,
          timezone,
          is_active,
          created_at,
          shop_categories (
            id,
            key,
            name
          )
        ),
        organization_members (
          id,
          user_id,
          role,
          is_active,
          user_profiles:user_id (
            id,
            full_name,
            phone,
            avatar_url
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Format list for table/card view
    let formatted = (orgs || []).map((org: any) => {
      const stores = org.stores || [];
      const primaryStore = stores[0] || null;
      const members = org.organization_members || [];
      const ownerMember = members.find((m: any) => m.role === "owner") || members[0] || null;
      const ownerProfile = ownerMember?.user_profiles || null;

      const categoryName = primaryStore?.shop_categories?.name || "General Retail";
      const categoryKey = primaryStore?.shop_categories?.key || "GENERAL";

      return {
        id: org.id,
        businessName: org.name,
        slug: org.slug,
        planTier: org.plan_tier,
        subscriptionStatus: org.subscription_status,
        createdAt: org.created_at,
        storeCount: stores.length,
        userCount: members.length,
        primaryStore: primaryStore
          ? {
              id: primaryStore.id,
              name: primaryStore.name,
              code: primaryStore.code,
              categoryName,
              categoryKey,
              isActive: primaryStore.is_active,
              phone: primaryStore.phone,
              address: primaryStore.address,
              currency: primaryStore.currency,
            }
          : null,
        stores: stores.map((s: any) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          categoryName: s.shop_categories?.name || "General Retail",
          categoryKey: s.shop_categories?.key || "GENERAL",
          isActive: s.is_active,
          createdAt: s.created_at,
        })),
        admin: {
          fullName: ownerProfile?.full_name || "Unassigned",
          phone: ownerProfile?.phone || null,
          role: ownerMember?.role || "owner",
        },
      };
    });

    // Apply filtering if provided
    if (query) {
      formatted = formatted.filter(
        (o) =>
          o.businessName.toLowerCase().includes(query) ||
          (o.primaryStore?.name && o.primaryStore.name.toLowerCase().includes(query)) ||
          (o.admin.fullName && o.admin.fullName.toLowerCase().includes(query)) ||
          (o.primaryStore?.categoryName && o.primaryStore.categoryName.toLowerCase().includes(query))
      );
    }

    if (status !== "all") {
      formatted = formatted.filter((o) => {
        if (status === "active") return o.subscriptionStatus === "active" && o.primaryStore?.isActive !== false;
        if (status === "suspended") return o.subscriptionStatus === "suspended" || o.primaryStore?.isActive === false;
        return true;
      });
    }

    return NextResponse.json({
      success: true,
      organizations: formatted,
    });
  } catch (err: unknown) {
    const error = err as Error & { status?: number };
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch organizations" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    if (req.headers.get("origin") !== new URL(req.url).origin) return NextResponse.json({ message: "Invalid origin." }, { status: 403 });
    const session = await requireAuth();
    requireSuperAdmin(session);

    const body = await req.json();
    const {
      businessName,
      legalName: _legalName,
      phone,
      email,
      website: _website,
      address,
      currency = "BDT",
      currencyCode: _currencyCode = "BDT",
      currencySymbol = "৳",
      timezone = "Asia/Dhaka",
      locale = "en-US",
      storeName,
      storeCode,
      shopCategoryId,
      logoUrl,
      adminFullName,
      adminEmail,
      adminPhone,
    } = body;

    if (!businessName || !storeName || !shopCategoryId || !adminFullName || !adminEmail) {
      return NextResponse.json(
        { success: false, message: "Missing required fields for shop creation" },
        { status: 400 }
      );
    }

    const adminClient = getServerSupabaseAdmin();

    let existingAdmin: { id: string; email?: string } | undefined;
    for (let page = 1; ; page++) {
      const listed = await adminClient.auth.admin.listUsers({ page, perPage: 500 });
      if (listed.error) throw new Error("Unable to check owner account.");
      existingAdmin = listed.data.users.find(u => u.email?.toLowerCase() === adminEmail.toLowerCase());
      if (existingAdmin || listed.data.users.length < 500) break;
    }
    if (existingAdmin) {
      const { data: existingProfile, error: profileError } = await adminClient.from("user_profiles")
        .select("is_super_admin").eq("id", existingAdmin.id).maybeSingle();
      if (profileError) throw new Error("Unable to verify owner profile.");
      if (existingProfile?.is_super_admin) return NextResponse.json({ message: "Platform owners cannot be assigned as shop owners." }, { status: 400 });
    }

    // 1. Fetch the category defaults
    const { data: categoryData, error: catErr } = await adminClient
      .from("shop_categories")
      .select("*")
      .eq("id", shopCategoryId)
      .single();

    if (catErr || !categoryData) {
      return NextResponse.json(
        { success: false, message: "Invalid shop category selected" },
        { status: 400 }
      );
    }

    // 2. Generate slug and Create Organization
    const baseSlug = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

    const { data: orgData, error: orgErr } = await adminClient
      .from("organizations")
      .insert({
        name: businessName,
        slug: uniqueSlug,
        plan_tier: "tier_starter",
        subscription_status: "active",
        max_stores: 5,
        max_users: 10,
        max_products: 5000,
      })
      .select()
      .single();

    if (orgErr || !orgData) {
      throw new Error(`Failed to create organization: ${orgErr?.message || "Unknown error"}`);
    }

    const orgId = orgData.id;

    // 3. Create Store
    const generatedStoreCode = storeCode || `STR-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const defaultModules = categoryData.default_modules || [
      "mod_pos",
      "mod_products",
      "mod_inventory",
      "mod_sales",
      "mod_reports",
    ];

    const { data: storeData, error: storeErr } = await adminClient
      .from("stores")
      .insert({
        organization_id: orgId,
        shop_category_id: shopCategoryId,
        name: storeName,
        code: generatedStoreCode,
        phone: phone || adminPhone || null,
        email: email || adminEmail || null,
        address: address || null,
        currency: currency || "BDT",
        currency_symbol: currencySymbol || "৳",
        currency_position: "BEFORE",
        timezone: timezone || "Asia/Dhaka",
        locale: locale || "en-US",
        logo_url: logoUrl || null,
        enabled_modules: defaultModules,
        is_active: true,
      })
      .select()
      .single();

    if (storeErr || !storeData) {
      // Rollback organization if store creation fails
      await adminClient.from("organizations").delete().eq("id", orgId);
      throw new Error(`Failed to create store: ${storeErr?.message || "Unknown error"}`);
    }

    const storeId = storeData.id;

    // 4. Copy Category Attribute Definitions to Store
    const defaultAttributes = categoryData.default_attributes || [];
    if (Array.isArray(defaultAttributes) && defaultAttributes.length > 0) {
      const attributeRows = defaultAttributes.map((attr: any) => ({
        store_id: storeId,
        name: attr.name,
        label: attr.label,
        data_type: attr.data_type || "text",
        options: attr.options || [],
        is_required: !!attr.is_required,
        show_in_pos: attr.show_in_pos !== false,
        show_on_receipt: attr.show_on_receipt !== false,
        is_filterable: attr.is_filterable !== false,
      }));

      await adminClient.from("shop_attribute_definitions").insert(attributeRows);
    }

    // 5. Create or Find Shop Admin in Supabase Auth
    let adminUserId: string;
    if (existingAdmin) {
      adminUserId = existingAdmin.id;
    } else {
      // Create new Auth user with email auto-confirmed
      const { data: newUser, error: createAuthErr } = await adminClient.auth.admin.createUser({
        email: adminEmail,
        email_confirm: true,
        user_metadata: { full_name: adminFullName, phone: adminPhone },
      });

      if (createAuthErr || !newUser?.user) {
        throw new Error(`Failed to create auth user for shop admin: ${createAuthErr?.message}`);
      }
      adminUserId = newUser.user.id;
    }

    // 6. Upsert User Profile
    const { error: profileWriteError } = await adminClient.from("user_profiles").upsert(
      {
        id: adminUserId,
        full_name: adminFullName,
        phone: adminPhone || null,

      },
      { onConflict: "id", ignoreDuplicates: true }
    );

    if (profileWriteError) throw new Error("Unable to create owner profile.");

    // 7. Create Organization Membership (Role = 'owner')
    await adminClient.from("organization_members").upsert(
      {
        organization_id: orgId,
        user_id: adminUserId,
        role: "owner",
        is_active: true,
      },
      { onConflict: "organization_id,user_id" }
    );

    // 8. Create Store Membership
    await adminClient.from("store_members").upsert(
      {
        store_id: storeId,
        user_id: adminUserId,
      },
      { onConflict: "store_id,user_id" }
    );

    return NextResponse.json({
      success: true,
      message: `Shop "${businessName}" (${storeName}) successfully created!`,
      organizationId: orgId,
      storeId: storeId,
      adminUserId: adminUserId,
    });
  } catch (err: unknown) {
    const error = err as Error & { status?: number };
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create shop" },
      { status: error.status || 500 }
    );
  }
}
