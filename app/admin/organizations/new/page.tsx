import { loadPlatform } from "@/lib/platform-data";
import { Heading } from "@/components/PlatformUI";
import OnboardingForm from "@/components/OnboardingForm";
export default async function NewBusiness() {
  const d = await loadPlatform();
  return <><Heading title="Onboard a business" detail="Create a tenant business, its first shop and its owner membership."/><OnboardingForm categories={d.categories}/></>;
}
