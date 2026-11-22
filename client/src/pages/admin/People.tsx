import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, MailOpen, Trash2 } from "lucide-react";
import type { Review, User } from "@shared/types";
import { Rating } from "@/components/ui/basics";
import { api } from "@/lib/api";
import { cx, dateOnly, dateTime, money } from "@/lib/format";
import { useSettings } from "@/lib/queries";
import { toast } from "@/lib/store";
import { Badge, confirmDelete, IconBtn, PageHead, run, Table, Toggle } from "./ui";

interface Message { id: number; name: string; contact: string; message: string; isRead: boolean; createdAt: string }
interface Subscriber { id: number; contact: string; source: string; createdAt: string }
const TABS = ["Reviews", "Messages", "Customers", "Subscribers"] as const;

export default function People() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Reviews");
  const cur = useSettings()?.currency || "₪";
  const reviews = useQuery<Review[]>({ queryKey: ["/api/admin/reviews"] });
  const messages = useQuery<Message[]>({ queryKey: ["/api/admin/messages"] });
  const customers = useQuery<User[]>({ queryKey: ["/api/admin/customers"] });
  const subscribers = useQuery<Subscriber[]>({ queryKey: ["/api/admin/subscribers"] });
  const counts: Record<string, number> = {
    Reviews: reviews.data?.filter((r) => !r.isApproved).length || 0,
    Messages: messages.data?.filter((m) => !m.isRead).length || 0,
  };

  return (
    <>
      <PageHead title="Customers and reviews" />
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cx("chip", tab === t && "chip-on")}>
            {t}{counts[t] > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-pink px-1 text-[11px] font-bold text-white">{counts[t]}</span>}
          </button>
        ))}
      </div>

      {tab === "Reviews" && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {reviews.data?.length === 0 && <p className="text-ink-mute">No reviews yet. New ones wait here for your approval before they appear on the store.</p>}
          {reviews.data?.map((r) => (
            <div key={r.id} className={cx("rounded-3xl bg-white p-5 shadow-soft", !r.isApproved && "ring-2 ring-pink/40")}>
              <div className="flex items-center justify-between gap-2"><Rating value={r.rating} /><Badge tone={r.isApproved ? "green" : "amber"}>{r.isApproved ? "On the store" : "Waiting"}</Badge></div>
              <p className="mt-2 text-[13px] font-semibold text-pink-deep">{r.productName}</p>
              {r.comment && <p className="mt-1 text-[14.5px] leading-relaxed text-ink-soft">{r.comment}</p>}
              <p className="mt-2 text-[13px] text-ink-mute">{r.name}, {dateOnly(r.createdAt)}</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => run(() => api(`/api/admin/reviews/${r.id}`, { method: "PATCH", body: { isApproved: !r.isApproved } }), r.isApproved ? "Review hidden" : "Review approved")} className={r.isApproved ? "btn-line btn-sm" : "btn-pink btn-sm"}>
                  {r.isApproved ? "Hide" : <><Check size={15} />Approve</>}
                </button>
                <button onClick={() => confirmDelete("this review") && run(() => api(`/api/admin/reviews/${r.id}`, { method: "DELETE" }), "Review deleted")} className="btn-line btn-sm"><Trash2 size={15} />Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "Messages" && (
        <div className="grid gap-3">
          {messages.data?.length === 0 && <p className="text-ink-mute">No messages yet. Anything sent from the Contact page lands here.</p>}
          {messages.data?.map((m) => (
            <div key={m.id} className={cx("rounded-3xl bg-white p-5 shadow-soft", !m.isRead && "ring-2 ring-pink/40")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{m.name} <span className="ml-1 font-normal text-ink-mute">{m.contact}</span></p>
                <p className="text-[13px] text-ink-mute">{dateTime(m.createdAt)}</p>
              </div>
              <p className="mt-2 whitespace-pre-line text-[14.5px] leading-relaxed text-ink-soft">{m.message}</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => run(() => api(`/api/admin/messages/${m.id}`, { method: "PATCH", body: { isRead: !m.isRead } }), m.isRead ? "Marked as unread" : "Marked as read")} className="btn-line btn-sm"><MailOpen size={15} />{m.isRead ? "Mark as unread" : "Mark as read"}</button>
                <button onClick={() => confirmDelete("this message") && run(() => api(`/api/admin/messages/${m.id}`, { method: "DELETE" }), "Message deleted")} className="btn-line btn-sm"><Trash2 size={15} />Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "Customers" && (
        <Table head={["Name", "Email", "Phone", "Orders", "Spent", "Joined", "Can sign in"]} empty={customers.data && !customers.data.length}>
          {customers.data?.map((u) => (
            <tr key={u.id}>
              <td className="font-semibold">{u.name}{u.role === "admin" && <span className="ml-2"><Badge tone="ink">Admin</Badge></span>}</td>
              <td>{u.email}</td><td>{u.phone || "None"}</td><td>{u.orderCount}</td>
              <td className="price">{money(u.totalSpent || 0, cur)}</td>
              <td className="text-ink-mute">{dateOnly(u.createdAt)}</td>
              <td>{u.role === "admin" ? <span className="text-ink-mute">Always</span> : <Toggle on={!u.isBlocked} onChange={(v) => run(() => api(`/api/admin/customers/${u.id}`, { method: "PATCH", body: { isBlocked: !v } }), v ? "Customer unblocked" : "Customer blocked")} />}</td>
            </tr>
          ))}
        </Table>
      )}

      {tab === "Subscribers" && (
        <>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[14px] text-ink-mute">People who asked for offers, from the welcome pop-up and the footer.</p>
            <button onClick={() => { navigator.clipboard?.writeText((subscribers.data || []).map((s) => s.contact).join("\n")); toast("All contacts copied"); }} className="btn-ink btn-sm" disabled={!subscribers.data?.length}><Copy size={15} />Copy all</button>
          </div>
          <Table head={["WhatsApp or email", "Came from", "Joined", ""]} empty={subscribers.data && !subscribers.data.length}>
            {subscribers.data?.map((s) => (
              <tr key={s.id}>
                <td className="font-semibold">{s.contact}</td><td className="capitalize">{s.source}</td><td className="text-ink-mute">{dateOnly(s.createdAt)}</td>
                <td><div className="flex justify-end"><IconBtn label="Remove" danger onClick={() => run(() => api(`/api/admin/subscribers/${s.id}`, { method: "DELETE" }), "Subscriber removed")}><Trash2 size={16} /></IconBtn></div></td>
              </tr>
            ))}
          </Table>
        </>
      )}
    </>
  );
}
