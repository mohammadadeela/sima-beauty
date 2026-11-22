import { useEffect, useState } from "react";
import { Link, useParams, useSearch } from "wouter";
import { motion } from "framer-motion";
import { BadgeCheck, Banknote, Check, ChevronRight, RefreshCw, ShoppingBag, Truck } from "lucide-react";
import type { Product, Review } from "@shared/types";
import { ProductVisual, Rail, WishButton } from "@/components/product/ProductCard";
import { Accordion, Empty, Qty, Rating, Spinner } from "@/components/ui/basics";
import { usePageTitle } from "@/components/layout/StoreLayout";
import { api } from "@/lib/api";
import { cx, dateOnly, finalPrice, firstAvailable, hasShades, money, onSale } from "@/lib/format";
import { useMe, useProduct, useProducts, useSettings } from "@/lib/queries";
import { toast, useBag, usePrefs, useUi } from "@/lib/store";
import { burstHearts } from "@/components/ui/HeartBurst";

export default function ProductPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { data, isLoading, isError } = useProduct(slug);
  usePageTitle(data ? `${data.product.name}${data.product.brandName ? ` by ${data.product.brandName}` : ""}` : undefined);

  if (isLoading) {
    return (
      <div className="wrap grid gap-8 py-8 lg:grid-cols-2">
        <div className="skeleton aspect-square" />
        <div className="grid content-start gap-4"><div className="skeleton h-8 w-1/3" /><div className="skeleton h-14 w-3/4" /><div className="skeleton h-40" /></div>
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="wrap py-14">
        <Empty title="This product is no longer available" text="It may have sold out or been removed."><Link href="/shop" className="btn-pink">Browse all makeup</Link></Empty>
      </div>
    );
  }
  return <Details key={data.product.id} product={data.product} reviews={data.reviews} related={data.related} />;
}

function Details({ product, reviews, related }: { product: Product; reviews: Review[]; related: Product[] }) {
  const settings = useSettings();
  const cur = settings?.currency || "₪";
  const wantedShade = Number(new URLSearchParams(useSearch()).get("shade"));
  const [shadeId, setShadeId] = useState(() => product.shades.find((s) => s.id === wantedShade)?.id ?? firstAvailable(product)?.id);
  const [photo, setPhoto] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const add = useBag((s) => s.add);
  const openBag = useUi((s) => s.setBag);
  const pushRecent = usePrefs((s) => s.pushRecent);
  const recentIds = usePrefs((s) => s.recent).filter((id) => id !== product.id);
  const recent = useProducts({ ids: recentIds.join(",") }, recentIds.length > 0);

  useEffect(() => { pushRecent(product.id); }, [product.id, pushRecent]);

  const shade = product.shades.find((s) => s.id === shadeId) || product.shades[0];
  const shaded = hasShades(product);
  const stock = shade?.stock ?? 0;
  const soldOut = stock <= 0;
  const low = settings?.lowStockOn && !soldOut && stock <= settings.lowStockAt;
  const photos = [...(shade?.image ? [shade.image] : []), ...product.images];
  const mainPhoto = photos[Math.min(photo, photos.length - 1)];

  const addToBag = (e: React.MouseEvent) => {
    if (!shade || soldOut) return;
    burstHearts(e, shade.hex || undefined);
    add(shade.id, Math.min(qty, stock));
    setAdded(true);
    setTimeout(() => { openBag(true); setAdded(false); }, 650);
  };

  const buyLabel = soldOut ? "Sold out" : added ? (
    <span className="flex animate-pop items-center gap-2"><Check size={19} />Added to bag</span>
  ) : (
    <><ShoppingBag size={19} />Add to bag<span className="price ml-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[14px]">{money(finalPrice(product) * qty, cur)}</span></>
  );

  const perks = [
    { icon: BadgeCheck, text: "100% original" },
    { icon: Banknote, text: "Cash on delivery" },
    { icon: Truck, text: settings?.freeShippingOn ? `Free delivery over ${money(settings.freeShippingOver, cur)}` : "Fast delivery" },
    { icon: RefreshCw, text: "Exchange within one day" },
  ];

  return (
    <div className="pb-28 lg:pb-16">
      <nav className="wrap flex items-center gap-1 overflow-hidden whitespace-nowrap py-4 text-[13px] text-ink-mute" aria-label="Breadcrumb">
        <Link href="/shop" className="hover:text-pink">Shop</Link>
        {product.categoryName && <><ChevronRight size={13} /><Link href={`/shop?category=${product.categorySlug}`} className="hover:text-pink">{product.categoryName}</Link></>}
        <ChevronRight size={13} /><span className="truncate text-ink-soft">{product.name}</span>
      </nav>

      <div className="wrap grid gap-7 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
        {/* Gallery */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <motion.div key={mainPhoto || shade?.hex} initial={{ opacity: 0.4, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }} className="relative">
            <ProductVisual image={mainPhoto} art={product.art} color={shade?.hex || undefined} className="aspect-square w-full rounded-blob sm:aspect-[5/4] lg:aspect-square" artClass="animate-floaty !h-[72%]" />
            <div className="absolute left-4 top-4 flex gap-1.5">
              {onSale(product) && <span className="tag bg-pink text-white">Sale</span>}
              {product.isNew && <span className="tag bg-ink text-milk">New</span>}
            </div>
            <WishButton id={product.id} className="absolute right-4 top-4 !h-11 !w-11" />
          </motion.div>
          {photos.length > 1 && (
            <div className="no-scrollbar mt-3 flex gap-2.5 overflow-x-auto">
              {photos.map((src, i) => (
                <button key={src} onClick={() => setPhoto(i)} className={cx("h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 transition", i === photo ? "border-pink" : "border-transparent opacity-70 hover:opacity-100")} aria-label={`Photo ${i + 1}`}>
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Buy box */}
        <div>
          {product.brandName && <Link href={`/shop?brand=${product.brandSlug}`} className="text-[14px] font-semibold text-pink hover:underline">{product.brandName}</Link>}
          <h1 className="mt-1 text-[2.3rem] font-semibold leading-[1.02] sm:text-[3.1rem]">{product.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Rating value={product.rating} count={product.reviewCount} size={14} />
            {product.finish && <span className="tag bg-blush text-ink-soft">{product.finish}</span>}
          </div>
          <p className="price mt-4 text-[2rem] leading-none">
            {money(finalPrice(product), cur)}
            {onSale(product) && <s className="ml-2.5 text-lg font-normal text-ink-mute">{money(product.price, cur)}</s>}
          </p>

          {shaded && (
            <div className="mt-6">
              <p className="text-[14px] text-ink-soft">Shade: <span className="font-semibold text-ink">{shade?.name}</span>{soldOut && <span className="ml-2 text-pink-deep">Sold out</span>}</p>
              <div className="mt-2.5 flex flex-wrap gap-2.5">
                {product.shades.map((s) => (
                  <button
                    key={s.id} onClick={() => { setShadeId(s.id); setPhoto(0); setQty(1); }} title={s.name} aria-label={`${s.name}${s.stock <= 0 ? ", sold out" : ""}`} aria-pressed={s.id === shade?.id}
                    className={cx("relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-black/10 transition", s.id === shade?.id ? "ring-2 ring-ink ring-offset-[3px] ring-offset-milk" : "hover:scale-110")}
                    style={{ background: s.hex || "#eee" }}
                  >
                    {s.stock <= 0 && <span className="absolute h-[2px] w-[140%] rotate-45 bg-white/90" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {low && <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-blush px-3.5 py-1.5 text-[13px] font-semibold text-pink-deep"><span className="h-2 w-2 animate-pulse rounded-full bg-pink" />Only {stock} left in this shade</p>}

          <div className="mt-6 hidden gap-3 lg:flex">
            <Qty value={qty} max={Math.min(stock, 20) || 1} onChange={(n) => setQty(Math.max(1, n))} />
            <button onClick={addToBag} disabled={soldOut} className="btn-pink flex-1 text-[16px]">{buyLabel}</button>
          </div>

          {settings?.bundleOn && settings.bundleQty > 1 && (
            <p className="mt-4 rounded-2xl border border-dashed border-pink/40 bg-blush-soft px-4 py-3 text-[14px] text-ink-soft">
              Buy any <b className="text-ink">{settings.bundleQty} products</b> and save <b className="text-pink-deep">{settings.bundlePercent}%</b> on your whole bag.
            </p>
          )}

          <ul className="mt-5 grid grid-cols-2 gap-2">
            {perks.map((p) => (
              <li key={p.text} className="flex items-center gap-2.5 rounded-2xl bg-white px-3.5 py-3 text-[13.5px] font-medium text-ink-soft"><p.icon size={18} className="shrink-0 text-pink" />{p.text}</li>
            ))}
          </ul>

          <div className="mt-6 border-t border-ink/10">
            {product.description && <Accordion title="About this product" defaultOpen>{product.description}</Accordion>}
            {product.howToUse && <Accordion title="How to use">{product.howToUse}</Accordion>}
            {product.ingredients && <Accordion title="Ingredients">{product.ingredients}</Accordion>}
            <Accordion title="Delivery and exchange">
              {[...(settings?.shippingPolicy.slice(0, 2) || []), ...(settings?.exchangePolicy.slice(0, 3) || [])].join("\n")}
            </Accordion>
          </div>
        </div>
      </div>

      <Reviews product={product} reviews={reviews} />

      <div className="mt-14 space-y-14">
        <Rail title="Complete the look" products={related} />
        {recent.data && recent.data.length > 0 && <Rail title="Recently viewed" products={recent.data} />}
      </div>

      {/* Mobile buy bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-ink/10 bg-milk/95 px-4 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl lg:hidden">
        <Qty value={qty} max={Math.min(stock, 20) || 1} onChange={(n) => setQty(Math.max(1, n))} />
        <button onClick={addToBag} disabled={soldOut} className="btn-pink flex-1 px-4">{buyLabel}</button>
      </div>
    </div>
  );
}

function Reviews({ product, reviews }: { product: Product; reviews: Review[] }) {
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [name, setName] = useState(me?.name || "");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/api/products/${product.id}/reviews`, { body: { name, rating, comment } });
      setSent(true); setOpen(false);
    } catch (err: any) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="wrap mt-14">
      <div className="rounded-blob bg-blush-soft p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-[2rem] font-semibold leading-none sm:text-[2.5rem]">Reviews</h2>
            <div className="mt-2">{product.reviewCount ? <Rating value={product.rating} count={product.reviewCount} size={15} /> : <p className="text-[14.5px] text-ink-soft">No reviews yet. Tried it? Tell others what you think.</p>}</div>
          </div>
          {sent ? <p className="flex items-center gap-2 text-[14px] font-semibold text-pink-deep"><Check size={16} />Thank you. Your review will appear once approved.</p>
            : !open && <button onClick={() => setOpen(true)} className="btn-ink btn-sm">Write a review</button>}
        </div>
        {open && (
          <form onSubmit={submit} className="mt-5 grid gap-3 rounded-3xl bg-white p-4 sm:grid-cols-2 sm:p-5">
            <div>
              <span className="label">Your rating</span>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} out of 5`} className={cx("flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-bold transition", n <= rating ? "bg-pink text-white" : "bg-blush text-ink-mute")}>{n}</button>
                ))}
              </div>
            </div>
            <div><label className="label" htmlFor="rv-name">Your name</label><input id="rv-name" className="field" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} /></div>
            <div className="sm:col-span-2"><label className="label" htmlFor="rv-text">Your review</label><textarea id="rv-text" className="field" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={800} placeholder="How did it feel? How long did it last?" /></div>
            <div className="flex gap-2 sm:col-span-2"><button className="btn-pink btn-sm" disabled={busy}>{busy ? <Spinner className="h-4 w-4" /> : "Send review"}</button><button type="button" onClick={() => setOpen(false)} className="btn-line btn-sm">Cancel</button></div>
          </form>
        )}
        {reviews.length > 0 && (
          <ul className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-3xl bg-white p-5">
                <Rating value={r.rating} />
                {r.comment && <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">{r.comment}</p>}
                <p className="mt-3 text-[13px] font-semibold">{r.name} <span className="ml-1 font-normal text-ink-mute">{dateOnly(r.createdAt)}</span></p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
