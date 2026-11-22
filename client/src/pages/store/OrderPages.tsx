import { useEffect, useState } from "react";
import { Link, useParams, useSearch } from "wouter";
import { motion } from "framer-motion";
import { Check, MessageCircle, PackageSearch } from "lucide-react";
import type { Order } from "@shared/types";
import { ORDER_STATUSES } from "@shared/types";
import { ProductVisual } from "@/components/product/ProductCard";
import { Empty, Spinner } from "@/components/ui/basics";
import { usePageTitle } from "@/components/layout/StoreLayout";
import { api } from "@/lib/api";
import { cx, dateTime, money, STATUS_LABEL, whatsappLink } from "@/lib/format";
import { useSettings } from "@/lib/queries";

/** Status steps plus the items and totals of one order. */
export function OrderView({ order, currency }: { order: Order; currency: string }) {
  const steps = ORDER_STATUSES.filter((s) => s !== "cancelled");
  const at = steps.indexOf(order.status as any);
  return (
    <div className="rounded-blob bg-white p-5 shadow-soft sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-2xl font-semibold">Order {order.orderNumber}</h2>
        <p className="text-[13.5px] text-ink-mute">{dateTime(order.createdAt)}</p>
      </div>

      {order.status === "cancelled" ? (
        <p className="mt-4 rounded-2xl bg-pink/10 px-4 py-3 text-[14.5px] font-semibold text-pink-deep">This order was cancelled.</p>
      ) : (
        <ol className="mt-6 grid grid-cols-4">
          {steps.map((s, i) => (
            <li key={s} className="relative flex flex-col items-center text-center">
              {i > 0 && <span className={cx("absolute right-1/2 top-4 h-[3px] w-full -translate-y-1/2", i <= at ? "bg-pink" : "bg-blush")} />}
              <span className={cx("relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold", i <= at ? "bg-pink text-white" : "bg-blush text-ink-mute", i === at && "ring-4 ring-pink/20")}>
                {i < at ? <Check size={15} /> : i + 1}
              </span>
              <span className={cx("mt-2 text-[12.5px] font-medium sm:text-[13.5px]", i <= at ? "text-ink" : "text-ink-mute")}>{STATUS_LABEL[s]}</span>
            </li>
          ))}
        </ol>
      )}

      <ul className="mt-6 divide-y divide-ink/10 border-y border-ink/10">
        {order.items.map((it) => (
          <li key={it.id} className="flex items-center gap-3.5 py-3">
            <ProductVisual image={it.image} art={it.art} color={it.shadeHex} className="h-16 w-14 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14.5px] font-medium">{it.name}</p>
              <p className="text-[13px] text-ink-mute">{[it.brandName, it.shadeName].filter(Boolean).join(", ")}</p>
            </div>
            <p className="price text-[14.5px]">{it.qty} × {money(it.price, currency)}</p>
          </li>
        ))}
      </ul>

      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        <div className="text-[14px] leading-relaxed text-ink-soft">
          <p className="font-semibold text-ink">{order.customerName}</p>
          <p>{order.phone}</p>
          <p>{[order.address, order.city, order.zoneName].filter(Boolean).join(", ")}</p>
          {order.notes && <p className="mt-1 italic">"{order.notes}"</p>}
        </div>
        <dl className="grid content-start gap-1.5 text-[14.5px]">
          <div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd className="price">{money(order.subtotal, currency)}</dd></div>
          {order.bundleDiscount > 0 && <div className="flex justify-between text-pink-deep"><dt>Bundle discount</dt><dd className="price">−{money(order.bundleDiscount, currency)}</dd></div>}
          {order.codeDiscount > 0 && <div className="flex justify-between text-pink-deep"><dt>Code {order.discountCode}</dt><dd className="price">−{money(order.codeDiscount, currency)}</dd></div>}
          <div className="flex justify-between"><dt className="text-ink-soft">Delivery</dt><dd className="price">{order.shipping > 0 ? money(order.shipping, currency) : "Free"}</dd></div>
          {order.gift && <div className="flex justify-between text-pink-deep"><dt>{order.gift}</dt><dd>Included</dd></div>}
          <div className="mt-1 flex items-baseline justify-between border-t border-ink/10 pt-2"><dt className="font-semibold">Total, cash on delivery</dt><dd className="price text-xl">{money(order.total, currency)}</dd></div>
        </dl>
      </div>
    </div>
  );
}

/** Shown right after an order is placed. */
export function OrderDone() {
  const { number = "" } = useParams<{ number: string }>();
  usePageTitle("Order confirmed");
  const settings = useSettings();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    try {
      const last = JSON.parse(sessionStorage.getItem("sima-last-order") || "{}");
      if (last.number === number) api<Order>(`/api/orders/track?number=${encodeURIComponent(number)}&phone=${encodeURIComponent(last.phone)}`).then(setOrder).catch(() => {});
    } catch { /* the summary is optional */ }
  }, [number]);

  const drops = ["#E8257D", "#FF6BAA", "#C9A56B", "#FFA6C9", "#B3125C", "#FFD0E2"];
  return (
    <div className="relative overflow-hidden">
      {/* a burst of colour dots */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden>
        {[...Array(28)].map((_, i) => (
          <motion.span key={i} className="absolute left-1/2 top-28 rounded-full" style={{ width: 8 + (i % 4) * 5, height: 8 + (i % 4) * 5, background: drops[i % drops.length] }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
            animate={{ x: Math.cos(i * 2.4) * (120 + (i % 5) * 70), y: Math.sin(i * 2.4) * (60 + (i % 3) * 50) + 60, opacity: [0, 1, 1, 0], scale: 1 }}
            transition={{ duration: 1.8, delay: 0.15 + (i % 7) * 0.04, ease: "easeOut" }} />
        ))}
      </div>
      <div className="wrap relative max-w-3xl py-12 text-center sm:py-16">
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 240, damping: 14 }} className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-pink text-white shadow-lift"><Check size={38} strokeWidth={2.6} /></motion.span>
        <h1 className="mt-6 text-[2.8rem] font-semibold italic leading-none sm:text-[4rem]">Thank you.</h1>
        <p className="mx-auto mt-3 max-w-md text-[16px] text-ink-soft">Your order <b className="text-ink">{number}</b> is in. We will contact you to confirm it, and you pay cash when it arrives.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {settings?.whatsapp && (
            <a href={whatsappLink(settings.whatsapp, `Hi Sima Beauty, I just placed order ${number}.`)} target="_blank" rel="noreferrer" className="btn bg-[#1FA855] text-white hover:brightness-95"><MessageCircle size={18} />Confirm on WhatsApp</a>
          )}
          <Link href="/shop" className="btn-ink">Keep shopping</Link>
          <Link href="/track" className="btn-line">Track order</Link>
        </div>
        {order && <div className="mt-10 text-left"><OrderView order={order} currency={settings?.currency || "₪"} /></div>}
      </div>
    </div>
  );
}

export function Track() {
  usePageTitle("Track my order");
  const settings = useSettings();
  const search = new URLSearchParams(useSearch());
  const [number, setNumber] = useState(search.get("number") || "");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(""); setOrder(null);
    try {
      setOrder(await api<Order>(`/api/orders/track?number=${encodeURIComponent(number)}&phone=${encodeURIComponent(phone)}`));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wrap max-w-3xl py-10 sm:py-14">
      <h1 className="text-[2.6rem] font-semibold leading-none sm:text-[3.6rem]">Track my order</h1>
      <form onSubmit={submit} className="mt-6 grid gap-3 rounded-blob bg-blush-soft p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-6">
        <div><label className="label" htmlFor="tr-number">Order number</label><input id="tr-number" className="field uppercase placeholder:normal-case" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="SB-10001" required /></div>
        <div><label className="label" htmlFor="tr-phone">Phone used for the order</label><input id="tr-phone" className="field" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="059 000 0000" required /></div>
        <button className="btn-pink" disabled={busy}>{busy ? <Spinner /> : <><PackageSearch size={18} />Track</>}</button>
      </form>
      {error && <div className="mt-6"><Empty title="Order not found" text={error} /></div>}
      {order && <div className="mt-6"><OrderView order={order} currency={settings?.currency || "₪"} /></div>}
    </div>
  );
}
