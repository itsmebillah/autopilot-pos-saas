import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Receipt,
  Settings,
} from "lucide-react";

export default function Sidebar() {

  return (
    <div className="w-64 bg-white/5 border-r border-white/10 p-5 min-h-screen">

      <h1 className="text-2xl font-bold mb-10 text-white">
        Autopilot POS
      </h1>

      <div className="space-y-3">

        <a
          href="/dashboard"
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 text-white"
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </a>

        <a
  href="/dashboard/sales"
  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 text-white"
>
  <ShoppingCart size={20} />
  <span>Sales</span>
</a>

        <a
          href="/dashboard/products"
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 text-white"
        >
          <Package size={20} />
          <span>Products</span>
        </a>

        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 text-white cursor-pointer">
          <Users size={20} />
          <span>Customers</span>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 text-white cursor-pointer">
          <a
  href="/dashboard/orders"
  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 text-white"
>
  <Receipt size={20} />
  <span>Orders</span>
</a>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 text-white cursor-pointer">
          <a
  href="/dashboard/settings"
  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 text-white"
>
  <Settings size={20} />
  <span>Settings</span>
</a>
        </div>

      </div>

    </div>
  );
}