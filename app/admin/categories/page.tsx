import { loadPlatform } from "@/lib/platform-data";
import { Heading } from "@/components/PlatformUI";
import CategoryEditor from "@/components/CategoryEditor";
export default async function Categories() {
  const d = await loadPlatform();
  return <><Heading title="Categories" detail="Platform taxonomy and module defaults. Changes apply to newly created shops; existing shop configuration stays intact."/><div className="grid xl:grid-cols-2 gap-4">{d.categories.map(c => <section key={c.id} className="panel space-y-3"><h2 className="font-bold">{c.key}</h2><p className="text-sm text-slate-500">{c.description}</p><CategoryEditor category={c}/><p className="text-xs text-slate-500">{(c.default_attributes || []).length} default attributes</p></section>)}</div></>;
}
