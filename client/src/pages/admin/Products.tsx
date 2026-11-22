import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ImagePlus, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { ART_KINDS, SHADE_FAMILIES, type ArtKind, type Brand, type Category, type Product } from "@shared/types";
import { ProductArt } from "@/components/brand/ProductArt";
import { ProductVisual } from "@/components/product/ProductCard";
import { Drawer, Spinner } from "@/components/ui/basics";
import { api } from "@/lib/api";
import { cx, finalPrice, hasShades, money, onSale, totalStock } from "@/lib/format";
import { useSettings } from "@/lib/queries";
import { toast } from "@/lib/store";
import { Badge, confirmDelete, Field, IconBtn, NumberInput, PageHead, run, Table, Toggle, uploadImages } from "./ui";

interface ShadeDraft { id?: number; name: string; hex: string; family: string; stock: number; image: string | null }
interface Draft {
  id?: number; name: string; brandId: number | null; categoryId: number | null;
  description: string; howToUse: string; ingredients: string;
  price: number; salePrice: number | null; images: string[]; art: ArtKind; finish: string;
  isActive: boolean; isFeatured: boolean; isNew: boolean; isDeal: boolean;
  shades: ShadeDraft[]; withShades: boolean;
}

const blank = (): Draft => ({
  name: "", brandId: null, categoryId: null, description: "", howToUse: "", ingredients: "",
  price: 0, salePrice: null, images: [], art: "lipstick", finish: "",
  isActive: true, isFeatured: false, isNew: true, isDeal: false,
  shades: [{ name: "", hex: "", family: "", stock: 10, image: null }], withShades: false,
});

const fromProduct = (p: Product): Draft => ({
  id: p.id, name: p.name, brandId: p.brandId, categoryId: p.categoryId, description: p.description, howToUse: p.howToUse, ingredients: p.ingredients,
  price: p.price, salePrice: p.salePrice, images: p.images, art: p.art, finish: p.finish,
  isActive: p.isActive, isFeatured: p.isFeatured, isNew: p.isNew, isDeal: p.isDeal,
  shades: p.shades.map((s) => ({ id: s.id, name: s.name, hex: s.hex, family: s.family, stock: s.stock, image: s.image })),
  withShades: hasShades(p),
});

export default function Products() {
  const cur = useSettings()?.currency || "₪";
  const { data: products } = useQuery<Product[]>({ queryKey: ["/api/admin/products"] });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/admin/categories"] });
  const { data: brands = [] } = useQuery<Brand[]>({ queryKey: ["/api/admin/brands"] });
  const [text, setText] = useState("");
  const [cat, setCat] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const term = text.trim().toLowerCase();
  const shown = products?.filter((p) => (!cat || p.categoryId === cat) && (!term || `${p.name} ${p.brandName}`.toLowerCase().includes(term)));
  const flip = (p: Product, key: "isActive" | "isFeatured" | "isNew" | "isDeal") =>
    run(() => api(`/api/admin/products/${p.id}`, { method: "PATCH", body: { [key]: !p[key] } }), "Updated");

  return (
    <>
      <PageHead title="Products" hint={products ? `${products.length} products. Click the pencil to edit.` : undefined}>
        <button onClick={() => setDraft(blank())} className="btn-pink"><Plus size={18} />Add product</button>
      </PageHead>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button onClick={() => setCat(null)} className={cx("chip", !cat && "chip-on")}>All</button>
        {categories.map((c) => <button key={c.id} onClick={() => setCat(c.id)} className={cx("chip", cat === c.id && "chip-on")}>{c.name}</button>)}
        <div className="relative ml-auto w-full sm:w-64">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-mute" />
          <input className="field h-10 pl-10" placeholder="Search products" value={text} onChange={(e) => setText(e.target.value)} aria-label="Search products" />
        </div>
      </div>
      <Table head={["Product", "Price", "Stock", "On store", "Bestseller", "New", "Deal", ""]} empty={shown && !shown.length}>
        {shown?.map((p) => {
          const stock = totalStock(p);
          return (
            <tr key={p.id}>
              <td>
                <button onClick={() => setDraft(fromProduct(p))} className="flex items-center gap-3 text-left">
                  <ProductVisual image={p.images[0]} art={p.art} color={p.shades[0]?.hex} className="h-14 w-12 shrink-0 rounded-xl" />
                  <span><span className="block font-semibold">{p.name}</span><span className="text-[12.5px] text-ink-mute">{[p.brandName, p.categoryName].filter(Boolean).join(", ")}</span></span>
                </button>
              </td>
              <td className="price whitespace-nowrap">{money(finalPrice(p), cur)}{onSale(p) && <s className="ml-1.5 text-[12.5px] font-normal text-ink-mute">{money(p.price, cur)}</s>}</td>
              <td><Badge tone={stock === 0 ? "grey" : stock <= 5 ? "amber" : "green"}>{stock === 0 ? "Sold out" : stock}</Badge>{hasShades(p) && <span className="ml-2 text-[12.5px] text-ink-mute">{p.shades.length} shades</span>}</td>
              <td><Toggle on={p.isActive} onChange={() => flip(p, "isActive")} /></td>
              <td><Toggle on={p.isFeatured} onChange={() => flip(p, "isFeatured")} /></td>
              <td><Toggle on={p.isNew} onChange={() => flip(p, "isNew")} /></td>
              <td><Toggle on={p.isDeal} onChange={() => flip(p, "isDeal")} /></td>
              <td>
                <div className="flex justify-end">
                  <IconBtn label="Edit" onClick={() => setDraft(fromProduct(p))}><Pencil size={16} /></IconBtn>
                  <IconBtn label="Delete" danger onClick={() => confirmDelete(`"${p.name}"`) && run(() => api(`/api/admin/products/${p.id}`, { method: "DELETE" }), "Product deleted")}><Trash2 size={16} /></IconBtn>
                </div>
              </td>
            </tr>
          );
        })}
      </Table>
      <Drawer open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? "Edit product" : "Add product"} wide>
        {draft && <ProductForm key={draft.id ?? "new"} initial={draft} categories={categories} brands={brands} currency={cur} onDone={() => setDraft(null)} />}
      </Drawer>
    </>
  );
}

function ProductForm({ initial, categories, brands, currency, onDone }: { initial: Draft; categories: Category[]; brands: Brand[]; currency: string; onDone: () => void }) {
  const [d, setD] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const setShade = (i: number, patch: Partial<ShadeDraft>) => set("shades", d.shades.map((s, n) => (n === i ? { ...s, ...patch } : s)));

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try { const urls = await uploadImages(files); setD((x) => ({ ...x, images: [...x.images, ...urls] })); }
    catch (err: any) { toast(err.message, "error"); }
    finally { setUploading(false); }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!d.name.trim()) return toast("Give the product a name.", "error");
    if (!(d.price > 0)) return toast("Set a price above zero.", "error");
    if (d.withShades && d.shades.some((s) => !s.name.trim())) return toast("Every shade needs a name.", "error");
    const { withShades, id, ...body } = d;
    const shades = withShades ? d.shades : [{ ...d.shades[0], name: "", hex: "", family: "" }];
    setBusy(true);
    const ok = await run(() => api(id ? `/api/admin/products/${id}` : "/api/admin/products", { method: id ? "PUT" : "POST", body: { ...body, shades } }), id ? "Product saved" : "Product added");
    setBusy(false);
    if (ok) onDone();
  };

  return (
    <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
      <div className="grid flex-1 content-start gap-5 overflow-y-auto p-5">
        <Field label="Product name"><input className="field" value={d.name} onChange={(e) => set("name", e.target.value)} placeholder="Velvet Matte Lipstick" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Brand">
            <select className="field" value={d.brandId ?? ""} onChange={(e) => set("brandId", e.target.value ? Number(e.target.value) : null)}>
              <option value="">No brand</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="Category">
            <select className="field" value={d.categoryId ?? ""} onChange={(e) => { const c = categories.find((x) => x.id === Number(e.target.value)); setD((x) => ({ ...x, categoryId: c?.id ?? null, art: !x.id && c ? c.art : x.art })); }}>
              <option value="">No category</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Price"><NumberInput value={d.price} onChange={(n) => set("price", n)} prefix={currency} step={0.5} /></Field>
          <Field label="Sale price" hint="Leave empty when not on sale.">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-mute">{currency}</span>
              <input type="number" className="field pl-9" min={0} step={0.5} value={d.salePrice ?? ""} onChange={(e) => set("salePrice", e.target.value === "" ? null : Number(e.target.value))} />
            </div>
          </Field>
        </div>

        <div>
          <span className="label">Photos</span>
          <div className="flex flex-wrap gap-2.5">
            {d.images.map((src, i) => (
              <div key={src} className="relative h-24 w-24 overflow-hidden rounded-2xl">
                <img src={src} alt="" className="h-full w-full object-cover" />
                {i === 0 && <span className="absolute inset-x-0 bottom-0 bg-ink/70 py-0.5 text-center text-[10.5px] font-semibold text-white">Main</span>}
                <button type="button" onClick={() => set("images", d.images.filter((x) => x !== src))} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white" aria-label="Remove photo"><X size={13} /></button>
                {i > 0 && <button type="button" onClick={() => set("images", [src, ...d.images.filter((x) => x !== src)])} className="absolute left-1 top-1 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold">Make main</button>}
              </div>
            ))}
            <button type="button" onClick={() => file.current?.click()} className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-ink/20 bg-blush-soft text-[12px] font-medium text-ink-soft hover:border-pink">
              {uploading ? <Spinner className="text-pink" /> : <><ImagePlus size={20} />Add photos</>}
            </button>
            <input ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
          </div>
          {d.images.length === 0 && (
            <div className="mt-3">
              <p className="mb-2 text-[12.5px] text-ink-mute">No photo yet? The store shows this illustration instead, in the shade colour:</p>
              <div className="flex flex-wrap gap-1.5">
                {ART_KINDS.map((k) => (
                  <button key={k} type="button" onClick={() => set("art", k)} title={k} aria-label={`Illustration ${k}`} aria-pressed={d.art === k}
                    className={cx("rounded-xl border-2 bg-blush-soft p-1 transition", d.art === k ? "border-pink" : "border-transparent hover:border-ink/20")}>
                    <ProductArt kind={k} color={d.shades[0]?.hex || undefined} className="h-12 w-10" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Shades and stock */}
        <div className="rounded-3xl bg-blush-soft p-4">
          <Toggle on={d.withShades} onChange={(v) => set("withShades", v)} label="This product comes in shades" hint="Turn off for products with a single version, like a brush." />
          {!d.withShades ? (
            <Field label="Pieces in stock" className="mt-4 max-w-[160px]"><NumberInput value={d.shades[0].stock} onChange={(n) => setShade(0, { stock: Math.round(n) })} /></Field>
          ) : (
            <div className="mt-4 grid gap-2">
              <div className="grid grid-cols-[44px_1fr_104px_76px_36px] gap-2 px-0.5 text-[12px] font-semibold text-ink-mute"><span>Colour</span><span>Shade name</span><span>Colour family</span><span>Stock</span><span /></div>
              {d.shades.map((s, i) => (
                <div key={s.id ?? `n${i}`} className="grid grid-cols-[44px_1fr_104px_76px_36px] items-center gap-2">
                  <input type="color" value={s.hex || "#E8257D"} onChange={(e) => setShade(i, { hex: e.target.value.toUpperCase() })} className="h-11 w-11 cursor-pointer rounded-full border-0 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-2 [&::-webkit-color-swatch]:border-white" aria-label="Shade colour" />
                  <input className="field h-11 px-3" value={s.name} onChange={(e) => setShade(i, { name: e.target.value })} placeholder="Cherry Bomb" aria-label="Shade name" />
                  <select className="field h-11 px-2 capitalize" value={s.family} onChange={(e) => setShade(i, { family: e.target.value })} aria-label="Colour family">
                    <option value="">None</option>{SHADE_FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <input type="number" min={0} className="field h-11 px-3" value={s.stock} onChange={(e) => setShade(i, { stock: Math.max(0, Math.round(Number(e.target.value))) })} aria-label="Stock" />
                  <IconBtn label="Remove shade" danger disabled={d.shades.length === 1} onClick={() => set("shades", d.shades.filter((_, n) => n !== i))}><Trash2 size={15} /></IconBtn>
                </div>
              ))}
              <button type="button" onClick={() => set("shades", [...d.shades, { name: "", hex: "#E8257D", family: "", stock: 10, image: null }])} className="btn-line btn-sm mt-1 justify-self-start bg-white"><Plus size={15} />Add shade</button>
              <p className="text-[12.5px] text-ink-mute">The colour family powers the "Find your shade" picker on the home page.</p>
            </div>
          )}
        </div>

        <Field label="Finish" hint="Shown as a small tag, for example Matte or Glossy."><input className="field" value={d.finish} onChange={(e) => set("finish", e.target.value)} /></Field>
        <Field label="Description"><textarea className="field" rows={3} value={d.description} onChange={(e) => set("description", e.target.value)} /></Field>
        <Field label="How to use"><textarea className="field" rows={2} value={d.howToUse} onChange={(e) => set("howToUse", e.target.value)} /></Field>
        <Field label="Ingredients"><textarea className="field" rows={2} value={d.ingredients} onChange={(e) => set("ingredients", e.target.value)} /></Field>

        <div className="grid gap-3.5 rounded-3xl bg-blush-soft p-4 sm:grid-cols-2">
          <Toggle on={d.isActive} onChange={(v) => set("isActive", v)} label="Show on the store" />
          <Toggle on={d.isFeatured} onChange={(v) => set("isFeatured", v)} label="Bestseller" hint="Appears in the Bestsellers row." />
          <Toggle on={d.isNew} onChange={(v) => set("isNew", v)} label="New" hint="Gets a New tag and joins Just landed." />
          <Toggle on={d.isDeal} onChange={(v) => set("isDeal", v)} label="Deal of the day" hint="Shown in the deal banner. Set a sale price too." />
        </div>
      </div>
      <div className="flex shrink-0 gap-2 border-t border-ink/10 bg-white p-4">
        <button className="btn-pink flex-1" disabled={busy}>{busy ? <Spinner /> : d.id ? "Save product" : "Add product"}</button>
        <button type="button" onClick={onDone} className="btn-line">Cancel</button>
      </div>
    </form>
  );
}
