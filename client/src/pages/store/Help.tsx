import { useState } from "react";
import { Link, useParams } from "wouter";
import { Check, Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import type { Settings } from "@shared/types";
import { Accordion, Spinner } from "@/components/ui/basics";
import { usePageTitle } from "@/components/layout/StoreLayout";
import { api } from "@/lib/api";
import { cx, money, whatsappLink } from "@/lib/format";
import { useSettings } from "@/lib/queries";
import { toast } from "@/lib/store";

const TABS = [
  ["delivery", "Delivery and exchange"], ["faq", "Questions"], ["contact", "Contact us"],
  ["about", "About us"], ["privacy", "Privacy"], ["terms", "Terms"],
] as const;

/** One page for all the store information, switched by tabs. */
export default function Help() {
  const { tab = "delivery" } = useParams<{ tab?: string }>();
  const settings = useSettings();
  const current = TABS.find(([id]) => id === tab) || TABS[0];
  usePageTitle(current[1]);
  if (!settings) return null;

  return (
    <div className="pb-16">
      <div className="bg-blush-soft">
        <div className="wrap py-8 sm:py-11">
          <h1 className="text-[2.6rem] font-semibold leading-none sm:text-[3.8rem]">{current[1]}</h1>
          <div className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            {TABS.map(([id, label]) => <Link key={id} href={`/help/${id}`} className={cx("chip", id === current[0] && "chip-on")}>{label}</Link>)}
          </div>
        </div>
      </div>
      <div className="wrap mt-8 max-w-4xl">
        {current[0] === "delivery" && <Delivery s={settings} />}
        {current[0] === "faq" && <div className="rounded-blob bg-white px-5 shadow-soft sm:px-7">{settings.faqs.map((f, i) => <Accordion key={i} title={f.q} defaultOpen={i === 0}>{f.a}</Accordion>)}</div>}
        {current[0] === "contact" && <Contact s={settings} />}
        {current[0] === "about" && <p className="whitespace-pre-line rounded-blob bg-white p-6 text-[16px] leading-relaxed text-ink-soft shadow-soft sm:p-8">{settings.about}</p>}
        {current[0] === "privacy" && <Lines items={settings.privacyPolicy} />}
        {current[0] === "terms" && <Lines items={settings.terms} />}
      </div>
    </div>
  );
}

function Lines({ items, title }: { items: string[]; title?: string }) {
  return (
    <section className="rounded-blob bg-white p-5 shadow-soft sm:p-7">
      {title && <h2 className="mb-4 text-2xl font-semibold">{title}</h2>}
      <ul className="grid gap-3.5">
        {items.map((line, i) => (
          <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-ink-soft">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blush text-pink-deep"><Check size={12} strokeWidth={3} /></span>{line}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Delivery({ s }: { s: Settings }) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-2.5 sm:grid-cols-3">
        {s.zones.map((z) => (
          <div key={z.id} className="rounded-3xl bg-white p-5 text-center shadow-soft">
            <MapPin size={20} className="mx-auto text-pink" />
            <p className="mt-2 text-[15.5px] font-semibold">{z.name}</p>
            <p className="price text-2xl text-pink-deep">{z.price > 0 ? money(z.price, s.currency) : "Free"}</p>
            {z.eta && <p className="text-[13px] text-ink-mute">{z.eta}</p>}
          </div>
        ))}
      </div>
      {s.freeShippingOn && <p className="rounded-3xl bg-pink px-5 py-4 text-center font-display text-xl font-semibold italic text-white">Free delivery on orders over {money(s.freeShippingOver, s.currency)}</p>}
      <Lines title="Delivery" items={s.shippingPolicy} />
      <Lines title="Returns and exchange" items={s.exchangePolicy} />
      {s.policyNote && <p className="rounded-3xl bg-blush-soft px-5 py-4 text-[14.5px] text-ink-soft">{s.policyNote}</p>}
    </div>
  );
}

function Contact({ s }: { s: Settings }) {
  const [form, setForm] = useState({ name: "", contact: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/contact", { body: form });
      setSent(true);
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const ways = [
    s.whatsapp && { icon: MessageCircle, label: "WhatsApp", value: s.whatsapp, href: whatsappLink(s.whatsapp) },
    s.phone && { icon: Phone, label: "Phone", value: s.phone, href: `tel:${s.phone}` },
    s.email && { icon: Mail, label: "Email", value: s.email, href: `mailto:${s.email}` },
    s.address && { icon: MapPin, label: "Address", value: s.address },
    s.hours && { icon: Clock, label: "Hours", value: s.hours },
  ].filter(Boolean) as { icon: typeof Phone; label: string; value: string; href?: string }[];

  return (
    <div className="grid gap-5 md:grid-cols-[1fr_1.2fr]">
      <ul className="grid content-start gap-2.5">
        {ways.map((w) => (
          <li key={w.label} className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-soft">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blush text-pink-deep"><w.icon size={19} /></span>
            <span><span className="block text-[12.5px] text-ink-mute">{w.label}</span>{w.href ? <a href={w.href} className="text-[15px] font-semibold hover:text-pink">{w.value}</a> : <span className="text-[15px] font-semibold">{w.value}</span>}</span>
          </li>
        ))}
      </ul>
      {sent ? (
        <div className="flex flex-col items-center justify-center rounded-blob bg-blush-soft p-8 text-center">
          <span className="flex h-14 w-14 animate-pop items-center justify-center rounded-full bg-pink text-white"><Check size={26} /></span>
          <h2 className="mt-4 text-2xl font-semibold">Message sent</h2>
          <p className="mt-1 text-[15px] text-ink-soft">We will get back to you soon.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-4 rounded-blob bg-white p-5 shadow-soft sm:p-7">
          <div><label className="label" htmlFor="ct-name">Your name</label><input id="ct-name" className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div><label className="label" htmlFor="ct-contact">Phone or email</label><input id="ct-contact" className="field" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} required /></div>
          <div><label className="label" htmlFor="ct-msg">How can we help?</label><textarea id="ct-msg" className="field" rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required /></div>
          <button className="btn-pink" disabled={busy}>{busy ? <Spinner /> : "Send message"}</button>
        </form>
      )}
    </div>
  );
}
