import { NextResponse } from "next/server";
import { requireAuth, requireSuperAdmin } from "@/lib/auth-guard";
import { getServerSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    if (req.headers.get("origin") !== new URL(req.url).origin) return NextResponse.json({ message: "Invalid origin." }, { status: 403 });
    const session = await requireAuth();
    requireSuperAdmin(session);

    const body = await req.json();
    const {
      organizationId,
      name,
      code,
      shopCategoryId,
      phone,
      email,
      address,
      currency = "BDT",
      currencySymbol = "৳",
      timezone = "Asia/Dhaka",
      locale = "en-US",
    } = body;

    if (!organizationId || !name || !shopCategoryId) {
      return NextResponse.json(
        { success: false, message: "organizationId, name, and shopCategoryId are required" },
        { status: 400 }
      );
    }

    const adminClient = getServerSupabaseAdmin();

    // 1. Fetch Organization to verify it exists
    const { data: org, error: orgErr } = await adminClient
      .from("organizations")
      .select("id, name")
      .eq("id", organizationId)
      .single();

    if (orgErr || !org) {
      return NextResponse.json(
        { success: false, message: "Target organization not found" },
        { status: 404 }
      );
    }

    // 2. Fetch Category Defaults
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

    const generatedCode = code || `STR-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const defaultModules = categoryData.default_modules || [
      "mod_pos",
      "mod_products",
      "mod_inventory",
      "mod_sales",
      "mod_reports",
    ];

    // 3. Create Store
    const { data: newStore, error: storeErr } = await adminClient
      .from("stores")
      .insert({
        organization_id: organizationId,
        shop_category_id: shopCategoryId,
        name,
        code: generatedCode,
        phone: phone || null,
        email: email || null,
        address: address || null,
        currency: currency || "BDT",
        currency_symbol: currencySymbol || "৳",
        currency_position: "BEFORE",
        timezone: timezone || "Asia/Dhaka",
        locale: locale || "en-US",
        enabled_modules: defaultModules,
        is_active: true,
      })
      .select()
      .single();

    if (storeErr || !newStore) {
      throw new Error(`Failed to create store outlet: ${storeErr?.message}`);
    }

    // 4. Copy Category Attribute Definitions to Store
    const defaultAttributes = categoryData.default_attributes || [];
    if (Array.isArray(defaultAttributes) && defaultAttributes.length > 0) {
      const attributeRows = defaultAttributes.map((attr: any) => ({
        store_id: newStore.id,
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

    // 5. Automatically assign org owner(s) to the new store
    const { data: owners } = await adminClient
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("role", "owner");

    if (owners && owners.length > 0) {
      const storeMemberships = owners.map((o: any) => ({
        store_id: newStore.id,
        user_id: o.user_id,
      }));
      await adminClient.from("store_members").upsert(storeMemberships, { onConflict: "store_id,user_id" });
    }

    return NextResponse.json({
      success: true,
      message: `Store outlet "${name}" (${generatedCode}) added to ${org.name}`,
      store: newStore,
    });
  } catch (err: unknown) {
    const error = err as Error & { status?: number };
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create additional store" },
      { status: error.status || 500 }
    );
  }
}
