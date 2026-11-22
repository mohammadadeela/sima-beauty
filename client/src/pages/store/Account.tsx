import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import type { Order, User } from "@shared/types";
import { Logo } from "@/components/brand/Logo";
import { Empty, Spinner } from "@/components/ui/basics";
import { usePageTitle } from "@/components/layout/StoreLayout";
import { OrderView } from "./OrderPages";
import { api, queryClient } from "@/lib/api";
import { cx, dateOnly, money, STATUS_LABEL } from "@/lib/format";
import { useLogout, useMe, useSettings } from "@/lib/queries";
import { toast } from "@/lib/store";

export default function Account() {
  const { data: me, isLoading } = useMe();
  usePageTitle(me ? "My account" : "Sign in");
  if (isLoading) return <div className="py-24 text-center"><Spinner className="text-pink" /></div>;
  return me ? <Profile me={me} /> : <AuthForm />;
}

/** Sign in and create account, in one card with two tabs. */
export function AuthForm({ adminOnly }: { adminOnly?: boolean }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [, navigate] = useLocation();
  const next = new URLSearchParams(useSearch()).get("next");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const user = await api<User>(`/api/auth/${mode}`, { body: form });
      queryClient.setQueryData(["/api/auth/me"], user);
      queryClient.invalidateQueries();
      toast(mode === "login" ? `Welcome back, ${user.name.split(" ")[0]}` : "Your account is ready");
      navigate(next && /^\/(?!\/)/.test(next) ? next : user.role === "admin" ? "/admin" : "/account");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const input = (key: keyof typeof form) => ({ value: form[key], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value }), className: "field", id: `au-${key}` });

  return (
    <div className="wrap flex justify-center py-10 sm:py-16">
      <div className="w-full max-w-md rounded-blob bg-white p-6 shadow-soft sm:p-9">
        <div className="text-center"><Logo className="text-[3rem]" /></div>
        {!adminOnly && (
          <div className="mt-6 grid grid-cols-2 rounded-full bg-blush-soft p-1 text-[14.5px] font-semibold">
            {(["login", "register"] as const).map((m) => (
              <button key={m} type="button" onClick={() => { setMode(m); setError(""); }} className={cx("h-10 rounded-full transition", mode === m ? "bg-ink text-milk" : "text-ink-soft")}>{m === "login" ? "Sign in" : "Create account"}</button>
            ))}
          </div>
        )}
        <form onSubmit={submit} className="mt-6 grid gap-4">
          {mode === "register" && (
            <>
              <div><label className="label" htmlFor="au-name">Full name</label><input {...input("name")} autoComplete="name" required /></div>
              <div><label className="label" htmlFor="au-phone">Phone number</label><input {...input("phone")} type="tel" autoComplete="tel" /></div>
            </>
          )}
          <div><label className="label" htmlFor="au-email">Email</label><input {...input("email")} type="email" autoComplete="email" required /></div>
          <div><label className="label" htmlFor="au-password">Password</label><input {...input("password")} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={6} /></div>
          {error && <p role="alert" className="rounded-2xl bg-pink/10 px-4 py-3 text-[14px] font-medium text-pink-deep">{error}</p>}
          <button className="btn-pink w-full" disabled={busy}>{busy ? <Spinner /> : mode === "login" ? "Sign in" : "Create my account"}</button>
        </form>
      </div>
    </div>
  );
}

function Profile({ me }: { me: User }) {
  const settings = useSettings();
  const logout = useLogout();
  const [, navigate] = useLocation();
  const orders = useQuery<Order[]>({ queryKey: ["/api/auth/orders"] });
  const [open, setOpen] = useState<number | null>(null);
  const [form, setForm] = useState({ name: me.name, phone: me.phone, password: "" });
  const [busy, setBusy] = useState(false);
  const cur = settings?.currency || "₪";

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const user = await api<User>("/api/auth/me", { method: "PATCH", body: { ...form, password: form.password || undefined } });
      queryClient.setQueryData(["/api/auth/me"], user);
      setForm({ ...form, password: "" });
      toast("Details saved");
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wrap py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[2.6rem] font-semibold leading-none sm:text-[3.6rem]">Hi, {me.name.split(" ")[0]}</h1>
        <div className="flex gap-2">
          {me.role === "admin" && <Link href="/admin" className="btn-ink btn-sm">Open admin panel</Link>}
          <button onClick={() => logout.mutate(undefined, { onSuccess: () => navigate("/") })} className="btn-line btn-sm"><LogOut size={15} />Sign out</button>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <section>
          <h2 className="mb-4 text-2xl font-semibold">My orders</h2>
          {orders.isLoading ? <div className="skeleton h-40" /> : !orders.data?.length ? (
            <Empty title="No orders yet" text="Your orders will show up here."><Link href="/shop" className="btn-pink">Start shopping</Link></Empty>
          ) : (
            <ul className="grid gap-3">
              {orders.data.map((o) => (
                <li key={o.id}>
                  {open === o.id ? <OrderView order={o} currency={cur} /> : (
                    <button onClick={() => setOpen(o.id)} className="flex w-full items-center justify-between gap-4 rounded-3xl bg-white p-4 text-left shadow-soft transition hover:-translate-y-0.5">
                      <span><span className="block text-[15.5px] font-semibold">{o.orderNumber}</span><span className="text-[13px] text-ink-mute">{dateOnly(o.createdAt)}, {o.items.length} {o.items.length === 1 ? "item" : "items"}</span></span>
                      <span className="text-right"><span className="price block text-[15.5px]">{money(o.total, cur)}</span><span className={cx("tag", o.status === "cancelled" ? "bg-ink/10 text-ink-soft" : "bg-blush text-pink-deep")}>{STATUS_LABEL[o.status]}</span></span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
        <form onSubmit={save} className="grid content-start gap-4 rounded-blob bg-blush-soft p-5 sm:p-6">
          <h2 className="text-2xl font-semibold">My details</h2>
          <div><label className="label" htmlFor="pf-name">Full name</label><input id="pf-name" className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div><label className="label" htmlFor="pf-phone">Phone number</label><input id="pf-phone" className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><label className="label">Email</label><p className="field flex items-center bg-white/60 text-ink-mute">{me.email}</p></div>
          <div><label className="label" htmlFor="pf-pass">New password (leave empty to keep)</label><input id="pf-pass" className="field" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={6} autoComplete="new-password" /></div>
          <button className="btn-ink" disabled={busy}>{busy ? <Spinner /> : "Save details"}</button>
        </form>
      </div>
    </div>
  );
}
