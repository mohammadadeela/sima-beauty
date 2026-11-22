import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { SlidersHorizontal, X } from "lucide-react";
import { SHADE_FAMILIES } from "@shared/types";
import { ProductGrid } from "@/components/product/ProductCard";
import { Drawer, Empty } from "@/components/ui/basics";
import { usePageTitle } from "@/components/layout/StoreLayout";
import { cx } from "@/lib/format";
import { useBootstrap, useProducts } from "@/lib/queries";

const FAMILY_HEX: Record<string, string> = { nude: "#C98B7B", pink: "#EC5C93", red: "#C2183F", berry: "#6E1238", coral: "#F0624D", brown: "#8A5346" };
const SORTS = [["popular", "Most popular"], ["new", "Newest"], ["price-asc", "Price: low to high"], ["price-desc", "Price: high to low"]];
const PRICES = [["", "Any price"], ["30", "Under 30"], ["50", "Under 50"], ["80", "Under 80"]];

export default function Shop() {
  const { data } = useBootstrap();
  const search = useSearch();
  const [, navigate] = useLocation();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const params = new URLSearchParams(search);
  const get = (k: string) => params.get(k) || "";

  const category = data?.categories.find((c) => c.slug === get("category"));
  const brand = data?.brands.find((b) => b.slug === get("brand"));
  const title = get("q") ? `Results for "${get("q")}"` : brand && category ? `${brand.name} ${category.name}` : brand?.name || category?.name || (get("sale") ? "On sale" : get("new") ? "Just landed" : "All makeup");
  usePageTitle(title);

  const { data: products, isPlaceholderData, isLoading } = useProducts({
    category: get("category"), brand: get("brand"), family: get("family"), q: get("q"),
    sale: get("sale") === "1", new: get("new") === "1", max: get("max"), sort: get("sort") || "popular",
  });

  /** Change one filter and keep the rest. */
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(search);
    if (value) next.set(key, value); else next.delete(key);
    navigate(`/shop${next.toString() ? `?${next}` : ""}`, { replace: true });
  };
  const activeCount = ["brand", "family", "sale", "new", "max"].filter((k) => get(k)).length;
  const cur = data?.settings.currency || "₪";

  const filters = (
    <div className="grid gap-7">
      <FilterGroup title="Brand">
        <div className="grid gap-0.5">
          {data?.brands.map((b) => (
            <button key={b.id} onClick={() => set("brand", get("brand") === b.slug ? "" : b.slug)}
              className={cx("flex items-center justify-between rounded-xl px-3 py-2 text-left text-[14.5px] transition", get("brand") === b.slug ? "bg-ink font-semibold text-milk" : "hover:bg-blush-soft")}>
              {b.name}<span className={cx("text-[12px]", get("brand") === b.slug ? "text-milk/60" : "text-ink-mute")}>{b.productCount}</span>
            </button>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="Shade">
        <div className="flex flex-wrap gap-2.5">
          {SHADE_FAMILIES.map((f) => (
            <button key={f} onClick={() => set("family", get("family") === f ? "" : f)} aria-pressed={get("family") === f} className="flex flex-col items-center gap-1">
              <span className={cx("h-9 w-9 rounded-full border border-black/10 transition", get("family") === f ? "ring-2 ring-ink ring-offset-2 ring-offset-milk" : "hover:scale-110")} style={{ background: FAMILY_HEX[f] }} />
              <span className="text-[11.5px] capitalize text-ink-soft">{f}</span>
            </button>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="Price">
        <div className="flex flex-wrap gap-2">
          {PRICES.map(([v, label]) => (
            <button key={v} onClick={() => set("max", v)} className={cx("chip", get("max") === v && "chip-on")}>{v ? `Under ${cur}${v}` : label}</button>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="Show only">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => set("sale", get("sale") ? "" : "1")} className={cx("chip", get("sale") && "chip-on")}>On sale</button>
          <button onClick={() => set("new", get("new") ? "" : "1")} className={cx("chip", get("new") && "chip-on")}>New in</button>
        </div>
      </FilterGroup>
    </div>
  );

  return (
    <div className="pb-16">
      <div className="bg-blush-soft">
        <div className="wrap py-7 sm:py-10">
          <h1 className="text-[2.6rem] font-semibold leading-none sm:text-[4rem]">{title}</h1>
          {brand?.description && <p className="mt-3 max-w-xl text-[15px] text-ink-soft">{brand.description}</p>}
          <div className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <button onClick={() => set("category", "")} className={cx("chip", !get("category") && "chip-on")}>All</button>
            {data?.categories.map((c) => (
              <button key={c.id} onClick={() => set("category", c.slug)} className={cx("chip", get("category") === c.slug && "chip-on")}>{c.name}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="wrap mt-6 grid gap-8 lg:grid-cols-[230px_1fr]">
        <aside className="hidden lg:block"><div className="sticky top-24">{filters}</div></aside>
        <div>
          <div className="mb-5 flex items-center justify-between gap-3">
            <button onClick={() => setFiltersOpen(true)} className="chip lg:hidden">
              <SlidersHorizontal size={15} />Filters{activeCount > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-pink text-[11px] font-bold text-white">{activeCount}</span>}
            </button>
            <p className="hidden text-[14px] text-ink-mute lg:block">{products ? `${products.length} ${products.length === 1 ? "product" : "products"}` : ""}</p>
            <div className="flex items-center gap-2">
              {(activeCount > 0 || get("q")) && (
                <Link href={get("category") ? `/shop?category=${get("category")}` : "/shop"} className="hidden items-center gap-1 text-[13px] font-medium text-pink sm:flex"><X size={14} />Clear filters</Link>
              )}
              <select value={get("sort") || "popular"} onChange={(e) => set("sort", e.target.value === "popular" ? "" : e.target.value)} aria-label="Sort products"
                className="h-9 cursor-pointer rounded-full border border-ink/15 bg-white px-4 text-[13px] font-medium outline-none focus:border-pink">
                {SORTS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
              </select>
            </div>
          </div>
          {products && !products.length ? (
            <Empty title="Nothing matches those filters" text="Remove a filter or browse everything we have.">
              <Link href="/shop" className="btn-pink">Show all makeup</Link>
            </Empty>
          ) : (
            <div className={cx("transition-opacity", isPlaceholderData && "opacity-50")}><ProductGrid products={products} loading={isLoading} /></div>
          )}
        </div>
      </div>

      <Drawer open={filtersOpen} onClose={() => setFiltersOpen(false)} side="left" title="Filters">
        <div className="flex-1 overflow-y-auto p-5">{filters}</div>
        <div className="border-t border-ink/10 p-4"><button onClick={() => setFiltersOpen(false)} className="btn-pink w-full">Show {products?.length ?? ""} products</button></div>
      </Drawer>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2.5 font-display text-lg font-semibold">{title}</p>
      {children}
    </div>
  );
}
