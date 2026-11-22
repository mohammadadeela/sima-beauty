import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Minus, Plus, TriangleAlert, X } from "lucide-react";
import { cx } from "@/lib/format";
import { useUi } from "@/lib/store";

/** Endless sideways ticker. Children are repeated so the loop has no seam. */
export function Marquee({ children, speed = 30, className, reverse }: { children: ReactNode; speed?: number; className?: string; reverse?: boolean }) {
  return (
    <div className={cx("marquee overflow-hidden", className)}>
      <div className="marquee-track animate-marquee" style={{ ["--marquee-speed" as any]: `${speed}s`, animationDirection: reverse ? "reverse" : undefined }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex shrink-0 items-center" aria-hidden={i > 0}>{children}</div>
        ))}
      </div>
    </div>
  );
}

/** Fades a block up the first time it scrolls into view. */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Time left until a date, ticking every second. Null once it has passed. */
export function useCountdown(iso: string | undefined) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const end = iso ? new Date(iso).getTime() : NaN;
  if (!Number.isFinite(end) || end <= now) return null;
  const s = Math.floor((end - now) / 1000);
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}

export function Rating({ value, count, size = 12 }: { value: number; count?: number; size?: number }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-mute" aria-label={`Rated ${value} out of 5`}>
      <span className="flex gap-[3px]">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className="rotate-45 rounded-[3px]" style={{ width: size * 0.72, height: size * 0.72, background: value >= i - 0.25 ? "#E8257D" : value >= i - 0.75 ? "#FFA6C9" : "#FFD0E2" }} />
        ))}
      </span>
      {count != null && <><span className="font-semibold text-ink-soft">{value.toFixed(1)}</span><span>({count})</span></>}
    </span>
  );
}

export function Qty({ value, max = 20, onChange, small }: { value: number; max?: number; onChange: (n: number) => void; small?: boolean }) {
  const btn = cx("flex items-center justify-center rounded-full text-ink transition hover:bg-blush disabled:opacity-30", small ? "h-7 w-7" : "h-10 w-10");
  return (
    <div className={cx("inline-flex items-center rounded-full border border-ink/15 bg-white", small ? "h-8 px-0.5" : "h-12 px-1")}>
      <button type="button" className={btn} onClick={() => onChange(value - 1)} aria-label="Decrease quantity"><Minus size={small ? 13 : 16} /></button>
      <span className={cx("price text-center", small ? "w-6 text-[13px]" : "w-8 text-[15px]")}>{value}</span>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity"><Plus size={small ? 13 : 16} /></button>
    </div>
  );
}

/** Locks page scroll while an overlay is open and closes it on Escape. */
function useOverlay(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", key);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", key); };
  }, [open, onClose]);
}

export function Drawer({ open, onClose, side = "right", title, children, wide }: {
  open: boolean; onClose: () => void; side?: "left" | "right"; title?: ReactNode; children: ReactNode; wide?: boolean;
}) {
  useOverlay(open, onClose);
  const from = side === "right" ? "100%" : "-100%";
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80]">
          <motion.div className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            role="dialog" aria-modal="true"
            className={cx("absolute top-0 flex h-full w-full flex-col bg-milk shadow-2xl", wide ? "max-w-[560px]" : "max-w-[430px]", side === "right" ? "right-0" : "left-0")}
            initial={{ x: from }} animate={{ x: 0 }} exit={{ x: from }} transition={{ type: "tween", duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <header className="flex h-16 shrink-0 items-center justify-between border-b border-ink/10 px-5">
              <div className="font-display text-xl font-semibold">{title}</div>
              <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-blush" aria-label="Close"><X size={20} /></button>
            </header>
            {children}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Modal({ open, onClose, children, className }: { open: boolean; onClose: () => void; children: ReactNode; className?: string }) {
  useOverlay(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div className="absolute inset-0 bg-ink/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            role="dialog" aria-modal="true"
            className={cx("relative max-h-[92vh] w-full overflow-auto rounded-t-[2rem] bg-milk shadow-2xl sm:rounded-[2rem]", className || "sm:max-w-lg")}
            initial={{ opacity: 0, y: 40, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <button onClick={onClose} className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 hover:bg-blush" aria-label="Close"><X size={20} /></button>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Toasts() {
  const toasts = useUi((s) => s.toasts);
  const dismiss = useUi((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[100] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id} onClick={() => dismiss(t.id)}
            initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }}
            className={cx("pointer-events-auto flex max-w-md items-center gap-2.5 rounded-full px-5 py-3 text-left text-[14px] font-medium text-white shadow-xl", t.tone === "error" ? "bg-pink-deep" : "bg-ink")}
          >
            {t.tone === "error" ? <TriangleAlert size={16} className="shrink-0" /> : <Check size={16} className="shrink-0 text-gold-light" />}
            {t.text}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function Accordion({ title, children, defaultOpen }: { title: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="border-b border-ink/10">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-4 py-4 text-left text-[15px] font-semibold" aria-expanded={open}>
        {title}
        <ChevronDown size={18} className={cx("shrink-0 text-pink transition-transform duration-300", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <div className="whitespace-pre-line pb-5 text-[14.5px] leading-relaxed text-ink-soft">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cx("inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent", className)} role="status" aria-label="Loading" />;
}

export function Empty({ title, text, children }: { title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-blob bg-blush-soft px-6 py-14 text-center">
      <h3 className="text-2xl font-semibold">{title}</h3>
      {text && <p className="mt-2 max-w-sm text-[15px] text-ink-soft">{text}</p>}
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
