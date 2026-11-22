import { Plus, Trash2 } from "lucide-react";
import type { Faq, Zone } from "@shared/types";
import { Card, Field, IconBtn, ListEditor, NumberInput, PageHead, Toggle, useSettingsForm } from "./ui";

/** Delivery, contact details and the text of the help pages. */
export default function StoreSettings() {
  const { s, set, bar } = useSettingsForm();
  if (!s) return null;
  const setZone = (i: number, patch: Partial<Zone>) => set("zones", s.zones.map((z, n) => (n === i ? { ...z, ...patch } : z)));
  const setFaq = (i: number, patch: Partial<Faq>) => set("faqs", s.faqs.map((f, n) => (n === i ? { ...f, ...patch } : f)));
  const text = (key: "whatsapp" | "phone" | "email" | "address" | "hours" | "instagram" | "facebook" | "tiktok", placeholder?: string) => (
    <input className="field" value={s[key]} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} />
  );

  return (
    <>
      <PageHead title="Store settings" hint="Delivery prices, your contact details, and the store policies." />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Delivery areas and prices" hint="Shoppers pick one of these at checkout."
          action={<button onClick={() => set("zones", [...s.zones, { id: `zone${Date.now()}`, name: "New area", price: 20, eta: "" }])} className="btn-pink btn-sm"><Plus size={15} />Add area</button>}>
          <div className="grid gap-2">
            <div className="grid grid-cols-[1fr_96px_1fr_36px] gap-2 text-[12px] font-semibold text-ink-mute"><span>Area</span><span>Price ({s.currency})</span><span>Delivery time</span><span /></div>
            {s.zones.map((z, i) => (
              <div key={z.id} className="grid grid-cols-[1fr_96px_1fr_36px] items-center gap-2">
                <input className="field h-11 px-3" value={z.name} onChange={(e) => setZone(i, { name: e.target.value })} aria-label="Area name" />
                <input type="number" min={0} className="field h-11 px-3" value={z.price} onChange={(e) => setZone(i, { price: Number(e.target.value) })} aria-label="Price" />
                <input className="field h-11 px-3" value={z.eta} onChange={(e) => setZone(i, { eta: e.target.value })} placeholder="1–3 business days" aria-label="Delivery time" />
                <IconBtn label="Remove area" danger disabled={s.zones.length === 1} onClick={() => set("zones", s.zones.filter((_, n) => n !== i))}><Trash2 size={15} /></IconBtn>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-ink/10 pt-4">
            <Toggle on={s.guestCheckout} onChange={(v) => set("guestCheckout", v)} label="Let people order without an account" hint="Recommended. Fewer steps means more orders." />
          </div>
        </Card>

        <Card title="Contact details" hint="Shown in the footer, the Contact page and the WhatsApp button. Empty fields stay hidden.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="WhatsApp number" hint="With country code, for example 970590000000">{text("whatsapp")}</Field>
            <Field label="Phone">{text("phone")}</Field>
            <Field label="Email">{text("email")}</Field>
            <Field label="Opening hours">{text("hours")}</Field>
            <Field label="Address" className="sm:col-span-2">{text("address")}</Field>
            <Field label="Instagram link">{text("instagram", "https://instagram.com/…")}</Field>
            <Field label="Facebook link">{text("facebook", "https://facebook.com/…")}</Field>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ink/10 pt-4">
            <Field label="Store name"><input className="field" value={s.storeName} onChange={(e) => set("storeName", e.target.value)} /></Field>
            <Field label="Currency symbol"><input className="field" value={s.currency} onChange={(e) => set("currency", e.target.value)} maxLength={4} /></Field>
          </div>
        </Card>

        <Card title="Delivery policy" hint="One point per line. Shown on the Delivery and exchange page."><ListEditor multiline items={s.shippingPolicy} onChange={(v) => set("shippingPolicy", v)} addLabel="Add point" /></Card>
        <Card title="Return and exchange policy" hint="Also shown on every product page.">
          <ListEditor multiline items={s.exchangePolicy} onChange={(v) => set("exchangePolicy", v)} addLabel="Add point" />
          <Field label="Note at the bottom" className="mt-4"><input className="field" value={s.policyNote} onChange={(e) => set("policyNote", e.target.value)} /></Field>
        </Card>

        <Card title="Questions and answers" className="xl:col-span-2" action={<button onClick={() => set("faqs", [...s.faqs, { q: "", a: "" }])} className="btn-pink btn-sm"><Plus size={15} />Add question</button>}>
          <div className="grid gap-3 lg:grid-cols-2">
            {s.faqs.map((f, i) => (
              <div key={i} className="grid gap-2 rounded-3xl bg-blush-soft p-3">
                <div className="flex gap-1.5">
                  <input className="field h-11 font-semibold" value={f.q} onChange={(e) => setFaq(i, { q: e.target.value })} placeholder="Question" aria-label="Question" />
                  <IconBtn label="Remove question" danger onClick={() => set("faqs", s.faqs.filter((_, n) => n !== i))}><Trash2 size={15} /></IconBtn>
                </div>
                <textarea className="field min-h-[70px]" value={f.a} onChange={(e) => setFaq(i, { a: e.target.value })} placeholder="Answer" aria-label="Answer" />
              </div>
            ))}
          </div>
        </Card>

        <Card title="About us"><textarea className="field min-h-[150px]" value={s.about} onChange={(e) => set("about", e.target.value)} /></Card>
        <Card title="Privacy policy"><ListEditor multiline items={s.privacyPolicy} onChange={(v) => set("privacyPolicy", v)} addLabel="Add point" /></Card>
        <Card title="Terms" className="xl:col-span-2"><ListEditor multiline items={s.terms} onChange={(v) => set("terms", v)} addLabel="Add point" /></Card>
      </div>
      {bar}
    </>
  );
}
