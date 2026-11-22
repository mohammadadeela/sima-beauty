import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { Gift, Plus, Trash2, Truck, Layers } from "lucide-react";
import type { Quote, Settings } from "@shared/types";
import { ProductVisual } from "@/components/product/ProductCard";
import { Drawer, Empty, Qty } from "@/components/ui/basics";
import { cx, finalPrice, firstAvailable, money } from "@/lib/format";
import { useProducts, useQuote, useSettings } from "@/lib/queries";
import { useBag, useUi } from "@/lib/store";

/** Progress bars that show how close the customer is to each reward. */
export function Rewards({ quote, settings, compact }: { quote: Quote; settings: Settings; compact?: boolean }) {
  const cur = settings.currency;
  const rows: { icon: typeof Truck; done: boolean; text: string; progress: number }[] = [];
  const spent = quote.subtotal - quote.bundleDiscount - quote.codeDiscount;
  if (settings.freeShippingOn && settings.freeShippingOver > 0) {
    rows.push({
      icon: Truck, done: quote.freeShipping, progress: spent / settings.freeShippingOver,
      text: quote.freeShipping ? "You unlocked free delivery" : `Add ${money(quote.toFreeShipping, cur)} more for free delivery`,
    });
  }
  if (settings.giftOn && settings.giftOver > 0 && settings.giftText) {
    rows.push({
      icon: Gift, done: !!quote.gift, progress: spent / settings.giftOver,
      text: quote.gift ? `${settings.giftText} added to your order` : `Add ${money(quote.toGift, cur)} more to get a ${settings.giftText.toLowerCase()}`,
    });
  }
  if (settings.bundleOn && settings.bundleQty > 1) {
    rows.push({
      icon: Layers, done: quote.toBundle === 0, progress: quote.itemCount / settings.bundleQty,
      text: quote.toBundle === 0 ? `${settings.bundlePercent}% bundle discount applied` : `Add ${quote.toBundle} more ${quote.toBundle === 1 ? "item" : "items"} to save ${settings.bundlePercent}%`,
    });
  }
  if (!rows.length) return null;
  return (
    <div className={cx("grid gap-2.5 rounded-3xl bg-blush-soft", compact ? "p-3" : "p-4")}>
      {rows.map((r, i) => (
        <div key={i}>
          <p className={cx("flex items-center gap-2 text-[13px] font-medium", r.done ? "text-pink-deep" : "text-ink-soft")}>
            <r.icon size={15} className="shrink-0" />{r.text}
          </p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white">
            <motion.div className={cx("h-full rounded-full", r.done ? "bg-pink" : "bg-gradient-to-r from-blush-deep to-pink-glow")}
              initial={false} animate={{ width: `${Math.min(Math.max(r.progress, 0.04), 1) * 100}%` }} transition={{ duration: 0.5 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BagLines({ quote, currency }: { quote: Quote; currency: string }) {
  const setQty = useBag((s) => s.setQty);
  const remove = useBag((s) => s.remove);
  return (
    <ul className="divide-y divide-ink/10">
      <AnimatePresence initial={false}>
        {quote.lines.map((l) => (
          <motion.li key={l.shadeId} layout initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }} className="flex gap-3.5 py-4">
            <Link href={`/product/${l.slug}?shade=${l.shadeId}`}>
              <ProductVisual image={l.image} art={l.art} color={l.shadeHex} className="h-[92px] w-[76px] shrink-0 rounded-2xl" />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="text-[12px] font-semibold text-pink">{l.brandName}</p>
              <Link href={`/product/${l.slug}?shade=${l.shadeId}`} className="truncate text-[14.5px] font-medium">{l.name}</Link>
              {l.hasShades && (
                <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-mute">
                  {l.shadeHex && <span className="h-3 w-3 rounded-full border border-black/10" style={{ background: l.shadeHex }} />}{l.shadeName}
                </p>
              )}
              <div className="mt-auto flex items-center justify-between pt-1.5">
                <Qty small value={l.qty} max={Math.min(l.stock, 20)} onChange={(n) => setQty(l.shadeId, n)} />
                <p className="price text-[15px]">
                  {money(l.price * l.qty, currency)}
                  {l.compareAt && <s className="ml-1.5 text-[12px] font-normal text-ink-mute">{money(l.compareAt * l.qty, currency)}</s>}
                </p>
              </div>
            </div>
            <button onClick={() => remove(l.shadeId)} className="flex h-8 w-8 shrink-0 items-center justify-center self-start rounded-full text-ink-mute hover:bg-blush hover:text-pink" aria-label={`Remove ${l.name}`}>
              <Trash2 size={15} />
            </button>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

export function BagDrawer() {
  const open = useUi((s) => s.bagOpen);
  const setBag = useUi((s) => s.setBag);
  const settings = useSettings();
  const { data: quote, isPlaceholderData, isError, refetch } = useQuote();
  const lines = useBag((s) => s.lines);
  const add = useBag((s) => s.add);
  const setQty = useBag((s) => s.setQty);
  const [location] = useLocation();
  const picks = useProducts({ featured: true, limit: 12 }, open);
  useEffect(() => setBag(false), [location, setBag]);

  // If something sold out since it was added, quietly sync the bag with real stock.
  useEffect(() => {
    if (!quote || isPlaceholderData) return; // only trust a quote made for the current bag
    for (const line of lines) {
      const real = quote.lines.find((l) => l.shadeId === line.shadeId);
      if (!real) setQty(line.shadeId, 0);
      else if (real.qty !== line.qty) setQty(line.shadeId, real.qty);
    }
  }, [quote, isPlaceholderData]); // eslint-disable-line react-hooks/exhaustive-deps

  const cur = settings?.currency || "₪";
  const inBag = new Set(quote?.lines.map((l) => l.productId));
  const suggestions = (picks.data || []).filter((p) => !inBag.has(p.id) && firstAvailable(p)?.stock).slice(0, 3);

  return (
    <Drawer open={open} onClose={() => setBag(false)} title={<>Your bag {quote?.itemCount ? <span className="font-sans text-[15px] font-medium text-ink-mute">({quote.itemCount})</span> : null}</>}>
      {!quote || !settings ? (
        <div className="p-5 text-center text-[15px] text-ink-soft">
          {isError ? <>We couldn't load your bag. <button onClick={() => refetch()} className="font-semibold text-pink underline">Try again</button></> : "Loading your bag…"}
        </div>
      ) : !quote.lines.length ? (
        <div className="p-5">
          <Empty title="Your bag is empty" text="Find a shade you love and it will show up here.">
            <Link href="/shop" className="btn-pink">Start shopping</Link>
          </Empty>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-5 pb-4">
            <div className="pt-4"><Rewards quote={quote} settings={settings} compact /></div>
            <BagLines quote={quote} currency={cur} />
            {suggestions.length > 0 && (
              <div className="mt-2">
                <p className="mb-2 text-[13px] font-semibold text-ink-mute">Goes well with your bag</p>
                <div className="grid gap-2">
                  {suggestions.map((p) => {
                    const shade = firstAvailable(p)!;
                    return (
                      <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-white p-2">
                        <ProductVisual image={p.images[0]} art={p.art} color={shade.hex} className="h-14 w-12 shrink-0 rounded-xl" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13.5px] font-medium">{p.name}</p>
                          <p className="price text-[13px] text-ink-soft">{money(finalPrice(p), cur)}</p>
                        </div>
                        <button onClick={() => add(shade.id)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-milk transition hover:bg-pink" aria-label={`Add ${p.name} to bag`}><Plus size={17} /></button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <footer className="shrink-0 border-t border-ink/10 bg-white px-5 pb-5 pt-4">
            {quote.bundleDiscount > 0 && (
              <p className="mb-1 flex justify-between text-[14px] text-pink-deep"><span>Bundle discount</span><span className="price">−{money(quote.bundleDiscount, cur)}</span></p>
            )}
            <p className="flex items-baseline justify-between">
              <span className="text-[15px] font-medium">Subtotal</span>
              <span className="price text-xl">{money(quote.subtotal - quote.bundleDiscount, cur)}</span>
            </p>
            <p className="mt-0.5 text-[12.5px] text-ink-mute">Delivery is calculated at checkout. Pay cash on delivery.</p>
            <Link href="/checkout" className="btn-pink mt-3 w-full">Checkout</Link>
          </footer>
        </>
      )}
    </Drawer>
  );
}
