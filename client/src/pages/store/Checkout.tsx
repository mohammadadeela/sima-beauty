import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Banknote, Check, Gift, Lock, Tag, X } from "lucide-react";
import { BagLines, Rewards } from "@/components/layout/BagDrawer";
import { Empty, Spinner } from "@/components/ui/basics";
import { Problem } from "@/components/ui/ErrorBoundary";
import { usePageTitle } from "@/components/layout/StoreLayout";
import { api, queryClient } from "@/lib/api";
import { cx, money } from "@/lib/format";
import { useMe, useQuote, useSettings } from "@/lib/queries";
import { toast, useBag } from "@/lib/store";

const DRAFT_KEY = "sima-checkout";
const EMPTY = { customerName: "", phone: "", email: "", city: "", address: "", notes: "", zoneId: "" };
type Form = typeof EMPTY;

export default function Checkout() {
  usePageTitle("Checkout");
  const settings = useSettings();
  const { data: me } = useMe();
  const [, navigate] = useLocation();
  const { lines, code, setCode, clear } = useBag();
  const [form, setForm] = useState<Form>(() => {
    try { return { ...EMPTY, ...JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}") }; } catch { return EMPTY; }
  });
  const [codeInput, setCodeInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const { data: quote, isFetching, isError, refetch } = useQuote(form.zoneId);

  // Remember what was typed, and pre-fill from the account when signed in.
  useEffect(() => { localStorage.setItem(DRAFT_KEY, JSON.stringify(form)); }, [form]);
  useEffect(() => {
    if (me) setForm((f) => ({ ...f, customerName: f.customerName || me.name, phone: f.phone || me.phone, email: f.email || me.email }));
  }, [me]);

  if (isError && !quote) return <Problem title="We couldn't load your order" text="Check your connection and try again. Your bag is safe." onAction={() => refetch()} />;
  if (!settings || !quote) return <div className="wrap py-20 text-center"><Spinner className="text-pink" /></div>;
  const cur = settings.currency;

  if (!lines.length || !quote.lines.length) {
    return (
      <div className="wrap py-14">
        <Empty title="Your bag is empty" text="Add something you love, then come back to check out."><Link href="/shop" className="btn-pink">Start shopping</Link></Empty>
      </div>
    );
  }
  if (!settings.guestCheckout && !me) {
    return (
      <div className="wrap py-14">
        <Empty title="Sign in to check out" text="Create an account or sign in to place your order."><Link href="/account?next=/checkout" className="btn-pink">Sign in</Link></Empty>
      </div>
    );
  }

  const field = (key: keyof Form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setForm({ ...form, [key]: e.target.value }); if (error?.field === key) setError(null); },
    className: cx("field", error?.field === key && "!border-pink ring-4 ring-pink/10"),
    id: `co-${key}`,
  });

  const applyCode = (e: React.FormEvent) => { e.preventDefault(); if (codeInput.trim()) { setCode(codeInput.trim().toUpperCase()); setCodeInput(""); } };

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.zoneId) { setError({ message: "Please choose a delivery area.", field: "zoneId" }); document.getElementById("co-zone")?.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    setBusy(true); setError(null);
    try {
      const order = await api<{ orderNumber: string }>("/api/orders", { body: { ...form, lines, code: quote.discountCode || undefined, expectedTotal: quote.total } });
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...form, notes: "" }));
      sessionStorage.setItem("sima-last-order", JSON.stringify({ number: order.orderNumber, phone: form.phone }));
      navigate(`/order/${order.orderNumber}`);
      clear();
      queryClient.invalidateQueries();
    } catch (err: any) {
      setError({ message: err.message, field: err.field });
      if (err.status === 409) queryClient.invalidateQueries({ queryKey: ["quote"] });
      toast(err.message, "error");
      if (err.field) document.getElementById(`co-${err.field}`)?.focus();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={placeOrder} className="wrap grid gap-8 py-8 lg:grid-cols-[1fr_440px] lg:gap-12 lg:py-12" noValidate>
      <div>
        <h1 className="text-[2.6rem] font-semibold leading-none sm:text-[3.4rem]">Checkout</h1>
        {!me && <p className="mt-2 text-[14.5px] text-ink-soft">Have an account? <Link href="/account?next=/checkout" className="font-semibold text-pink">Sign in</Link> to fill this in faster.</p>}

        <Step n={1} title="Where should we deliver?">
          <div id="co-zone" className="grid gap-2.5 sm:grid-cols-3">
            {settings.zones.map((z) => {
              const on = form.zoneId === z.id;
              return (
                <button key={z.id} type="button" onClick={() => { setForm({ ...form, zoneId: z.id }); setError(null); }} aria-pressed={on}
                  className={cx("relative rounded-3xl border-2 bg-white p-4 text-left transition", on ? "border-pink shadow-lift" : error?.field === "zoneId" ? "border-pink/50" : "border-transparent hover:border-ink/20")}>
                  {on && <span className="absolute right-3 top-3 flex h-5 w-5 animate-pop items-center justify-center rounded-full bg-pink text-white"><Check size={13} /></span>}
                  <span className="block text-[15.5px] font-semibold">{z.name}</span>
                  <span className="price mt-0.5 block text-[15px] text-pink-deep">{z.price > 0 ? money(z.price, cur) : "Free"}</span>
                  {z.eta && <span className="mt-0.5 block text-[12.5px] text-ink-mute">{z.eta}</span>}
                </button>
              );
            })}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="co-city">City or town</label><input {...field("city")} autoComplete="address-level2" /></div>
            <div><label className="label" htmlFor="co-address">Street, building, nearest landmark</label><input {...field("address")} autoComplete="street-address" /></div>
          </div>
        </Step>

        <Step n={2} title="Who is it for?">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="co-customerName">Full name</label><input {...field("customerName")} autoComplete="name" /></div>
            <div><label className="label" htmlFor="co-phone">Phone number</label><input {...field("phone")} type="tel" inputMode="tel" autoComplete="tel" placeholder="059 000 0000" /></div>
            <div><label className="label" htmlFor="co-email">Email (optional)</label><input {...field("email")} type="email" autoComplete="email" /></div>
            <div><label className="label" htmlFor="co-notes">Note for the courier (optional)</label><input {...field("notes")} /></div>
          </div>
        </Step>

        <Step n={3} title="Payment">
          <div className="flex items-center gap-4 rounded-3xl border-2 border-pink bg-white p-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blush text-pink-deep"><Banknote size={22} /></span>
            <div><p className="text-[15.5px] font-semibold">Cash on delivery</p><p className="text-[13.5px] text-ink-mute">Pay the courier when your order arrives.</p></div>
            <Check size={20} className="ml-auto text-pink" />
          </div>
        </Step>
      </div>

      {/* Order summary */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-blob bg-white p-5 shadow-soft sm:p-6">
          <h2 className="text-2xl font-semibold">Your order</h2>
          <div className="max-h-[320px] overflow-y-auto pr-1"><BagLines quote={quote} currency={cur} /></div>
          <Rewards quote={quote} settings={settings} compact />

          {quote.discountCode ? (
            <p className="mt-4 flex items-center justify-between rounded-2xl bg-blush-soft px-4 py-3 text-[14px] font-semibold text-pink-deep">
              <span className="flex items-center gap-2"><Tag size={15} />{quote.discountCode} applied</span>
              <button type="button" onClick={() => setCode("")} aria-label="Remove code"><X size={16} /></button>
            </p>
          ) : (
            <div className="mt-4">
              <div className="flex gap-2">
                <input value={codeInput} onChange={(e) => setCodeInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && applyCode(e)} placeholder="Discount code" aria-label="Discount code" className="field h-11 uppercase placeholder:normal-case" />
                <button type="button" onClick={applyCode} className="btn-ink btn-sm h-11 shrink-0">Apply</button>
              </div>
              {code && quote.codeError && <p className="mt-1.5 text-[13px] font-medium text-pink-deep">{quote.codeError}</p>}
            </div>
          )}

          <dl className={cx("mt-5 grid gap-2 text-[14.5px] transition-opacity", isFetching && "opacity-60")}>
            <Row label="Subtotal" value={money(quote.subtotal, cur)} />
            {quote.bundleDiscount > 0 && <Row label={`Bundle discount (${settings.bundlePercent}%)`} value={`−${money(quote.bundleDiscount, cur)}`} accent />}
            {quote.codeDiscount > 0 && <Row label={`Code ${quote.discountCode}`} value={`−${money(quote.codeDiscount, cur)}`} accent />}
            <Row label="Delivery" value={!form.zoneId ? "Choose an area" : quote.shipping > 0 ? money(quote.shipping, cur) : "Free"} accent={!!form.zoneId && quote.shipping === 0} />
            {quote.gift && <p className="flex items-center gap-2 text-pink-deep"><Gift size={15} />{quote.gift} included</p>}
            <div className="mt-2 flex items-baseline justify-between border-t border-ink/10 pt-3">
              <dt className="text-[16px] font-semibold">Total</dt><dd className="price text-[1.7rem]">{money(quote.total, cur)}</dd>
            </div>
          </dl>

          {error && <p role="alert" className="mt-3 rounded-2xl bg-pink/10 px-4 py-3 text-[14px] font-medium text-pink-deep">{error.message}</p>}
          <button className="btn-pink mt-4 h-14 w-full text-[16.5px]" disabled={busy}>{busy ? <Spinner /> : <><Lock size={17} />Place order</>}</button>
          <p className="mt-3 text-center text-[12.5px] text-ink-mute">By ordering you agree to our <Link href="/help/policies" className="underline">terms</Link> and <Link href="/help/delivery" className="underline">exchange policy</Link>.</p>
        </div>
      </aside>
    </form>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-4 flex items-center gap-3 text-2xl font-semibold">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink font-sans text-[15px] font-bold text-milk">{n}</span>{title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return <div className="flex justify-between"><dt className="text-ink-soft">{label}</dt><dd className={cx("price", accent && "text-pink-deep")}>{value}</dd></div>;
}
