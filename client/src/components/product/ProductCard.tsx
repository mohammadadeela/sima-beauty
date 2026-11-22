import { useRef, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Heart, Plus } from "lucide-react";
import type { ArtKind, Product } from "@shared/types";
import { ProductArt } from "@/components/brand/ProductArt";
import { cx, finalPrice, firstAvailable, hasShades, money, onSale, tint, totalStock } from "@/lib/format";
import { toast, useBag, usePrefs, useUi } from "@/lib/store";
import { useSettings } from "@/lib/queries";
import { burstHearts } from "@/components/ui/HeartBurst";

/** A product photo, or its tinted illustration when no photo was uploaded. */
export function ProductVisual({ image, art, color, className, artClass }: { image?: string | null; art: ArtKind; color?: string; className?: string; artClass?: string }) {
  // If a photo fails to load, show the illustration instead of a broken image.
  const [broken, setBroken] = useState<string | null>(null);
  const photo = image && image !== broken ? image : null;
  return (
    <div className={cx("relative overflow-hidden", className)} style={{ background: photo ? "#fff" : tint(color || "#FFA6C9", 0.8), transition: "background .4s" }}>
      {photo ? (
        <img src={photo} alt="" loading="lazy" onError={() => setBroken(photo)} className="h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center">
          <ProductArt kind={art} color={color} className={cx("h-[80%] drop-shadow-[0_14px_18px_rgba(38,16,28,.18)]", artClass)} />
        </span>
      )}
    </div>
  );
}

export function WishButton({ id, className }: { id: number; className?: string }) {
  const on = usePrefs((s) => s.wishlist.includes(id));
  const toggle = usePrefs((s) => s.toggleWish);
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); if (!on) burstHearts(e); toggle(id); }}
      aria-label={on ? "Remove from wishlist" : "Save to wishlist"} aria-pressed={on}
      className={cx("flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink shadow-soft transition hover:scale-110", className)}
    >
      <Heart size={17} className={cx("transition", on && "fill-pink text-pink")} key={String(on)} style={on ? { animation: "pop .4s both" } : undefined} />
    </button>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const settings = useSettings();
  const [shadeId, setShadeId] = useState(() => firstAvailable(product)?.id);
  const shade = product.shades.find((s) => s.id === shadeId) || product.shades[0];
  const soldOut = totalStock(product) <= 0;
  const add = useBag((s) => s.add);
  const openBag = useUi((s) => s.setBag);
  const href = `/product/${product.slug}${shade && hasShades(product) ? `?shade=${shade.id}` : ""}`;
  const shown = product.shades.slice(0, 5);

  const quickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!shade || shade.stock <= 0) return toast("This shade is sold out. Pick another one.", "error");
    burstHearts(e, shade.hex || undefined);
    add(shade.id);
    setTimeout(() => openBag(true), 350);
  };

  return (
    <article className="group relative flex h-full flex-col">
      <Link href={href} className="relative block overflow-hidden rounded-[1.6rem]">
        <ProductVisual
          image={shade?.image || product.images[0]} art={product.art} color={shade?.hex || undefined}
          className={cx("aspect-[4/5] w-full", soldOut && "opacity-45")}
          artClass="transition-transform duration-500 group-hover:-translate-y-2 group-hover:rotate-[-5deg] group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {onSale(product) && !soldOut && <span className="tag bg-pink text-white">Sale</span>}
          {product.isNew && !soldOut && <span className="tag bg-ink text-milk">New</span>}
        </div>
        {soldOut && (
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-milk">Sold out</span>
        )}
        {!soldOut && (
          <button
            type="button" onClick={quickAdd} aria-label={`Add ${product.name} to bag`}
            className="absolute bottom-3 right-3 flex h-11 items-center gap-1.5 overflow-hidden rounded-full bg-ink px-3 text-[13px] font-semibold text-milk shadow-lift transition-all duration-300 hover:bg-pink lg:translate-y-3 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100"
          >
            <Plus size={18} /><span className="hidden pr-1 lg:inline">Add to bag</span>
          </button>
        )}
      </Link>
      <WishButton id={product.id} className="absolute right-3 top-3" />

      <div className="flex flex-1 flex-col px-1 pt-3">
        {product.brandName && <p className="text-[12px] font-semibold text-pink">{product.brandName}</p>}
        <Link href={href} className="mt-0.5 line-clamp-2 text-[14.5px] font-medium leading-snug text-ink hover:text-pink">{product.name}</Link>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <p className="price text-[15.5px]">
            {money(finalPrice(product), settings?.currency)}
            {onSale(product) && <s className="ml-1.5 text-[13px] font-normal text-ink-mute">{money(product.price, settings?.currency)}</s>}
          </p>
          {hasShades(product) && (
            <div className="flex items-center gap-1">
              {shown.map((s) => (
                <button
                  key={s.id} type="button" title={s.name} aria-label={`Shade ${s.name}`}
                  onClick={() => setShadeId(s.id)}
                  className={cx("h-[18px] w-[18px] rounded-full border border-black/10 transition", s.id === shade?.id ? "ring-2 ring-ink ring-offset-2 ring-offset-milk" : "hover:scale-125", s.stock <= 0 && "opacity-35")}
                  style={{ background: s.hex || "#ddd" }}
                />
              ))}
              {product.shades.length > shown.length && <span className="pl-0.5 text-[11px] font-semibold text-ink-mute">+{product.shades.length - shown.length}</span>}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, loading, count = 8 }: { products?: Product[]; loading?: boolean; count?: number }) {
  if (loading || !products) {
    return (
      <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4">
        {[...Array(count)].map((_, i) => <div key={i} className="skeleton aspect-[4/6]" />)}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4">
      {products.map((p, i) => (
        <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: Math.min(i, 8) * 0.04 }}>
          <ProductCard product={p} />
        </motion.div>
      ))}
    </div>
  );
}

/** A sideways-scrolling row of products with arrow buttons. */
export function Rail({ title, action, products, dark }: { title: ReactNode; action?: ReactNode; products?: Product[]; dark?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  if (products && !products.length) return null;
  const slide = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });
  const arrow = cx("hidden h-11 w-11 items-center justify-center rounded-full border transition sm:flex", dark ? "border-milk/30 text-milk hover:bg-milk hover:text-ink" : "border-ink/15 hover:bg-ink hover:text-milk");
  return (
    <section>
      <div className="wrap flex items-end justify-between gap-4">
        <h2 className={cx("text-[2rem] font-semibold leading-none sm:text-[2.75rem]", dark && "text-milk")}>{title}</h2>
        <div className="flex items-center gap-2">
          {action}
          <button className={arrow} onClick={() => slide(-1)} aria-label="Previous"><ChevronLeft size={20} /></button>
          <button className={arrow} onClick={() => slide(1)} aria-label="Next"><ChevronRight size={20} /></button>
        </div>
      </div>
      <div ref={ref} className="no-scrollbar mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-2 sm:gap-5 sm:px-6 lg:px-[max(2rem,calc((100vw-1320px)/2+2rem))]">
        {(products || [...Array(5)]).map((p, i) => (
          <div key={p?.id ?? i} className="w-[46%] shrink-0 snap-start sm:w-[30%] lg:w-[22.5%] xl:w-[19%]">
            {p ? <ProductCard product={p} /> : <div className="skeleton aspect-[4/6]" />}
          </div>
        ))}
      </div>
    </section>
  );
}
