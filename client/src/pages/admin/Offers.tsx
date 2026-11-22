import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { DiscountCode } from "@shared/types";
import { Modal } from "@/components/ui/basics";
import { api } from "@/lib/api";
import { dateOnly, money } from "@/lib/format";
import { Badge, Card, confirmDelete, Field, IconBtn, NumberInput, PageHead, run, Table, Toggle, useSettingsForm } from "./ui";

type CodeDraft = Omit<DiscountCode, "id" | "usedCount"> & { id?: number };
const newCode = (): CodeDraft => ({ code: "", type: "percent", value: 10, minSubtotal: 0, maxUses: null, expiresAt: null, isActive: true });

/** <input type="datetime-local"> wants local time without a timezone. */
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : "");

export default function Offers() {
  const { s, set, bar } = useSettingsForm();
  const { data: codes } = useQuery<DiscountCode[]>({ queryKey: ["/api/admin/codes"] });
  const [draft, setDraft] = useState<CodeDraft | null>(null);
  if (!s) return null;
  const cur = s.currency;

  const saveCode = async () => {
    if (!draft) return;
    const { id, ...body } = draft;
    if (await run(() => api(id ? `/api/admin/codes/${id}` : "/api/admin/codes", { method: id ? "PUT" : "POST", body }), "Code saved")) setDraft(null);
  };

  return (
    <>
      <PageHead title="Offers and codes" hint="Everything here is designed to make bags bigger. Switch each one on or off." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Free delivery" hint="A progress bar in the bag pushes shoppers to reach it.">
          <Toggle on={s.freeShippingOn} onChange={(v) => set("freeShippingOn", v)} label="Offer free delivery" />
          <Field label="On orders over" className="mt-4 max-w-[200px]"><NumberInput value={s.freeShippingOver} onChange={(n) => set("freeShippingOver", n)} prefix={cur} /></Field>
        </Card>

        <Card title="Bundle discount" hint='"Buy any 3, save 10%". Applied automatically in the bag.'>
          <Toggle on={s.bundleOn} onChange={(v) => set("bundleOn", v)} label="Offer a bundle discount" />
          <div className="mt-4 grid max-w-sm grid-cols-2 gap-3">
            <Field label="Items needed"><NumberInput value={s.bundleQty} onChange={(n) => set("bundleQty", Math.round(n))} min={2} /></Field>
            <Field label="Discount %"><NumberInput value={s.bundlePercent} onChange={(n) => set("bundlePercent", n)} /></Field>
          </div>
        </Card>

        <Card title="Free gift" hint="You see it on the order so you remember to pack it.">
          <Toggle on={s.giftOn} onChange={(v) => set("giftOn", v)} label="Give a free gift" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field label="On orders over"><NumberInput value={s.giftOver} onChange={(n) => set("giftOver", n)} prefix={cur} /></Field>
            <Field label="Gift name"><input className="field" value={s.giftText} onChange={(e) => set("giftText", e.target.value)} placeholder="Free mini gift" /></Field>
          </div>
        </Card>

        <Card title="Deal of the day" hint='Shows the banner with a countdown. Pick the products by switching on "Deal" in Products.'>
          <Toggle on={s.dealOn} onChange={(v) => set("dealOn", v)} label="Show the deal banner" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field label="Banner title"><input className="field" value={s.dealTitle} onChange={(e) => set("dealTitle", e.target.value)} /></Field>
            <Field label="Ends at" hint="The banner hides itself when time runs out. Leave empty for no countdown.">
              <input type="datetime-local" className="field" value={toLocalInput(s.dealEndsAt || null)} onChange={(e) => set("dealEndsAt", fromLocalInput(e.target.value))} />
            </Field>
          </div>
        </Card>

        <Card title="Welcome offer" hint="A pop-up for first-time visitors: they leave a WhatsApp number or email and get a code.">
          <Toggle on={s.welcomeOn} onChange={(v) => set("welcomeOn", v)} label="Show the welcome pop-up" />
          <div className="mt-4 grid gap-3">
            <Field label="Headline"><input className="field" value={s.welcomeTitle} onChange={(e) => set("welcomeTitle", e.target.value)} /></Field>
            <Field label="Text"><input className="field" value={s.welcomeText} onChange={(e) => set("welcomeText", e.target.value)} /></Field>
            <Field label="Code they receive" hint="Must match one of the discount codes below.">
              <select className="field" value={s.welcomeCode} onChange={(e) => set("welcomeCode", e.target.value)}>
                {!codes?.some((c) => c.code === s.welcomeCode) && <option value={s.welcomeCode}>{s.welcomeCode || "Choose a code"}</option>}
                {codes?.map((c) => <option key={c.id} value={c.code}>{c.code}</option>)}
              </select>
            </Field>
          </div>
        </Card>

        <Card title="Low stock nudge" hint='Shows "Only 2 left in this shade" on the product page.'>
          <Toggle on={s.lowStockOn} onChange={(v) => set("lowStockOn", v)} label="Show low stock on products" />
          <Field label="Show when stock is at or below" className="mt-4 max-w-[220px]"><NumberInput value={s.lowStockAt} onChange={(n) => set("lowStockAt", Math.round(n))} min={1} /></Field>
        </Card>
      </div>

      <div className="mb-3 mt-8 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Discount codes</h2>
        <button onClick={() => setDraft(newCode())} className="btn-pink btn-sm"><Plus size={15} />New code</button>
      </div>
      <Table head={["Code", "Discount", "Minimum order", "Used", "Expires", "Status", ""]} empty={codes && !codes.length}>
        {codes?.map((c) => {
          const expired = !!c.expiresAt && new Date(c.expiresAt) < new Date();
          return (
            <tr key={c.id}>
              <td className="font-bold tracking-wide">{c.code}</td>
              <td className="price">{c.type === "percent" ? `${c.value}%` : money(c.value, cur)}</td>
              <td>{c.minSubtotal > 0 ? money(c.minSubtotal, cur) : "None"}</td>
              <td>{c.usedCount}{c.maxUses != null && ` of ${c.maxUses}`}</td>
              <td>{c.expiresAt ? dateOnly(c.expiresAt) : "Never"}</td>
              <td><Badge tone={!c.isActive || expired ? "grey" : "green"}>{expired ? "Expired" : c.isActive ? "Active" : "Off"}</Badge></td>
              <td>
                <div className="flex justify-end">
                  <IconBtn label="Edit" onClick={() => setDraft(c)}><Pencil size={16} /></IconBtn>
                  <IconBtn label="Delete" danger onClick={() => confirmDelete(`the code ${c.code}`) && run(() => api(`/api/admin/codes/${c.id}`, { method: "DELETE" }), "Code deleted")}><Trash2 size={16} /></IconBtn>
                </div>
              </td>
            </tr>
          );
        })}
      </Table>

      <Modal open={!!draft} onClose={() => setDraft(null)}>
        {draft && (
          <div className="grid gap-4 p-6 sm:p-7">
            <h2 className="text-2xl font-semibold">{draft.id ? "Edit code" : "New discount code"}</h2>
            <Field label="Code" hint="Letters and numbers, no spaces."><input className="field font-bold uppercase tracking-wide" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })} placeholder="EID20" autoFocus /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select className="field" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as "percent" | "fixed" })}>
                  <option value="percent">Percent off</option><option value="fixed">Fixed amount off</option>
                </select>
              </Field>
              <Field label={draft.type === "percent" ? "Percent" : "Amount"}><NumberInput value={draft.value} onChange={(n) => setDraft({ ...draft, value: n })} prefix={draft.type === "percent" ? "%" : cur} /></Field>
              <Field label="Minimum order" hint="0 for none."><NumberInput value={draft.minSubtotal} onChange={(n) => setDraft({ ...draft, minSubtotal: n })} prefix={cur} /></Field>
              <Field label="Total uses allowed" hint="Empty for unlimited.">
                <input type="number" min={1} className="field" value={draft.maxUses ?? ""} onChange={(e) => setDraft({ ...draft, maxUses: e.target.value ? Math.round(Number(e.target.value)) : null })} />
              </Field>
            </div>
            <Field label="Expires" hint="Empty for never."><input type="datetime-local" className="field" value={toLocalInput(draft.expiresAt)} onChange={(e) => setDraft({ ...draft, expiresAt: fromLocalInput(e.target.value) || null })} /></Field>
            <Toggle on={draft.isActive} onChange={(v) => setDraft({ ...draft, isActive: v })} label="Code is active" />
            <button onClick={saveCode} className="btn-pink">Save code</button>
          </div>
        )}
      </Modal>
      {bar}
    </>
  );
}
