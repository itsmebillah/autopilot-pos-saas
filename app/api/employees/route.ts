import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth-guard";
import { getServerSupabaseAdmin } from "@/lib/supabase";

export async function GET(_req: Request) {
  try {
    const session = await requireAuth();
    requireRole(session, ["owner", "manager"]);

    const adminClient = getServerSupabaseAdmin();
    const orgId = session.organization.id;

    // Fetch all members in this organization
    const { data: members, error } = await adminClient
      .from("organization_members")
      .select(`
        id,
        user_id,
        role,
        is_active,
        created_at,
        updated_at,
        user_profiles:user_id (
          id,
          full_name,
          phone,
          avatar_url
        )
      `)
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Fetch store assignments for these users within this organization's stores
    const { data: orgStores } = await adminClient
      .from("stores")
      .select("id, name, code")
      .eq("organization_id", orgId);

    const orgStoreIds = (orgStores || []).map((s: any) => s.id);

    const { data: storeAssignments } = await adminClient
      .from("store_members")
      .select("user_id, store_id, stores(id, name, code)")
      .in("store_id", orgStoreIds);

    // Fetch auth emails from Supabase Auth admin
    const { data: authUsers } = await adminClient.auth.admin.listUsers();
    const emailMap = new Map<string, string>();
    (authUsers?.users || []).forEach((u) => {
      if (u.email) emailMap.set(u.id, u.email);
    });

    const formattedEmployees = (members || []).map((m: any) => {
      const profile = m.user_profiles;
      const userStores = (storeAssignments || [])
        .filter((sa: any) => sa.user_id === m.user_id)
        .map((sa: any) => ({
          id: sa.stores?.id || sa.store_id,
          name: sa.stores?.name || "Assigned Store",
          code: sa.stores?.code || undefined,
        }));

      return {
        id: m.id,
        userId: m.user_id,
        fullName: profile?.full_name || "Staff Member",
        email: emailMap.get(m.user_id) || "user@shop.com",
        phone: profile?.phone || null,
        avatarUrl: profile?.avatar_url || null,
        role: m.role,
        isActive: m.is_active,
        createdAt: m.created_at,
        assignedStores: userStores.length > 0 ? userStores : [session.store],
        primaryStore: userStores[0] || session.store,
      };
    });

    return NextResponse.json({
      success: true,
      employees: formattedEmployees,
      stores: orgStores || [session.store],
    });
  } catch (err: unknown) {
    const error = err as Error & { status?: number };
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch employees" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    requireRole(session, ["owner", "manager"]);

    const body = await req.json();
    const { fullName, email, role, storeId, phone } = body;

    if (!fullName || !email || !role || !storeId) {
      return NextResponse.json(
        { success: false, message: "Full Name, Email, Role, and Store are required" },
        { status: 400 }
      );
    }

    // Role safety: Manager cannot create an Owner
    if (session.role === "manager" && role === "owner") {
      return NextResponse.json(
        { success: false, message: "Forbidden — Managers cannot assign the Owner role" },
        { status: 403 }
      );
    }

    const adminClient = getServerSupabaseAdmin();
    const orgId = session.organization.id;

    // Security Check: Verify target store belongs to the current user's organization
    const { data: validStore, error: storeCheckErr } = await adminClient
      .from("stores")
      .select("id, name")
      .eq("id", storeId)
      .eq("organization_id", orgId)
      .single();

    if (storeCheckErr || !validStore) {
      return NextResponse.json(
        { success: false, message: "Forbidden — Target store does not belong to your organization" },
        { status: 403 }
      );
    }

    // 1. Create or resolve Auth user in Supabase Auth
    let employeeUserId: string;
    const { data: userList } = await adminClient.auth.admin.listUsers();
    const existing = userList?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existing) {
      employeeUserId = existing.id;
    } else {
      const { data: newUser, error: createAuthErr } = await adminClient.auth.admin.createUser({
        email: email.toLowerCase(),
        email_confirm: true,
        user_metadata: { full_name: fullName, phone: phone || null },
      });

      if (createAuthErr || !newUser?.user) {
        throw new Error(`Failed to create employee auth account: ${createAuthErr?.message}`);
      }
      employeeUserId = newUser.user.id;
    }

    // 2. Upsert User Profile (Never super admin)
    await adminClient.from("user_profiles").upsert(
      {
        id: employeeUserId,
        full_name: fullName,
        phone: phone || null,
        is_super_admin: false,
      },
      { onConflict: "id" }
    );

    // 3. Upsert Organization Membership
    const { data: memberData, error: memberErr } = await adminClient
      .from("organization_members")
      .upsert(
        {
          organization_id: orgId,
          user_id: employeeUserId,
          role: role.toLowerCase(),
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,user_id" }
      )
      .select()
      .single();

    if (memberErr || !memberData) {
      throw new Error(`Failed to link employee to organization: ${memberErr?.message}`);
    }

    // 4. Assign to Store
    await adminClient.from("store_members").upsert(
      {
        store_id: storeId,
        user_id: employeeUserId,
      },
      { onConflict: "store_id,user_id" }
    );

    return NextResponse.json({
      success: true,
      message: `Employee "${fullName}" added successfully as ${role}`,
      employeeId: memberData.id,
      userId: employeeUserId,
    });
  } catch (err: unknown) {
    const error = err as Error & { status?: number };
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create employee" },
      { status: error.status || 500 }
    );
  }
}
