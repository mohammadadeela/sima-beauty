import { useEffect } from "react";
import { Link, Route, Switch, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { BadgePercent, ExternalLink, LayoutDashboard, LogOut, Palette, Package, Settings as Cog, ShoppingCart, Tags, Users } from "lucide-react";
import type { DashboardStats } from "@shared/types";
import { Logo } from "@/components/brand/Logo";
import { Spinner } from "@/components/ui/basics";
import { AuthForm } from "@/pages/store/Account";
import { cx } from "@/lib/format";
import { useLogout, useMe } from "@/lib/queries";
import Dashboard from "./Dashboard";
import Orders from "./Orders";
import Products from "./Products";
import Catalog from "./Catalog";
import Offers from "./Offers";
import People from "./People";
import Storefront from "./Storefront";
import StoreSettings from "./StoreSettings";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart, badge: "pending" as const },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/catalog", label: "Categories and brands", icon: Tags },
  { href: "/admin/offers", label: "Offers and codes", icon: BadgePercent },
  { href: "/admin/people", label: "Customers and reviews", icon: Users, badge: "people" as const },
  { href: "/admin/storefront", label: "Home page", icon: Palette },
  { href: "/admin/settings", label: "Store settings", icon: Cog },
];

/** The admin panel: a sign-in gate, the side menu, and the pages. */
export default function Admin() {
  const { data: me, isLoading } = useMe();
  const logout = useLogout();
  const [location, navigate] = useLocation();
  const stats = useQuery<DashboardStats>({ queryKey: ["/api/admin/stats"], enabled: me?.role === "admin", refetchInterval: 60_000 });

  useEffect(() => { document.title = "Admin | Sima Beauty"; window.scrollTo(0, 0); }, [location]);

  if (isLoading) return <div className="flex h-screen items-center justify-center text-pink"><Spinner /></div>;
  if (!me) return <div className="min-h-screen bg-blush-soft"><AuthForm adminOnly /></div>;
  if (me.role !== "admin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-3xl font-semibold">This area is for store admins</h1>
        <Link href="/" className="btn-pink">Back to the store</Link>
      </div>
    );
  }

  const badges = { pending: stats.data?.pending || 0, people: (stats.data?.unreadMessages || 0) + (stats.data?.pendingReviews || 0) };

  return (
    <div className="min-h-screen bg-[#FBF1F5] lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="z-30 flex flex-col bg-ink text-milk lg:sticky lg:top-0 lg:h-screen">
        <div className="flex items-center justify-between px-5 py-4 lg:py-6">
          <Logo tone="light" className="text-[2rem]" tagline={false} />
          <Link href="/" className="flex items-center gap-1.5 text-[12.5px] text-milk/60 hover:text-milk">View store<ExternalLink size={13} /></Link>
        </div>
        <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible">
          {NAV.map((item) => {
            const active = item.href === "/admin" ? location === "/admin" : location.startsWith(item.href);
            const count = item.badge ? badges[item.badge] : 0;
            return (
              <Link key={item.href} href={item.href} className={cx("flex shrink-0 items-center gap-3 whitespace-nowrap rounded-2xl px-3.5 py-2.5 text-[14.5px] font-medium transition", active ? "bg-pink text-white" : "text-milk/70 hover:bg-white/10 hover:text-milk")}>
                <item.icon size={18} className="shrink-0" />{item.label}
                {count > 0 && <span className={cx("ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold", active ? "bg-white text-pink-deep" : "bg-pink text-white")}>{count}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="hidden border-t border-white/10 p-4 lg:block">
          <p className="truncate text-[13px] text-milk/60">{me.email}</p>
          <button onClick={() => logout.mutate(undefined, { onSuccess: () => navigate("/") })} className="mt-2 flex items-center gap-2 text-[14px] font-medium text-milk/80 hover:text-milk"><LogOut size={16} />Sign out</button>
        </div>
      </aside>
      <main className="min-w-0 p-4 pb-28 sm:p-6 lg:p-9 lg:pb-28">
        <Switch>
          <Route path="/admin" component={Dashboard} />
          <Route path="/admin/orders" component={Orders} />
          <Route path="/admin/products" component={Products} />
          <Route path="/admin/catalog" component={Catalog} />
          <Route path="/admin/offers" component={Offers} />
          <Route path="/admin/people" component={People} />
          <Route path="/admin/storefront" component={Storefront} />
          <Route path="/admin/settings" component={StoreSettings} />
          <Route><p className="text-ink-mute">Page not found. Pick a page from the menu.</p></Route>
        </Switch>
      </main>
    </div>
  );
}
