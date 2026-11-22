import { useState } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { Banner, Product, Settings } from "@shared/types";
import { ProductArt } from "@/components/brand/ProductArt";
import { Lipstick3D } from "@/components/three/Lipstick3D";
import { Compact } from "@/components/home/Compact";
import { LashShowcase } from "@/components/home/LashShowcase";
import { ProductCard, ProductVisual, Rail } from "@/components/product/ProductCard";
import { Marquee, Reveal, useCountdown } from "@/components/ui/basics";
import { usePageTitle } from "@/components/layout/StoreLayout";
import { cx, finalPrice, firstAvailable, money } from "@/lib/format";
import { useBootstrap, useProducts } from "@/lib/queries";

export default function Home() {
  usePageTitle();
  const { data } = useBootstrap();
  const featured = useProducts({ featured: true, limit: 12 });
  const fresh = useProducts({ new: true, sort: "new", limit: 12 });
  const deals = useProducts({ deal: true, limit: 3 });
  if (!data) return <div className="-mt-16 h-screen bg-ink lg:-mt-[72px]" />;
  const { settings, categories, brands } = data;

  return (
    <div className="space-y-14 pb-16 sm:space-y-20">
      <Hero settings={settings} brands={brands.filter((b) => b.isFeatured).map((b) => b.name)} />

      {/* Categories */}
      <section className="wrap">
        <SectionHead title="Shop by category" href="/shop" action="See everything" />
        <div className="mt-6 grid grid-cols-3 gap-2.5 sm:gap-4 lg:grid-cols-6">
          {categories.map((c, i) => (
            <Reveal key={c.id} delay={i * 0.05}>
              <Link href={`/shop?category=${c.slug}`} className="group relative block aspect-[3/4] overflow-hidden rounded-[1.6rem] sm:rounded-blob" style={{ background: c.color }}>
                {c.image ? (
                  <img src={c.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                ) : (
                  <ProductArt kind={c.art} className="absolute inset-x-0 top-[6%] mx-auto h-[66%] drop-shadow-[0_16px_18px_rgba(38,16,28,.2)] transition-transform duration-500 group-hover:-translate-y-2 group-hover:rotate-[-8deg] group-hover:scale-110" />
                )}
                <span className="absolute inset-x-0 bottom-0 flex items-end justify-between p-3 sm:p-4">
                  <span className="font-display text-xl font-semibold leading-none sm:text-[1.7rem]">{c.name}</span>
                  <span className="hidden h-9 w-9 items-center justify-center rounded-full bg-ink text-milk transition-transform duration-300 group-hover:rotate-45 sm:flex"><ArrowUpRight size={17} /></span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {settings.dealOn && deals.data && deals.data.length > 0 && <Deal settings={settings} products={deals.data} />}

      <Rail title="Bestsellers" products={featured.data} action={<Link href="/shop?sort=popular" className="btn-line btn-sm hidden sm:inline-flex">Shop all</Link>} />

      {settings.shadeMatchOn && <ShadeMatch />}

      {settings.lashOn && <LashShowcase settings={settings} />}

      {settings.banners.length > 0 && (
        <section className="wrap grid gap-3 sm:gap-5 md:grid-cols-2">
          {settings.banners.slice(0, 4).map((b, i) => <BannerCard key={i} banner={b} flip={i % 2 === 1} />)}
        </section>
      )}

      <Rail title="Just landed" products={fresh.data} action={<Link href="/shop?new=1" className="btn-line btn-sm hidden sm:inline-flex">See all new</Link>} />

      {/* Brands */}
      <section className="wrap">
        <SectionHead title="Brands we carry" href="/brands" action="All brands" />
        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
          {brands.filter((b) => b.isFeatured).slice(0, 8).map((b) => (
            <Link key={b.id} href={`/shop?brand=${b.slug}`} className="group flex h-24 items-center justify-center rounded-3xl border border-ink/10 bg-white px-4 text-center transition-colors duration-300 hover:border-ink hover:bg-ink sm:h-28">
              {b.logo ? <img src={b.logo} alt={b.name} className="max-h-12 max-w-[70%] object-contain transition group-hover:brightness-0 group-hover:invert" /> : (
                <span className="font-display text-xl font-semibold italic transition-colors group-hover:text-milk sm:text-2xl">{b.name}</span>
              )}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionHead({ title, href, action }: { title: string; href: string; action: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 className="text-[2rem] font-semibold leading-none sm:text-[2.75rem]">{title}</h2>
      <Link href={href} className="group flex items-center gap-1.5 text-[14px] font-semibold text-pink">{action}<ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></Link>
    </div>
  );
}

// ───────────────────────────── Hero ─────────────────────────────

function Hero({ settings, brands }: { settings: Settings; brands: string[] }) {
  const shades = settings.heroShades.length ? settings.heroShades : [{ name: "Cherry", hex: "#C2183F" }];
  const [active, setActive] = useState(0);
  const shade = shades[active % shades.length];
  const words = settings.heroTitle.split(" ");

  return (
    <section className="hero-stage relative -mt-16 overflow-hidden text-milk lg:-mt-[72px]" style={{ ["--shade" as any]: shade.hex }}>
      {/* the shade name, huge, drifting behind the lipstick */}
      <div className="pointer-events-none absolute inset-x-0 top-[24%] select-none lg:top-[20%]" aria-hidden>
        <AnimatePresence mode="wait">
          <motion.div key={shade.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <Marquee speed={46}>
              <span className="ghost-type whitespace-nowrap pr-[6vw] font-display text-[30vw] font-bold italic leading-none lg:text-[19vw]">{shade.name}</span>
            </Marquee>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="wrap relative grid min-h-[calc(100svh-36px)] grid-rows-[auto_1fr_auto] pt-20 lg:max-h-[900px] lg:grid-cols-[1.05fr_1fr] lg:grid-rows-1 lg:items-center lg:pt-[72px]">
        <div className="relative z-10 pt-3 lg:pb-24 lg:pt-0">
          <h1 className="font-display text-[3.4rem] font-semibold italic leading-[0.92] sm:text-[5rem] lg:text-[clamp(4.5rem,8vw,7.6rem)]">
            {words.map((w, i) => (
              <span key={i} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
                <motion.span className="inline-block pr-[0.22em]"
                  initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ duration: 0.9, delay: 0.15 + i * 0.12, ease: [0.2, 0.8, 0.2, 1] }}>
                  {w}
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.7 }}>
            <p className="mt-4 max-w-md text-[16px] leading-relaxed text-milk/80 sm:text-[18px]">{settings.heroText}</p>
            <div className="mt-6 hidden flex-wrap gap-3 lg:flex">
              <Link href={settings.heroLink || "/shop"} className="btn-light">{settings.heroCta}<ArrowRight size={18} /></Link>
              {settings.shadeMatchOn && <a href="#shade-match" className="btn border border-milk/40 text-milk hover:bg-milk hover:text-ink">Find my shade</a>}
            </div>
          </motion.div>
        </div>

        {/* 3D lipstick */}
        <div className="relative min-h-[40svh] lg:absolute lg:inset-y-0 lg:right-0 lg:min-h-0 lg:w-[58%]">
          <div className="absolute bottom-[7%] left-1/2 h-10 w-[46%] -translate-x-1/2 rounded-[50%] bg-black/40 blur-2xl" aria-hidden />
          <Lipstick3D color={shade.hex} className="absolute inset-0 h-full w-full" />
        </div>

        {/* shade picker */}
        <motion.div className="relative z-10 pb-20 lg:absolute lg:bottom-24 lg:left-8 lg:pb-0" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 1 }}>
          <p className="text-[13px] text-milk/70">
            Pick a shade, drag to spin.{" "}
            <span className="font-semibold text-milk">{shade.name}</span>
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2.5">
            {shades.map((s, i) => (
              <button
                key={s.name + i} onClick={() => setActive(i)} aria-label={`Shade ${s.name}`} aria-pressed={i === active}
                className={cx("h-11 w-11 rounded-full border-2 transition-transform duration-300 hover:scale-110", i === active ? "scale-110 border-milk shadow-[0_0_0_4px_rgba(255,248,247,.25)]" : "border-milk/40")}
                style={{ background: s.hex }}
              />
            ))}
          </div>
          <div className="mt-5 flex gap-3 lg:hidden">
            <Link href={settings.heroLink || "/shop"} className="btn-light flex-1">{settings.heroCta}<ArrowRight size={18} /></Link>
            {settings.shadeMatchOn && <a href="#shade-match" className="btn flex-1 border border-milk/40 px-4 text-milk">Find my shade</a>}
          </div>
        </motion.div>
      </div>

      {brands.length > 0 && (
        <Marquee speed={40} className="absolute inset-x-0 bottom-0 border-t border-milk/15 bg-ink/40 py-3.5 backdrop-blur-md">
          {brands.map((b) => (
            <span key={b} className="flex items-center gap-10 pr-10 font-display text-xl italic text-milk/90">{b}<span className="h-1.5 w-1.5 rotate-45 bg-gold-light" /></span>
          ))}
        </Marquee>
      )}
    </section>
  );
}

// ───────────────────────────── Deal of the day ─────────────────────────────

function Deal({ settings, products }: { settings: Settings; products: Product[] }) {
  const left = useCountdown(settings.dealEndsAt);
  if (settings.dealEndsAt && !left) return null; // the offer has ended
  const units: [string, number][] = left ? [["days", left.days], ["hours", left.hours], ["min", left.minutes], ["sec", left.seconds]] : [];
  return (
    <section className="wrap">
      <div className="relative grid gap-6 overflow-hidden rounded-blob bg-gradient-to-br from-pink to-pink-deep p-6 text-white sm:p-9 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <span className="ghost-type pointer-events-none absolute -bottom-10 -left-4 select-none font-display text-[11rem] font-bold italic leading-none sm:text-[15rem]" aria-hidden>deal</span>
        <div className="relative">
          <h2 className="text-[2.6rem] font-semibold leading-[0.95] sm:text-[3.6rem]">{settings.dealTitle}</h2>
          {left && (
            <div className="mt-5 flex gap-2" role="timer" aria-label="Time left">
              {units.map(([label, n]) => (
                <div key={label} className="w-[62px] rounded-2xl bg-white/15 py-2.5 text-center backdrop-blur sm:w-[72px]">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span key={n} className="price block text-2xl sm:text-3xl" initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }} transition={{ duration: 0.25 }}>
                      {String(n).padStart(2, "0")}
                    </motion.span>
                  </AnimatePresence>
                  <span className="text-[11px] text-white/75">{label}</span>
                </div>
              ))}
            </div>
          )}
          <Link href="/offers" className="btn-light mt-6">See all offers<ArrowRight size={18} /></Link>
        </div>
        <div className={cx("relative grid gap-2.5", ["", "sm:grid-cols-1", "sm:grid-cols-2", "sm:grid-cols-3"][products.length])}>
          {products.map((p) => {
            const shade = firstAvailable(p);
            return (
              <Link key={p.id} href={`/product/${p.slug}`} className="group flex items-center gap-3 rounded-3xl bg-white p-2.5 text-ink transition hover:-translate-y-1 sm:block sm:p-3">
                <ProductVisual image={p.images[0]} art={p.art} color={shade?.hex} className="h-24 w-20 shrink-0 rounded-2xl sm:aspect-square sm:h-auto sm:w-full" artClass="transition-transform duration-500 group-hover:rotate-[-6deg] group-hover:scale-110" />
                <div className="min-w-0 sm:mt-3">
                  <p className="text-[12px] font-semibold text-pink">{p.brandName}</p>
                  <p className="line-clamp-2 text-[14.5px] font-medium leading-snug">{p.name}</p>
                  <p className="price mt-1 text-[17px] text-pink-deep">
                    {money(finalPrice(p), settings.currency)}
                    {finalPrice(p) < p.price && <s className="ml-1.5 text-[13px] font-normal text-ink-mute">{money(p.price, settings.currency)}</s>}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────── Shade match ─────────────────────────────

const FAMILIES = [
  { id: "nude", name: "Nude", hex: "#C98B7B" }, { id: "pink", name: "Pink", hex: "#EC5C93" }, { id: "red", name: "Red", hex: "#C2183F" },
  { id: "berry", name: "Berry", hex: "#6E1238" }, { id: "coral", name: "Coral", hex: "#F0624D" }, { id: "brown", name: "Brown", hex: "#8A5346" },
];

function ShadeMatch() {
  const [family, setFamily] = useState("pink");
  const { data, isPlaceholderData } = useProducts({ family, limit: 4 });
  const current = FAMILIES.find((f) => f.id === family)!;
  return (
    <section id="shade-match" className="scroll-mt-24 overflow-hidden bg-ink py-12 text-milk sm:py-16">
      <div className="wrap grid items-center gap-8 lg:grid-cols-[400px_1fr] lg:gap-12">
        <div className="text-center lg:text-left">
          <h2 className="text-[2.6rem] font-semibold italic leading-none sm:text-[3.6rem]">Find your shade</h2>
          <p className="mt-3 text-[15.5px] text-milk/70">Open the compact and tap the colour you feel like wearing today.</p>
          <div className="mt-2"><Compact shades={FAMILIES} active={family} onPick={setFamily} /></div>
        </div>
        <div>
          <div className={cx("rounded-blob bg-milk p-3 text-ink transition-opacity sm:p-5", isPlaceholderData && "opacity-60")}>
            {data && data.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-5 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                {data.map((p) => <ProductCard key={`${family}-${p.id}`} product={pinFamily(p, family)} />)}
              </div>
            ) : (
              <p className="py-10 text-center text-ink-soft">No {current.name.toLowerCase()} shades in stock right now. Try another colour.</p>
            )}
          </div>
          <div className="mt-5 text-center lg:text-left">
            <Link href={`/shop?family=${family}`} className="btn border border-milk/40 text-milk hover:bg-milk hover:text-ink">See every {current.name.toLowerCase()} shade<ArrowRight size={18} /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Put shades of the chosen colour family first, so the card opens on them. */
function pinFamily(p: Product, family: string): Product {
  return { ...p, shades: [...p.shades].sort((a, b) => Number(b.family === family && b.stock > 0) - Number(a.family === family && a.stock > 0)) };
}

// ───────────────────────────── Banners ─────────────────────────────

const TONES: Record<Banner["tone"], { box: string; art: string; btn: string }> = {
  pink: { box: "bg-pink text-white", art: "#FFD0E2", btn: "btn-light" },
  ink: { box: "bg-ink text-milk", art: "#C9A56B", btn: "btn-light" },
  blush: { box: "bg-blush text-ink", art: "#E8257D", btn: "btn-ink" },
  gold: { box: "bg-gold-light text-ink", art: "#B3125C", btn: "btn-ink" },
};

function BannerCard({ banner, flip }: { banner: Banner; flip: boolean }) {
  const tone = TONES[banner.tone] || TONES.pink;
  return (
    <Reveal>
      <Link href={banner.link || "/shop"} className={cx("group relative flex min-h-[230px] items-end overflow-hidden rounded-blob p-6 sm:min-h-[300px] sm:p-9", tone.box)}>
        {banner.image ? (
          <>
            <img src={banner.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <span className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/10 to-transparent" />
          </>
        ) : (
          <ProductArt kind={flip ? "mascara" : "gloss"} color={tone.art}
            className="absolute -right-2 top-1/2 h-[118%] -translate-y-1/2 rotate-[14deg] transition-transform duration-700 group-hover:rotate-[4deg] group-hover:scale-105 sm:right-6" />
        )}
        <div className={cx("relative max-w-[62%]", banner.image && "text-white")}>
          <h3 className="text-[2rem] font-semibold leading-[0.98] sm:text-[2.9rem]">{banner.title}</h3>
          {banner.text && <p className="mt-2 text-[14.5px] opacity-80">{banner.text}</p>}
          {banner.cta && <span className={cx(tone.btn, "btn-sm mt-4")}>{banner.cta}<ArrowRight size={15} /></span>}
        </div>
      </Link>
    </Reveal>
  );
}
