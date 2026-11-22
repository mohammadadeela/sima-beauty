import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2, X } from "lucide-react";
import type { Settings } from "@shared/types";
import { Spinner } from "@/components/ui/basics";
import { api, queryClient } from "@/lib/api";
import { cx } from "@/lib/format";
import { useSettings } from "@/lib/queries";
import { toast } from "@/lib/store";

// Small building blocks shared by every admin page.

export function PageHead({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[2rem] font-semibold leading-none sm:text-[2.4rem]">{title}</h1>
        {hint && <p className="mt-1.5 text-[14px] text-ink-mute">{hint}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function Card({ title, hint, children, className, action }: { title?: string; hint?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={cx("rounded-3xl bg-white p-5 shadow-soft", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="font-sans text-[16.5px] font-bold tracking-normal">{title}</h2>}
            {hint && <p className="mt-0.5 text-[13px] text-ink-mute">{hint}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12.5px] text-ink-mute">{hint}</span>}
    </label>
  );
}

export function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label?: string; hint?: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex items-center gap-3 text-left">
      <span className={cx("relative h-7 w-12 shrink-0 rounded-full transition-colors", on ? "bg-pink" : "bg-ink/20")}>
        <span className={cx("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all", on ? "left-6" : "left-1")} />
      </span>
      {label && <span><span className="block text-[14.5px] font-semibold">{label}</span>{hint && <span className="block text-[12.5px] text-ink-mute">{hint}</span>}</span>}
    </button>
  );
}

export function NumberInput({ value, onChange, min = 0, step, prefix }: { value: number; onChange: (n: number) => void; min?: number; step?: number; prefix?: string }) {
  return (
    <div className="relative">
      {prefix && <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] text-ink-mute">{prefix}</span>}
      <input type="number" className={cx("field", prefix && "pl-9")} value={Number.isFinite(value) ? value : ""} min={min} step={step}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))} />
    </div>
  );
}

/** Upload one or more photos. Calls back with the saved image addresses. */
export async function uploadImages(files: FileList | File[]): Promise<string[]> {
  const form = new FormData();
  for (const f of Array.from(files)) form.append("files", f);
  const { urls } = await api<{ urls: string[] }>("/api/admin/upload", { form });
  return urls;
}

export function ImageInput({ value, onChange, label = "Photo", wide }: { value: string | null; onChange: (url: string | null) => void; label?: string; wide?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try { onChange((await uploadImages(files))[0]); } catch (err: any) { toast(err.message, "error"); } finally { setBusy(false); }
  };
  return (
    <div>
      <span className="label">{label}</span>
      <div className={cx("relative flex items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-ink/15 bg-blush-soft", wide ? "h-32 w-full" : "h-24 w-24")}>
        {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : busy ? <Spinner className="text-pink" /> : <ImagePlus size={22} className="text-ink-mute" />}
        <button type="button" onClick={() => input.current?.click()} className="absolute inset-0" aria-label={`Upload ${label}`} />
        {value && <button type="button" onClick={() => onChange(null)} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white" aria-label="Remove photo"><X size={13} /></button>}
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
    </div>
  );
}

/** Edit a list of short text lines: add, remove, reorder. */
export function ListEditor({ items, onChange, placeholder, addLabel = "Add line", multiline }: { items: string[]; onChange: (v: string[]) => void; placeholder?: string; addLabel?: string; multiline?: boolean }) {
  const move = (i: number, d: number) => { const next = [...items]; [next[i], next[i + d]] = [next[i + d], next[i]]; onChange(next); };
  return (
    <div className="grid gap-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-1.5">
          {multiline
            ? <textarea className="field min-h-[64px]" value={item} placeholder={placeholder} onChange={(e) => onChange(items.map((x, n) => (n === i ? e.target.value : x)))} />
            : <input className="field" value={item} placeholder={placeholder} onChange={(e) => onChange(items.map((x, n) => (n === i ? e.target.value : x)))} />}
          <div className="flex shrink-0 pt-1.5">
            <IconBtn label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={15} /></IconBtn>
            <IconBtn label="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)}><ArrowDown size={15} /></IconBtn>
            <IconBtn label="Remove" danger onClick={() => onChange(items.filter((_, n) => n !== i))}><Trash2 size={15} /></IconBtn>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ""])} className="btn-line btn-sm justify-self-start"><Plus size={15} />{addLabel}</button>
    </div>
  );
}

export function IconBtn({ children, label, onClick, danger, disabled }: { children: ReactNode; label: string; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label}
      className={cx("flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition disabled:opacity-25", danger ? "hover:bg-pink/10 hover:text-pink-deep" : "hover:bg-blush")}>
      {children}
    </button>
  );
}

export function Badge({ children, tone = "pink" }: { children: ReactNode; tone?: "pink" | "ink" | "green" | "amber" | "grey" }) {
  const tones = { pink: "bg-blush text-pink-deep", ink: "bg-ink text-milk", green: "bg-emerald-100 text-emerald-800", amber: "bg-amber-100 text-amber-800", grey: "bg-ink/10 text-ink-soft" };
  return <span className={cx("tag", tones[tone])}>{children}</span>;
}

export const STATUS_TONE: Record<string, "amber" | "pink" | "ink" | "green" | "grey"> = { pending: "amber", confirmed: "pink", shipped: "ink", delivered: "green", cancelled: "grey" };

export function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-3xl bg-white shadow-soft">
      <table className="w-full min-w-[640px] text-left text-[14px]">
        <thead><tr className="border-b border-ink/10 text-[12.5px] text-ink-mute">{head.map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-ink/[0.06] [&_td]:px-4 [&_td]:py-3 [&_tr:hover]:bg-blush-soft/50">{children}</tbody>
      </table>
      {empty && <p className="px-4 py-10 text-center text-[14.5px] text-ink-mute">Nothing here yet.</p>}
    </div>
  );
}

/** Ask "are you sure?" before deleting something. */
export function confirmDelete(what: string): boolean {
  return window.confirm(`Delete ${what}? This can't be undone.`);
}

/** Run an admin change, refresh the data on screen, and show a message. */
export async function run(action: () => Promise<unknown>, done = "Saved") {
  try {
    await action();
    await queryClient.invalidateQueries();
    toast(done);
    return true;
  } catch (err: any) {
    toast(err.message, "error");
    return false;
  }
}

/**
 * Edit store settings on a page: a local copy the admin can change freely,
 * plus a "Save changes" bar that appears as soon as something is different.
 */
export function useSettingsForm() {
  const saved = useSettings();
  const [draft, setDraft] = useState<Settings | undefined>(saved);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setDraft(saved); }, [saved]);
  const dirty = !!saved && !!draft && JSON.stringify(saved) !== JSON.stringify(draft);
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d));

  const save = async () => {
    if (!draft || !saved) return;
    const patch: Partial<Settings> = {};
    for (const k of Object.keys(draft) as (keyof Settings)[]) {
      if (JSON.stringify(draft[k]) !== JSON.stringify(saved[k])) (patch as any)[k] = draft[k];
    }
    setBusy(true);
    await run(() => api("/api/admin/settings", { method: "PUT", body: patch }), "Changes saved. They are live on the store now.");
    setBusy(false);
  };

  const bar = (
    <AnimatePresence>
      {dirty && (
        <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
          className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-[min(92%,520px)] items-center justify-between gap-3 rounded-full bg-ink py-2 pl-6 pr-2 text-milk shadow-2xl">
          <span className="text-[14px] font-medium">You have unsaved changes</span>
          <span className="flex gap-1.5">
            <button onClick={() => setDraft(saved)} className="btn btn-sm text-milk/80 hover:text-milk">Discard</button>
            <button onClick={save} disabled={busy} className="btn-pink btn-sm">{busy ? <Spinner className="h-4 w-4" /> : "Save changes"}</button>
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
  return { s: draft, set, bar };
}
