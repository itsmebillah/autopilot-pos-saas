import Sidebar from "@/components/Sidebar";
import ChangePasswordCard from "@/components/ChangePasswordCard";

export default function AccountPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black flex flex-col lg:flex-row">
      <Sidebar />
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-8 space-y-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Account Settings</h1>
        <ChangePasswordCard />
      </main>
    </div>
  );
}
