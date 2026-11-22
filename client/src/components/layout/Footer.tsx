import { useState } from "react";
import { Link } from "wouter";
import { Facebook, Instagram, MessageCircle, Send } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Marquee, Spinner } from "@/components/ui/basics";
import { api } from "@/lib/api";
import { whatsappLink } from "@/lib/format";
import { useBootstrap } from "@/lib/queries";
import { toast } from "@/lib/store";

const LINKS = [["/track", "Track my order"], ["/help/delivery", "Delivery and exchange"], ["/help/faq", "Questions"], ["/help/contact", "Contact us"], ["/help/policies", "Privacy and terms"]];
const isWeb = (url: string) => /^https?:\/\//i.test(url);

/** A short footer: who we are, the few links people need, and the offers sign-up. */
export function Footer() {
  const { data } = useBootstrap();
  const s = data?.settings;
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  if (!s) return null;

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/subscribe", { body: { contact, source: "footer" } });
      setContact("");
      toast("You're on the list. We'll send you our best offers.");
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const socials = [
    isWeb(s.instagram) && { href: s.instagram, icon: Instagram, label: "Instagram" },
    isWeb(s.facebook) && { href: s.facebook, icon: Facebook, label: "Facebook" },
    s.whatsapp && { href: whatsappLink(s.whatsapp), icon: MessageCircle, label: "WhatsApp" },
  ].filter(Boolean) as { href: string; icon: typeof Instagram; label: string }[];

  return (
    <footer className="mt-auto bg-ink text-milk">
      {s.perks.length > 0 && (
        <Marquee speed={38} className="bg-pink py-2.5">
          {s.perks.map((p) => (
            <span key={p} className="flex items-center gap-8 pr-8 text-[15px] font-medium">{p}<span className="h-1.5 w-1.5 rotate-45 bg-gold-light" /></span>
          ))}
        </Marquee>
      )}
      <div className="wrap flex flex-col items-center gap-6 py-9 lg:flex-row lg:justify-between">
        <div className="flex flex-col items-center gap-3 lg:flex-row lg:gap-6">
          <Logo tone="light" className="text-[2.6rem]" />
          {socials.length > 0 && (
            <div className="flex gap-2">
              {socials.map((x) => (
                <a key={x.label} href={x.href} target="_blank" rel="noreferrer" aria-label={x.label} className="flex h-10 w-10 items-center justify-center rounded-full bg-milk/10 transition hover:bg-pink"><x.icon size={18} /></a>
              ))}
            </div>
          )}
        </div>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[14.5px]" aria-label="Help">
          {LINKS.map(([href, label]) => <Link key={href} href={href} className="text-milk/75 hover:text-milk">{label}</Link>)}
        </nav>
        <form onSubmit={subscribe} className="flex h-12 w-full max-w-[320px] items-center rounded-full bg-milk/10 pl-5 pr-1 focus-within:ring-2 focus-within:ring-pink-glow">
          <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="WhatsApp number for offers" aria-label="WhatsApp number or email"
            className="h-full min-w-0 flex-1 bg-transparent text-[14.5px] outline-none placeholder:text-milk/50" />
          <button disabled={busy || !contact.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink transition hover:bg-pink-glow disabled:opacity-50" aria-label="Subscribe">
            {busy ? <Spinner className="h-4 w-4" /> : <Send size={16} />}
          </button>
        </form>
      </div>
      <p className="border-t border-milk/10 py-3.5 text-center text-[12.5px] text-milk/50">© {new Date().getFullYear()} {s.storeName}</p>
    </footer>
  );
}
