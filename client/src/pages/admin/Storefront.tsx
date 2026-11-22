import { Plus, Trash2 } from "lucide-react";
import type { Banner } from "@shared/types";
import { cx } from "@/lib/format";
import { Card, Field, IconBtn, ImageInput, ListEditor, PageHead, Toggle, useSettingsForm } from "./ui";

const TONES: { id: Banner["tone"]; label: string; swatch: string }[] = [
  { id: "pink", label: "Hot pink", swatch: "#E8257D" }, { id: "blush", label: "Soft pink", swatch: "#FFD0E2" },
  { id: "ink", label: "Dark plum", swatch: "#2D0F24" }, { id: "gold", label: "Gold", swatch: "#EBD3A6" },
];

/** Everything on the home page that isn't a product. */
export default function Storefront() {
  const { s, set, bar } = useSettingsForm();
  if (!s) return null;
  const setBanner = (i: number, patch: Partial<Banner>) => set("banners", s.banners.map((b, n) => (n === i ? { ...b, ...patch } : b)));
  const setShade = (i: number, patch: Partial<{ name: string; hex: string }>) => set("heroShades", s.heroShades.map((h, n) => (n === i ? { ...h, ...patch } : h)));

  return (
    <>
      <PageHead title="Home page" hint="Change the words, colours and banners shoppers see first. Nothing goes live until you press Save." />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Top bar" hint="The thin pink strip at the very top. Messages rotate one by one.">
          <Toggle on={s.announcementOn} onChange={(v) => set("announcementOn", v)} label="Show the top bar" />
          <div className="mt-4"><ListEditor items={s.announcements} onChange={(v) => set("announcements", v)} placeholder="Free delivery on orders over ₪300" addLabel="Add message" /></div>
        </Card>

        <Card title="Main banner with the 3D lipstick">
          <div className="grid gap-3">
            <Field label="Big headline"><input className="field" value={s.heroTitle} onChange={(e) => set("heroTitle", e.target.value)} /></Field>
            <Field label="Line under it"><input className="field" value={s.heroText} onChange={(e) => set("heroText", e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Button text"><input className="field" value={s.heroCta} onChange={(e) => set("heroCta", e.target.value)} /></Field>
              <Field label="Button opens" hint="For example /shop or /offers"><input className="field" value={s.heroLink} onChange={(e) => set("heroLink", e.target.value)} /></Field>
            </div>
          </div>
        </Card>

        <Card title="Lipstick shades" hint="The colours shoppers can try on the 3D lipstick. The first one is shown when the page opens.">
          <div className="grid gap-2">
            {s.heroShades.map((h, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="color" value={h.hex} onChange={(e) => setShade(i, { hex: e.target.value.toUpperCase() })} aria-label="Shade colour" className="h-11 w-11 shrink-0 cursor-pointer rounded-full border-0 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-2 [&::-webkit-color-swatch]:border-white" />
                <input className="field h-11" value={h.name} onChange={(e) => setShade(i, { name: e.target.value })} placeholder="Shade name" aria-label="Shade name" />
                <IconBtn label="Remove shade" danger disabled={s.heroShades.length === 1} onClick={() => set("heroShades", s.heroShades.filter((_, n) => n !== i))}><Trash2 size={15} /></IconBtn>
              </div>
            ))}
            {s.heroShades.length < 8 && <button onClick={() => set("heroShades", [...s.heroShades, { name: "New shade", hex: "#E8257D" }])} className="btn-line btn-sm justify-self-start"><Plus size={15} />Add shade</button>}
          </div>
        </Card>

        <Card title="Home page sections">
          <div className="grid gap-4">
            <Toggle on={s.shadeMatchOn} onChange={(v) => set("shadeMatchOn", v)} label='"Find your shade" compact' hint="A powder compact opens; shoppers tap a colour and see matching products." />
            <Toggle on={s.lashOn} onChange={(v) => set("lashOn", v)} label="Mascara close-up banner" hint="The wand sweeps across and the lashes grow as people scroll." />
            {s.lashOn && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Headline"><input className="field" value={s.lashTitle} onChange={(e) => set("lashTitle", e.target.value)} /></Field>
                <Field label="Small text"><input className="field" value={s.lashText} onChange={(e) => set("lashText", e.target.value)} /></Field>
                <Field label="Button text"><input className="field" value={s.lashCta} onChange={(e) => set("lashCta", e.target.value)} /></Field>
                <Field label="Button opens"><input className="field" value={s.lashLink} onChange={(e) => set("lashLink", e.target.value)} /></Field>
              </div>
            )}
            <div>
              <span className="label">Moving strip above the footer</span>
              <ListEditor items={s.perks} onChange={(v) => set("perks", v)} placeholder="Original brands only" addLabel="Add line" />
            </div>
          </div>
        </Card>

        <Card title="Promo banners" hint="The big blocks in the middle of the home page. Upload a photo, or leave it empty for an illustration." className="xl:col-span-2"
          action={s.banners.length < 4 ? <button onClick={() => set("banners", [...s.banners, { title: "New banner", text: "", cta: "Shop now", link: "/shop", image: "", tone: "pink" }])} className="btn-pink btn-sm"><Plus size={15} />Add banner</button> : undefined}>
          <div className="grid gap-4 lg:grid-cols-2">
            {s.banners.map((b, i) => (
              <div key={i} className="grid gap-3 rounded-3xl bg-blush-soft p-4">
                <div className="flex items-center justify-between"><p className="text-[14px] font-bold">Banner {i + 1}</p><IconBtn label="Remove banner" danger onClick={() => set("banners", s.banners.filter((_, n) => n !== i))}><Trash2 size={15} /></IconBtn></div>
                <Field label="Title"><input className="field" value={b.title} onChange={(e) => setBanner(i, { title: e.target.value })} /></Field>
                <Field label="Small text"><input className="field" value={b.text} onChange={(e) => setBanner(i, { text: e.target.value })} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Button text"><input className="field" value={b.cta} onChange={(e) => setBanner(i, { cta: e.target.value })} /></Field>
                  <Field label="Opens"><input className="field" value={b.link} onChange={(e) => setBanner(i, { link: e.target.value })} placeholder="/shop?category=lips" /></Field>
                </div>
                <div>
                  <span className="label">Colour</span>
                  <div className="flex flex-wrap gap-2">
                    {TONES.map((t) => (
                      <button key={t.id} type="button" onClick={() => setBanner(i, { tone: t.id })} className={cx("chip bg-white", b.tone === t.id && "chip-on")}>
                        <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: t.swatch }} />{t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <ImageInput label="Photo (optional)" value={b.image || null} onChange={(url) => setBanner(i, { image: url || "" })} wide />
              </div>
            ))}
          </div>
        </Card>
      </div>
      {bar}
    </>
  );
}
