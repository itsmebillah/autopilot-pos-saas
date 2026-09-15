import PlatformUsers from "@/components/PlatformUsers";
export default async function Users({ searchParams }: { searchParams: Promise<{ shop?: string; organization?: string }> }) {
  const p = await searchParams;
  return <PlatformUsers shopId={p.shop} organizationId={p.organization}/>;
}
