import { Link } from "wouter";
import { Gift, Layers, Tag, Truck } from "lucide-react";
import { ProductGrid } from "@/components/product/ProductCard";
import { Empty, Reveal, useCountdown } from "@/components/ui/basics";
import { usePageTitle } from "@/components/layout/StoreLayout";
import { money } from "@/lib/format";
import { useBootstrap, useProducts } from "@/lib/queries";
import { usePrefs } from "@/lib/store";

export function Wishlist() {
  usePageTitle("Wishlist");
  const ids = usePrefs((s) => s.wishlist);
  const { data, isLoading } = useProducts({ ids: ids.join(",") }, ids.length > 0);
  const products = data?.filter((p) => ids.includes(p.id));
  return (
    <div className="wrap py-10 sm:py-14">
      <h1 className="text-[2.6rem] font-semibold leading-none sm:text-[3.6rem]">Wishlist</h1>
      <div className="mt-7">
        {!ids.length || (products && !products.length) ? (
          <Empty title="Nothing saved yet" text="Tap the heart on any product to keep it here."><Link href="/shop" className="btn-pink">Find something to love</Link></Empty>
        ) : <ProductGrid products={products} loading={isLoading} count={4} />}
      </div>
    </div>
  );
}

export function Brands() {
  usePageTitle("Brands");
  const { data } = useBootstrap();
  return (
    <div className="wrap py-10 sm:py-14">
      <h1 className="text-[2.6rem] font-semibold leading-none sm:text-[3.6rem]">Brands</h1>
      <p className="mt-3 text-[15.5px] text-ink-soft">Every product is 100% original.</p>
      <div className="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {data?.brands.map((b, i) => (
          <Reveal key={b.id} delay={(i % 4) * 0.05}>
            <Link href={`/shop?brand=${b.slug}`} className="group flex h-36 flex-col items-center justify-center rounded-blob bg-white px-4 text-center shadow-soft transition-colors duration-300 hover:bg-pink sm:h-44">
              {b.logo ? <img src={b.logo} alt={b.name} className="max-h-14 max-w-[70%] object-contain" /> : <span className="font-display text-2xl font-semibold italic transition-colors group-hover:text-white sm:text-3xl">{b.name}</span>}
              <span className="mt-2 text-[13px] text-ink-mute transition-colors group-hover:text-white/80">{b.productCount} {b.productCount === 1 ? "product" : "products"}</span>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

export function Offers() {
  usePageTitle("Offers");
  const { data } = useBootstrap();
  const s = data?.settings;
  const sale = useProducts({ sale: true, sort: "popular" });
  const left = useCountdown(s?.dealOn ? s.dealEndsAt : undefined);
  if (!s) return null;
  const cur = s.currency;
  const cards = [
    s.bundleOn && s.bundleQty > 1 && { icon: Layers, title: `Buy ${s.bundleQty}, save ${s.bundlePercent}%`, text: "Mix any products. The discount is applied in your bag." },
    s.freeShippingOn && { icon: Truck, title: `Free delivery over ${money(s.freeShippingOver, cur)}`, text: "To every area we deliver to." },
    s.giftOn && s.giftText && { icon: Gift, title: `${s.giftText} over ${money(s.giftOver, cur)}`, text: "Added to your order automatically." },
    s.welcomeOn && s.welcomeCode && { icon: Tag, title: s.welcomeTitle, text: `Use code ${s.welcomeCode} at checkout.` },
  ].filter(Boolean) as { icon: typeof Tag; title: string; text: string }[];

  return (
    <div className="pb-16">
      <div className="bg-gradient-to-br from-pink to-pink-deep text-white">
        <div className="wrap py-9 sm:py-12">
          <h1 className="text-[3rem] font-semibold italic leading-none sm:text-[4.6rem]">Offers</h1>
          {left && <p className="mt-3 text-[15px] text-white/85">{s.dealTitle} ends in {left.days > 0 ? `${left.days}d ` : ""}{left.hours}h {left.minutes}m {left.seconds}s</p>}
          <div className="mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((c) => (
              <div key={c.title} className="rounded-3xl bg-white/15 p-4 backdrop-blur">
                <c.icon size={22} />
                <p className="mt-2 font-display text-xl font-semibold leading-tight">{c.title}</p>
                <p className="mt-1 text-[13.5px] text-white/80">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="wrap mt-8">
        <h2 className="mb-5 text-[2rem] font-semibold leading-none sm:text-[2.6rem]">On sale now</h2>
        {sale.data && !sale.data.length ? (
          <Empty title="No sale items right now" text="New offers land often. Check back soon."><Link href="/shop" className="btn-pink">Browse all makeup</Link></Empty>
        ) : <ProductGrid products={sale.data} loading={sale.isLoading} />}
      </div>
    </div>
  );
}

export function NotFound() {
  usePageTitle("Page not found");
  return (
    <div className="wrap py-16">
      <Empty title="This page doesn't exist" text="The link may be old or mistyped."><Link href="/" className="btn-pink">Go to the home page</Link></Empty>
    </div>
  );
}
