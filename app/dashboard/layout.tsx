export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { getAuthenticatedSession } from "@/lib/auth-guard";
import ShopConsoleBanner from "@/components/ShopConsoleBanner";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthenticatedSession();
  if (!session) redirect("/");
  if (session.profile.isSuperAdmin && !session.shopConsole) redirect("/admin");
  return <>{session.profile.isSuperAdmin && <ShopConsoleBanner name={session.store.name}/>} {children}</>;
}
