import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ProductArt } from "@/components/brand/ProductArt";
import { ProductVisual } from "@/components/product/ProductCard";
import { Drawer } from "@/components/ui/basics";
import { cx, finalPrice, money } from "@/lib/format";
import { useBootstrap, useMe, useProducts } from "@/lib/queries";
import { bagCount, useBag, usePrefs, useUi } from "@/lib/store";

/** The thin bar at the very top. Messages rotate one at a time. */
export function Announcement() {
  const settings = useBootstrap().data?.settings;
  const [i, setI] = useState(0);
  const items = settings?.announcements.filter(Boolean) || [];
  useEffect(() => {
    if (items.length < 2) return;
    const id = setInterval(() => setI((n) => n + 1), 3800);
    return () => clearInterval(id);
  }, [items.length]);
  if (!settings?.announcementOn || !items.length) return null;
  return (
    <div className="relative z-[60] h-9 overflow-hidden bg-pink text-center text-[13px] font-medium text-white">
      <AnimatePresence mode="wait">
        <motion.p key={i % items.length} className="absolute inset-0 flex items-center justify-center px-4"
          initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -18, opacity: 0 }} transition={{ duration: 0.35 }}>
          {items[i % items.length]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

export function Navbar({ overHero }: { overHero: boolean }) {
  const { data } = useBootstrap();
  const { data: me } = useMe();
  const count = useBag(bagCount);
  const wishCount = usePrefs((s) => s.wishlist.length);
  const { setBag, setMenu, setSearch } = useUi();
  const [scrolled, setScrolled] = useState(false);
  const [mega, setMega] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => setMega(false), [location]);

  const light = overHero && !scrolled && !mega;
  const icon = cx("relative flex h-10 w-10 items-center justify-center rounded-full transition", light ? "text-milk hover:bg-white/15" : "text-ink hover:bg-blush");
  const link = cx("relative py-2 text-[14.5px] font-medium transition after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:origin-left after:scale-x-0 after:bg-pink after:transition-transform hover:after:scale-x-100", light ? "text-milk" : "text-ink");

  return (
    <header
      className={cx("sticky top-0 z-50 transition-[background,box-shadow] duration-300", light ? "bg-transparent" : "bg-milk/90 shadow-[0_1px_0_rgba(38,16,28,.08)] backdrop-blur-xl")}
      onMouseLeave={() => setMega(false)}
    >
      <div className="wrap grid h-16 grid-cols-[1fr_auto_1fr] items-center lg:h-[72px]">
        <div className="flex items-center gap-7">
          <button className={cx(icon, "lg:hidden")} onClick={() => setMenu(true)} aria-label="Open menu"><Menu size={22} /></button>
          <nav className="hidden items-center gap-7 lg:flex">
            <Link href="/shop" className={link} onMouseEnter={() => setMega(true)}>Shop</Link>
            <Link href="/brands" className={link} onMouseEnter={() => setMega(false)}>Brands</Link>
            <Link href="/offers" className={link} onMouseEnter={() => setMega(false)}>Offers</Link>
            <Link href="/track" className={link} onMouseEnter={() => setMega(false)}>Track order</Link>
          </nav>
        </div>
        <Link href="/" aria-label="Sima Beauty home"><Logo tone={light ? "light" : "ink"} className="text-[2.1rem] lg:text-[2.5rem]" /></Link>
        <div className="flex items-center justify-end gap-0.5 sm:gap-1.5">
          <button className={icon} onClick={() => setSearch(true)} aria-label="Search"><Search size={20} /></button>
          <Link href={me?.role === "admin" ? "/admin" : "/account"} className={cx(icon, "hidden sm:flex")} aria-label="Account"><User size={20} /></Link>
          <Link href="/wishlist" className={cx(icon, "hidden sm:flex")} aria-label="Wishlist">
            <Heart size={20} />
            {wishCount > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-pink" />}
          </Link>
          <button className={icon} onClick={() => setBag(true)} aria-label={`Bag, ${count} items`}>
            <ShoppingBag size={20} />
            {count > 0 && (
              <span key={count} className="absolute -right-0.5 -top-0.5 flex h-[19px] min-w-[19px] animate-pop items-center justify-center rounded-full bg-pink px-1 text-[11px] font-bold text-white">{count}</span>
            )}
          </button>
        </div>
      </div>

      {/* Desktop "Shop" panel */}
      <AnimatePresence>
        {mega && data && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
            className="absolute inset-x-0 top-full hidden border-t border-ink/10 bg-milk shadow-xl lg:block"
          >
            <div className="wrap grid grid-cols-[1fr_260px] gap-8 py-6">
              <div className="grid grid-cols-6 gap-3">
                {data.categories.map((c) => (
                  <Link key={c.id} href={`/shop?category=${c.slug}`} className="group rounded-3xl p-3 text-center transition hover:-translate-y-1" style={{ background: c.color }}>
                    {c.image ? <img src={c.image} alt="" className="mx-auto h-24 w-24 rounded-2xl object-cover" /> : <ProductArt kind={c.art} className="mx-auto h-24 transition-transform group-hover:rotate-[-6deg] group-hover:scale-110" />}
                    <span className="mt-1 block font-display text-lg font-semibold">{c.name}</span>
                  </Link>
                ))}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-ink-mute">Brands</p>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {data.brands.slice(0, 10).map((b) => (
                    <Link key={b.id} href={`/shop?brand=${b.slug}`} className="text-[14.5px] hover:text-pink">{b.name}</Link>
                  ))}
                </div>
                <Link href="/offers" className="btn-pink btn-sm mt-4">See all offers</Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export function MobileMenu() {
  const { data } = useBootstrap();
  const { data: me } = useMe();
  const open = useUi((s) => s.menuOpen);
  const setMenu = useUi((s) => s.setMenu);
  const [location] = useLocation();
  useEffect(() => setMenu(false), [location, setMenu]);
  return (
    <Drawer open={open} onClose={() => setMenu(false)} side="left" title="Menu">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-3 gap-2.5">
          {data?.categories.map((c) => (
            <Link key={c.id} href={`/shop?category=${c.slug}`} className="rounded-2xl p-2 text-center" style={{ background: c.color }}>
              {c.image ? <img src={c.image} alt="" className="mx-auto h-16 w-16 rounded-xl object-cover" /> : <ProductArt kind={c.art} className="mx-auto h-16" />}
              <span className="block font-display text-[15px] font-semibold">{c.name}</span>
            </Link>
          ))}
        </div>
        <nav className="mt-5 divide-y divide-ink/10 text-[16px] font-medium">
          {[
            ["/shop", "Shop everything"], ["/offers", "Offers"], ["/brands", "Brands"], ["/wishlist", "Wishlist"],
            ["/track", "Track my order"], [me?.role === "admin" ? "/admin" : "/account", me ? "My account" : "Sign in"], ["/help", "Help"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="block py-3.5">{label}</Link>
          ))}
        </nav>
      </div>
    </Drawer>
  );
}

export function SearchOverlay() {
  const { data } = useBootstrap();
  const open = useUi((s) => s.searchOpen);
  const setSearch = useUi((s) => s.setSearch);
  const [text, setText] = useState("");
  const [term, setTerm] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const [location, navigate] = useLocation();
  const results = useProducts({ q: term, limit: 6 }, term.length >= 2);

  useEffect(() => { const id = setTimeout(() => setTerm(text.trim()), 220); return () => clearTimeout(id); }, [text]);
  useEffect(() => { if (open) setTimeout(() => input.current?.focus(), 60); else setText(""); }, [open]);
  useEffect(() => setSearch(false), [location, setSearch]);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setSearch(false);
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open, setSearch]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[85]">
          <motion.div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSearch(false)} />
          <motion.div className="relative bg-milk shadow-2xl" initial={{ y: "-100%" }} animate={{ y: 0 }} exit={{ y: "-100%" }} transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}>
            <div className="wrap py-5">
              <form className="flex items-center gap-3" onSubmit={(e) => { e.preventDefault(); if (text.trim()) navigate(`/shop?q=${encodeURIComponent(text.trim())}`); }}>
                <Search size={22} className="shrink-0 text-pink" />
                <input ref={input} value={text} onChange={(e) => setText(e.target.value)} placeholder="Search lipstick, mascara, a brand…"
                  className="h-12 w-full bg-transparent font-display text-2xl outline-none placeholder:text-ink-mute/60 sm:text-3xl" aria-label="Search products" />
                <button type="button" onClick={() => setSearch(false)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-blush" aria-label="Close search"><X size={20} /></button>
              </form>
              {term.length < 2 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {data?.categories.map((c) => <Link key={c.id} href={`/shop?category=${c.slug}`} className="chip">{c.name}</Link>)}
                  {data?.brands.slice(0, 6).map((b) => <Link key={b.id} href={`/shop?brand=${b.slug}`} className="chip">{b.name}</Link>)}
                </div>
              ) : results.data?.length ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {results.data.map((p) => (
                    <Link key={p.id} href={`/product/${p.slug}`} className="flex items-center gap-3 rounded-2xl bg-white p-2 transition hover:bg-blush-soft">
                      <ProductVisual image={p.images[0]} art={p.art} color={p.shades[0]?.hex} className="h-16 w-14 shrink-0 rounded-xl" />
                      <span className="min-w-0">
                        <span className="block text-[12px] font-semibold text-pink">{p.brandName}</span>
                        <span className="block truncate text-[14.5px] font-medium">{p.name}</span>
                        <span className="price text-[14px]">{money(finalPrice(p), data?.settings.currency)}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : results.isFetching ? null : (
                <p className="mt-5 text-[15px] text-ink-soft">Nothing matches "{term}". Try a shorter word or a brand name.</p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
