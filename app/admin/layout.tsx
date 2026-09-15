export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { getAuthenticatedSession } from "@/lib/auth-guard";
import PlatformShell from "@/components/PlatformShell";
import "./platform.css";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthenticatedSession();
  if (!session) redirect("/");
  if (!session.profile.isSuperAdmin) redirect("/dashboard");
  return <PlatformShell>{children}</PlatformShell>;
}
