import { useState } from "react";
import { Link } from "wouter";
import { Facebook, Instagram, Mail, MapPin, MessageCircle, Phone, Send } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Marquee, Spinner } from "@/components/ui/basics";
import { api } from "@/lib/api";
import { whatsappLink } from "@/lib/format";
import { useBootstrap } from "@/lib/queries";
import { toast } from "@/lib/store";

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
    s.instagram && { href: s.instagram, icon: Instagram, label: "Instagram" },
    s.facebook && { href: s.facebook, icon: Facebook, label: "Facebook" },
    s.whatsapp && { href: whatsappLink(s.whatsapp), icon: MessageCircle, label: "WhatsApp" },
  ].filter(Boolean) as { href: string; icon: typeof Instagram; label: string }[];

  return (
    <footer className="mt-auto bg-ink text-milk">
      {s.perks.length > 0 && (
        <Marquee speed={38} className="border-b border-milk/10 bg-pink py-3">
          {s.perks.map((p) => (
            <span key={p} className="flex items-center gap-8 pr-8 font-display text-lg italic">{p}<span className="h-2 w-2 rotate-45 bg-gold-light" /></span>
          ))}
        </Marquee>
      )}
      <div className="wrap grid gap-10 py-12 md:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
        <div>
          <Logo tone="light" className="!items-start text-[3.2rem]" />
          <p className="mt-4 max-w-xs text-[14.5px] leading-relaxed text-milk/70">{s.heroText}</p>
          {socials.length > 0 && (
            <div className="mt-5 flex gap-2">
              {socials.map((x) => (
                <a key={x.label} href={x.href} target="_blank" rel="noreferrer" aria-label={x.label} className="flex h-10 w-10 items-center justify-center rounded-full bg-milk/10 transition hover:bg-pink"><x.icon size={18} /></a>
              ))}
            </div>
          )}
        </div>
        <nav className="grid content-start gap-2.5 text-[14.5px]">
          <p className="mb-1 font-display text-xl font-semibold">Shop</p>
          {data.categories.map((c) => <Link key={c.id} href={`/shop?category=${c.slug}`} className="text-milk/70 hover:text-milk">{c.name}</Link>)}
          <Link href="/offers" className="text-gold-light hover:text-milk">Offers</Link>
        </nav>
        <nav className="grid content-start gap-2.5 text-[14.5px]">
          <p className="mb-1 font-display text-xl font-semibold">Help</p>
          {[["/track", "Track my order"], ["/help/delivery", "Delivery and exchange"], ["/help/faq", "Questions"], ["/help/contact", "Contact us"], ["/help/privacy", "Privacy"], ["/help/terms", "Terms"]].map(([href, label]) => (
            <Link key={href} href={href} className="text-milk/70 hover:text-milk">{label}</Link>
          ))}
        </nav>
        <div>
          <p className="font-display text-xl font-semibold">Offers first, straight to you</p>
          <form onSubmit={subscribe} className="mt-3 flex h-12 items-center rounded-full bg-milk/10 pl-5 pr-1 focus-within:ring-2 focus-within:ring-pink-glow">
            <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="WhatsApp number or email" aria-label="WhatsApp number or email"
              className="h-full min-w-0 flex-1 bg-transparent text-[14.5px] outline-none placeholder:text-milk/45" />
            <button disabled={busy || !contact.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink transition hover:bg-pink-glow disabled:opacity-50" aria-label="Subscribe">
              {busy ? <Spinner className="h-4 w-4" /> : <Send size={16} />}
            </button>
          </form>
          <ul className="mt-5 grid gap-2 text-[14px] text-milk/70">
            {s.phone && <li className="flex items-center gap-2.5"><Phone size={15} /><a href={`tel:${s.phone}`} className="hover:text-milk">{s.phone}</a></li>}
            {s.email && <li className="flex items-center gap-2.5"><Mail size={15} /><a href={`mailto:${s.email}`} className="hover:text-milk">{s.email}</a></li>}
            {s.address && <li className="flex items-center gap-2.5"><MapPin size={15} />{s.address}</li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-milk/10">
        <div className="wrap flex flex-col items-center justify-between gap-2 py-4 text-[12.5px] text-milk/50 sm:flex-row">
          <p>© {new Date().getFullYear()} {s.storeName}. All rights reserved.</p>
          <p>Cash on delivery. Original brands only.</p>
        </div>
      </div>
    </footer>
  );
}
