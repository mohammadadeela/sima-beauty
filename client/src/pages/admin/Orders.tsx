import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Phone, Printer, Search } from "lucide-react";
import { ORDER_STATUSES, type Order, type OrderStatus } from "@shared/types";
import { ProductVisual } from "@/components/product/ProductCard";
import { Drawer } from "@/components/ui/basics";
import { api } from "@/lib/api";
import { cx, dateTime, money, STATUS_LABEL, whatsappLink } from "@/lib/format";
import { useSettings } from "@/lib/queries";
import { Badge, PageHead, run, STATUS_TONE, Table } from "./ui";

export default function Orders() {
  const search = new URLSearchParams(useSearch());
  const [status, setStatus] = useState(search.get("status") || "");
  const [text, setText] = useState("");
  const [openId, setOpenId] = useState<number | null>(Number(search.get("open")) || null);
  const cur = useSettings()?.currency || "₪";
  const { data: orders } = useQuery<Order[]>({ queryKey: [`/api/admin/orders?status=${status}&q=${encodeURIComponent(text)}`], refetchInterval: 45_000 });
  const open = orders?.find((o) => o.id === openId) || null;

  return (
    <>
      <PageHead title="Orders" hint="Click an order to see it and change its status." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button onClick={() => setStatus("")} className={cx("chip", !status && "chip-on")}>All</button>
        {ORDER_STATUSES.map((s) => <button key={s} onClick={() => setStatus(s)} className={cx("chip", status === s && "chip-on")}>{STATUS_LABEL[s]}</button>)}
        <div className="relative ml-auto w-full sm:w-64">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-mute" />
          <input className="field h-10 pl-10" placeholder="Order number, name or phone" value={text} onChange={(e) => setText(e.target.value)} aria-label="Search orders" />
        </div>
      </div>
      <Table head={["Order", "Customer", "Area", "Items", "Total", "Status", "Placed"]} empty={orders && !orders.length}>
        {orders?.map((o) => (
          <tr key={o.id} onClick={() => setOpenId(o.id)} className="cursor-pointer">
            <td className="font-semibold">{o.orderNumber}</td>
            <td>{o.customerName}<span className="block text-[12.5px] text-ink-mute">{o.phone}</span></td>
            <td>{o.zoneName}<span className="block text-[12.5px] text-ink-mute">{o.city}</span></td>
            <td>{o.items.reduce((n, i) => n + i.qty, 0)}</td>
            <td className="price">{money(o.total, cur)}</td>
            <td><Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge></td>
            <td className="whitespace-nowrap text-ink-mute">{dateTime(o.createdAt)}</td>
          </tr>
        ))}
      </Table>
      <Drawer open={!!open} onClose={() => setOpenId(null)} title={open ? `Order ${open.orderNumber}` : ""} wide>
        {open && <OrderDetails key={open.id} order={open} currency={cur} />}
      </Drawer>
    </>
  );
}

function OrderDetails({ order, currency }: { order: Order; currency: string }) {
  const [note, setNote] = useState(order.adminNote);
  useEffect(() => setNote(order.adminNote), [order.adminNote]);
  const settings = useSettings();
  const update = (body: { status?: OrderStatus; adminNote?: string }, done: string) => run(() => api(`/api/admin/orders/${order.id}`, { method: "PATCH", body }), done);
  const hello = `Hi ${order.customerName.split(" ")[0]}, this is ${settings?.storeName || "Sima Beauty"} about your order ${order.orderNumber}.`;

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <p className="label">Status</p>
      <div className="flex flex-wrap gap-2">
        {ORDER_STATUSES.map((s) => (
          <button key={s} onClick={() => order.status !== s && update({ status: s }, `Order marked as ${STATUS_LABEL[s].toLowerCase()}`)}
            className={cx("chip", order.status === s && (s === "cancelled" ? "!border-ink/40 !bg-ink/10 !text-ink" : "!border-pink !bg-pink !text-white"))}>
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[12.5px] text-ink-mute">Cancelling puts the items back in stock automatically.</p>

      <div className="mt-5 rounded-3xl bg-blush-soft p-4 text-[14.5px] leading-relaxed">
        <p className="text-[16px] font-semibold">{order.customerName}</p>
        <p>{order.phone}{order.email && `, ${order.email}`}</p>
        <p>{[order.address, order.city, order.zoneName].filter(Boolean).join(", ")}</p>
        {order.notes && <p className="mt-1 italic text-ink-soft">Customer note: "{order.notes}"</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={whatsappLink(order.phone, hello)} target="_blank" rel="noreferrer" className="btn btn-sm bg-[#1FA855] text-white"><MessageCircle size={15} />WhatsApp</a>
          <a href={`tel:${order.phone}`} className="btn-line btn-sm"><Phone size={15} />Call</a>
          <button onClick={() => window.print()} className="btn-line btn-sm"><Printer size={15} />Print</button>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-ink/10">
        {order.items.map((it) => (
          <li key={it.id} className="flex items-center gap-3 py-3">
            <ProductVisual image={it.image} art={it.art} color={it.shadeHex} className="h-14 w-12 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14.5px] font-medium">{it.name}</p>
              <p className="flex items-center gap-1.5 text-[13px] text-ink-mute">{it.shadeHex && <span className="h-3 w-3 rounded-full border border-black/10" style={{ background: it.shadeHex }} />}{[it.brandName, it.shadeName].filter(Boolean).join(", ")}</p>
            </div>
            <p className="price text-[14.5px]">{it.qty} × {money(it.price, currency)}</p>
          </li>
        ))}
      </ul>

      <dl className="mt-2 grid gap-1.5 border-t border-ink/10 pt-3 text-[14.5px]">
        <Line label="Subtotal" value={money(order.subtotal, currency)} />
        {order.bundleDiscount > 0 && <Line label="Bundle discount" value={`−${money(order.bundleDiscount, currency)}`} />}
        {order.codeDiscount > 0 && <Line label={`Code ${order.discountCode}`} value={`−${money(order.codeDiscount, currency)}`} />}
        <Line label="Delivery" value={order.shipping > 0 ? money(order.shipping, currency) : "Free"} />
        {order.gift && <Line label="Free gift to pack" value={order.gift} />}
        <div className="flex items-baseline justify-between pt-1"><dt className="font-semibold">To collect in cash</dt><dd className="price text-2xl">{money(order.total, currency)}</dd></div>
      </dl>

      <label className="mt-5 block">
        <span className="label">Private note (only admins see this)</span>
        <textarea className="field" value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      {note !== order.adminNote && <button onClick={() => update({ adminNote: note }, "Note saved")} className="btn-ink btn-sm mt-2">Save note</button>}
      <p className="mt-4 text-[12.5px] text-ink-mute">Placed {dateTime(order.createdAt)}</p>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><dt className="text-ink-soft">{label}</dt><dd className="price">{value}</dd></div>;
}
