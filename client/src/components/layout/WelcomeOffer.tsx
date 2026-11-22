import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Check, Copy } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ProductArt } from "@/components/brand/ProductArt";
import { Modal, Spinner } from "@/components/ui/basics";
import { api } from "@/lib/api";
import { useSettings } from "@/lib/queries";
import { toast, useBag, usePrefs } from "@/lib/store";

/**
 * First-visit offer: leave a WhatsApp number or email, get a discount code.
 * Shown once per visitor. The code is applied to the bag automatically.
 */
export function WelcomeOffer() {
  const settings = useSettings();
  const { welcomeSeen, welcomeCode, setWelcome } = usePrefs();
  const setCode = useBag((s) => s.setCode);
  const [open, setOpen] = useState(false);
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [location] = useLocation();
  const blocked = location.startsWith("/checkout") || location.startsWith("/order");

  useEffect(() => {
    if (!settings?.welcomeOn || welcomeSeen || blocked) return;
    const id = setTimeout(() => setOpen(true), 7000);
    return () => clearTimeout(id);
  }, [settings?.welcomeOn, welcomeSeen, blocked]);

  if (!settings?.welcomeOn) return null;
  const close = () => { setOpen(false); setWelcome(true); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const { code } = await api<{ code: string }>("/api/subscribe", { body: { contact, source: "welcome" } });
      setWelcome(true, code);
      if (code) setCode(code);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={close} className="sm:max-w-[720px]">
      <div className="grid sm:grid-cols-[260px_1fr]">
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-pink to-pink-deep sm:block">
          <Logo tone="light" tagline={false} className="absolute left-6 top-6 text-[3rem]" />
          <ProductArt kind="lipstick" color="#FFD0E2" className="absolute bottom-[-6%] left-1/2 h-[82%] -translate-x-1/2 rotate-[10deg] drop-shadow-2xl" />
        </div>
        <div className="p-7 sm:p-9">
          {welcomeCode ? (
            <div className="animate-pop text-center sm:text-left">
              <h2 className="text-3xl font-semibold">Your code is ready</h2>
              <p className="mt-2 text-[15px] text-ink-soft">We already added it to your bag. It applies at checkout.</p>
              <button
                onClick={() => { navigator.clipboard?.writeText(welcomeCode); toast("Code copied"); }}
                className="mt-5 flex w-full items-center justify-between rounded-2xl border-2 border-dashed border-pink bg-blush-soft px-5 py-4 font-display text-2xl font-bold tracking-wider text-pink-deep"
              >
                {welcomeCode}<Copy size={18} />
              </button>
              <button onClick={close} className="btn-pink mt-4 w-full"><Check size={18} />Start shopping</button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <h2 className="text-[2rem] font-semibold leading-[1.05] sm:text-[2.4rem]">{settings.welcomeTitle}</h2>
              <p className="mt-3 text-[15px] text-ink-soft">{settings.welcomeText}</p>
              <label className="label mt-5" htmlFor="welcome-contact">WhatsApp number or email</label>
              <input id="welcome-contact" className="field" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="059 000 0000" autoComplete="tel" />
              {error && <p className="mt-2 text-[13px] font-medium text-pink-deep">{error}</p>}
              <button className="btn-pink mt-4 w-full" disabled={busy || !contact.trim()}>{busy ? <Spinner /> : "Unlock my code"}</button>
              <button type="button" onClick={close} className="mt-3 w-full text-center text-[13px] text-ink-mute hover:text-ink">No thanks</button>
            </form>
          )}
        </div>
      </div>
    </Modal>
  );
}
