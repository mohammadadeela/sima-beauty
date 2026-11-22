import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { ART_KINDS, type ArtKind, type Brand, type Category } from "@shared/types";
import { ProductArt } from "@/components/brand/ProductArt";
import { Modal } from "@/components/ui/basics";
import { api } from "@/lib/api";
import { cx } from "@/lib/format";
import { Badge, Card, confirmDelete, Field, IconBtn, ImageInput, NumberInput, PageHead, run, Toggle } from "./ui";

type CatDraft = Omit<Category, "id" | "slug" | "productCount"> & { id?: number };
type BrandDraft = Omit<Brand, "id" | "slug" | "productCount"> & { id?: number };
const TILE_COLORS = ["#FFB8D2", "#FFA6C9", "#FFD0E2", "#E7C6F0", "#F6DDF0", "#FFDCCB", "#FFC9C2", "#F1D7B5"];

export default function Catalog() {
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/admin/categories"] });
  const { data: brands = [] } = useQuery<Brand[]>({ queryKey: ["/api/admin/brands"] });
  const [cat, setCat] = useState<CatDraft | null>(null);
  const [brand, setBrand] = useState<BrandDraft | null>(null);

  const saveCat = async () => {
    if (!cat) return;
    const { id, ...body } = cat;
    if (await run(() => api(id ? `/api/admin/categories/${id}` : "/api/admin/categories", { method: id ? "PUT" : "POST", body }))) setCat(null);
  };
  const saveBrand = async () => {
    if (!brand) return;
    const { id, ...body } = brand;
    if (await run(() => api(id ? `/api/admin/brands/${id}` : "/api/admin/brands", { method: id ? "PUT" : "POST", body }))) setBrand(null);
  };

  return (
    <>
      <PageHead title="Categories and brands" hint="These fill the menu, the home page tiles and the shop filters." />
      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Categories" action={<button onClick={() => setCat({ name: "", image: null, color: TILE_COLORS[0], art: "lipstick", sortOrder: categories.length, isActive: true })} className="btn-pink btn-sm"><Plus size={15} />Add category</button>}>
          <ul className="grid gap-2">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-2xl bg-blush-soft/60 p-2">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl" style={{ background: c.color }}>
                  {c.image ? <img src={c.image} alt="" className="h-full w-full object-cover" /> : <ProductArt kind={c.art} className="h-12" />}
                </span>
                <span className="min-w-0 flex-1"><span className="block font-semibold">{c.name}</span><span className="text-[12.5px] text-ink-mute">{c.productCount} products</span></span>
                {!c.isActive && <Badge tone="grey">Hidden</Badge>}
                <IconBtn label="Edit" onClick={() => setCat(c)}><Pencil size={16} /></IconBtn>
                <IconBtn label="Delete" danger onClick={() => confirmDelete(`the category "${c.name}"`) && run(() => api(`/api/admin/categories/${c.id}`, { method: "DELETE" }), "Category deleted")}><Trash2 size={16} /></IconBtn>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Brands" action={<button onClick={() => setBrand({ name: "", logo: null, description: "", isFeatured: true, sortOrder: brands.length, isActive: true })} className="btn-pink btn-sm"><Plus size={15} />Add brand</button>}>
          <ul className="grid gap-2">
            {brands.map((b) => (
              <li key={b.id} className="flex items-center gap-3 rounded-2xl bg-blush-soft/60 p-2 pl-4">
                {b.logo && <img src={b.logo} alt="" className="h-9 w-14 object-contain" />}
                <span className="min-w-0 flex-1"><span className="block font-semibold">{b.name}</span><span className="text-[12.5px] text-ink-mute">{b.productCount} products</span></span>
                {b.isFeatured && <Badge>On home page</Badge>}
                {!b.isActive && <Badge tone="grey">Hidden</Badge>}
                <IconBtn label="Edit" onClick={() => setBrand(b)}><Pencil size={16} /></IconBtn>
                <IconBtn label="Delete" danger onClick={() => confirmDelete(`the brand "${b.name}"`) && run(() => api(`/api/admin/brands/${b.id}`, { method: "DELETE" }), "Brand deleted")}><Trash2 size={16} /></IconBtn>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Modal open={!!cat} onClose={() => setCat(null)}>
        {cat && (
          <div className="grid gap-4 p-6 sm:p-7">
            <h2 className="text-2xl font-semibold">{cat.id ? "Edit category" : "Add category"}</h2>
            <Field label="Name"><input className="field" value={cat.name} onChange={(e) => setCat({ ...cat, name: e.target.value })} placeholder="Lips" autoFocus /></Field>
            <div>
              <span className="label">Tile colour</span>
              <div className="flex flex-wrap items-center gap-2">
                {TILE_COLORS.map((c) => <button key={c} type="button" onClick={() => setCat({ ...cat, color: c })} aria-label={`Colour ${c}`} className={cx("h-9 w-9 rounded-full border border-black/10", cat.color === c && "ring-2 ring-ink ring-offset-2")} style={{ background: c }} />)}
                <input type="color" value={cat.color} onChange={(e) => setCat({ ...cat, color: e.target.value })} className="h-9 w-9 cursor-pointer rounded-full" aria-label="Custom colour" />
              </div>
            </div>
            <div className="flex gap-5">
              <ImageInput label="Photo (optional)" value={cat.image} onChange={(image) => setCat({ ...cat, image })} />
              <div className="min-w-0 flex-1">
                <span className="label">Or an illustration</span>
                <div className="flex flex-wrap gap-1.5">
                  {ART_KINDS.map((k: ArtKind) => (
                    <button key={k} type="button" onClick={() => setCat({ ...cat, art: k })} aria-label={`Illustration ${k}`} className={cx("rounded-xl border-2 p-0.5", cat.art === k ? "border-pink" : "border-transparent")} style={{ background: cat.color }}>
                      <ProductArt kind={k} className="h-11 w-9" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 items-end gap-4">
              <Field label="Position" hint="Lower numbers come first."><NumberInput value={cat.sortOrder} onChange={(n) => setCat({ ...cat, sortOrder: Math.round(n) })} /></Field>
              <Toggle on={cat.isActive} onChange={(v) => setCat({ ...cat, isActive: v })} label="Show on the store" />
            </div>
            <button onClick={saveCat} className="btn-pink">Save category</button>
          </div>
        )}
      </Modal>

      <Modal open={!!brand} onClose={() => setBrand(null)}>
        {brand && (
          <div className="grid gap-4 p-6 sm:p-7">
            <h2 className="text-2xl font-semibold">{brand.id ? "Edit brand" : "Add brand"}</h2>
            <Field label="Name"><input className="field" value={brand.name} onChange={(e) => setBrand({ ...brand, name: e.target.value })} autoFocus /></Field>
            <ImageInput label="Logo (optional)" value={brand.logo} onChange={(logo) => setBrand({ ...brand, logo })} wide />
            <Field label="Short description (optional)"><textarea className="field" value={brand.description} onChange={(e) => setBrand({ ...brand, description: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Toggle on={brand.isFeatured} onChange={(v) => setBrand({ ...brand, isFeatured: v })} label="Show on home page" />
              <Toggle on={brand.isActive} onChange={(v) => setBrand({ ...brand, isActive: v })} label="Show on the store" />
            </div>
            <button onClick={saveBrand} className="btn-pink">Save brand</button>
          </div>
        )}
      </Modal>
    </>
  );
}
