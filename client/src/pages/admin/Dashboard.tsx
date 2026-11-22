import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock, MessageSquare, Package, PenLine, Users } from "lucide-react";
import type { DashboardStats } from "@shared/types";
import { dateTime, money, STATUS_LABEL } from "@/lib/format";
import { useSettings } from "@/lib/queries";
import { Badge, Card, PageHead, STATUS_TONE } from "./ui";

export default function Dashboard() {
  const { data } = useQuery<DashboardStats>({ queryKey: ["/api/admin/stats"] });
  const cur = useSettings()?.currency || "₪";
  if (!data) return <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-32" />)}</div>;

  const max = Math.max(...data.daily.map((d) => d.revenue), 1);
  const todo = [
    { n: data.pending, label: data.pending === 1 ? "new order to confirm" : "new orders to confirm", href: "/admin/orders?status=pending", icon: Clock },
    { n: data.pendingReviews, label: data.pendingReviews === 1 ? "review waiting for approval" : "reviews waiting for approval", href: "/admin/people", icon: PenLine },
    { n: data.unreadMessages, label: data.unreadMessages === 1 ? "unread message" : "unread messages", href: "/admin/people", icon: MessageSquare },
    { n: data.lowStock.length, label: data.lowStock.length === 1 ? "shade running low" : "shades running low", href: "/admin/products", icon: Package },
  ].filter((t) => t.n > 0);

  return (
    <>
      <PageHead title="Dashboard" hint="How the store is doing right now." />

      {todo.length > 0 && (
        <div className="mb-5 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {todo.map((t) => (
            <Link key={t.label} href={t.href} className="group flex items-center gap-3 rounded-3xl bg-pink p-4 text-white shadow-lift transition hover:-translate-y-0.5">
              <t.icon size={20} className="shrink-0" />
              <span className="text-[14.5px] font-medium"><b className="price mr-1.5 text-xl">{t.n}</b>{t.label}</span>
              <ArrowRight size={16} className="ml-auto shrink-0 transition-transform group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {([["Today", data.today], ["Last 7 days", data.week], ["Last 30 days", data.month]] as const).map(([label, v]) => (
          <Card key={label}>
            <p className="text-[13.5px] font-semibold text-ink-mute">{label}</p>
            <p className="price mt-1 text-[2.1rem] leading-none">{money(v.revenue, cur)}</p>
            <p className="mt-1.5 text-[13.5px] text-ink-soft">{v.orders} {v.orders === 1 ? "order" : "orders"}</p>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card title="Sales, last 14 days">
          <div className="flex h-44 items-end gap-1.5" role="img" aria-label="Daily sales for the last 14 days">
            {data.daily.map((d) => (
              <div key={d.day} className="group relative flex h-full flex-1 flex-col justify-end">
                <span className="pointer-events-none absolute -top-1 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-2.5 py-1 text-[11.5px] font-semibold text-milk group-hover:block">{money(d.revenue, cur)}, {d.orders} orders</span>
                <div className="w-full rounded-t-lg bg-gradient-to-t from-pink to-pink-glow transition-all group-hover:from-pink-deep" style={{ height: `${Math.max((d.revenue / max) * 100, 2)}%` }} />
                <span className="mt-1.5 text-center text-[10.5px] text-ink-mute">{d.day.slice(8)}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Best sellers, last 30 days">
          {data.topProducts.length ? (
            <ol className="grid gap-2.5">
              {data.topProducts.map((p, i) => (
                <li key={p.name} className="flex items-center gap-3 text-[14px]">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blush text-[12.5px] font-bold text-pink-deep">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                  <span className="text-ink-mute">{p.qty} sold</span>
                </li>
              ))}
            </ol>
          ) : <p className="text-[14px] text-ink-mute">Your best sellers will appear after the first orders.</p>}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card title="Latest orders" action={<Link href="/admin/orders" className="text-[13.5px] font-semibold text-pink">All orders</Link>}>
          {data.recentOrders.length ? (
            <ul className="divide-y divide-ink/[0.07]">
              {data.recentOrders.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders?open=${o.id}`} className="flex items-center gap-3 py-2.5 text-[14px] hover:text-pink">
                    <span className="w-[86px] shrink-0 font-semibold">{o.orderNumber}</span>
                    <span className="min-w-0 flex-1 truncate">{o.customerName}<span className="ml-2 hidden text-ink-mute sm:inline">{dateTime(o.createdAt)}</span></span>
                    <Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge>
                    <span className="price w-16 text-right">{money(o.total, cur)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="text-[14px] text-ink-mute">No orders yet. They will show up here the moment someone checks out.</p>}
        </Card>
        <Card title="Running low" hint="Shades at or below your low-stock number.">
          {data.lowStock.length ? (
            <ul className="grid gap-2 text-[14px]">
              {data.lowStock.map((l, i) => (
                <li key={i} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate">{l.name}{l.shadeName && <span className="text-ink-mute">, {l.shadeName}</span>}</span>
                  <Badge tone={l.stock === 0 ? "grey" : "amber"}>{l.stock === 0 ? "Sold out" : `${l.stock} left`}</Badge>
                </li>
              ))}
            </ul>
          ) : <p className="text-[14px] text-ink-mute">Everything is well stocked.</p>}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <Card><p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-mute"><Package size={15} />Products on the store</p><p className="price mt-1 text-3xl">{data.products}</p></Card>
        <Card><p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink-mute"><Users size={15} />Customer accounts</p><p className="price mt-1 text-3xl">{data.customers}</p></Card>
      </div>
    </>
  );
}
