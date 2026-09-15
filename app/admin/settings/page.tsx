import { Heading, Fact } from "@/components/PlatformUI";
import ChangePasswordCard from "@/components/ChangePasswordCard";
import { loadPlatform } from "@/lib/platform-data";
export default async function Settings() {
  await loadPlatform();
  return <><Heading title="Platform Settings" detail="Platform account security and service configuration."/><ChangePasswordCard/><section className="panel"><dl className="grid sm:grid-cols-2 gap-4"><Fact label="Authentication">Supabase Auth</Fact><Fact label="Authorization">Server-verified platform profile</Fact><Fact label="Database / Auth connectivity">Responded to this request</Fact><Fact label="Subscription billing ledger">Not configured</Fact><Fact label="Uptime / incident monitoring">Not connected</Fact><Fact label="Theme">Use the theme control in the header</Fact></dl></section></>;
}
