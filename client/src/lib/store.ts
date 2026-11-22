import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine } from "@shared/types";

// ── Bag: only shade ids and quantities live in the browser. Names, prices
//    and stock always come fresh from the server (see useQuote). ──
interface BagState {
  lines: CartLine[];
  code: string;
  add: (shadeId: number, qty?: number) => void;
  setQty: (shadeId: number, qty: number) => void;
  remove: (shadeId: number) => void;
  setCode: (code: string) => void;
  clear: () => void;
}

export const useBag = create<BagState>()(
  persist(
    (set) => ({
      lines: [],
      code: "",
      add: (shadeId, qty = 1) =>
        set((s) => {
          const found = s.lines.find((l) => l.shadeId === shadeId);
          return {
            lines: found
              ? s.lines.map((l) => (l.shadeId === shadeId ? { ...l, qty: Math.min(l.qty + qty, 20) } : l))
              : [...s.lines, { shadeId, qty }],
          };
        }),
      setQty: (shadeId, qty) =>
        set((s) => ({
          lines: qty <= 0 ? s.lines.filter((l) => l.shadeId !== shadeId) : s.lines.map((l) => (l.shadeId === shadeId ? { ...l, qty: Math.min(qty, 20) } : l)),
        })),
      remove: (shadeId) => set((s) => ({ lines: s.lines.filter((l) => l.shadeId !== shadeId) })),
      setCode: (code) => set({ code }),
      clear: () => set({ lines: [], code: "" }),
    }),
    { name: "sima-bag" },
  ),
);

export const bagCount = (s: BagState) => s.lines.reduce((n, l) => n + l.qty, 0);

// ── Wishlist, recently viewed, and one-time flags ──
interface PrefsState {
  wishlist: number[];
  recent: number[];
  welcomeSeen: boolean;
  welcomeCode: string;
  toggleWish: (id: number) => void;
  pushRecent: (id: number) => void;
  setWelcome: (seen: boolean, code?: string) => void;
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      wishlist: [],
      recent: [],
      welcomeSeen: false,
      welcomeCode: "",
      toggleWish: (id) => set((s) => ({ wishlist: s.wishlist.includes(id) ? s.wishlist.filter((x) => x !== id) : [id, ...s.wishlist] })),
      pushRecent: (id) => set((s) => ({ recent: [id, ...s.recent.filter((x) => x !== id)].slice(0, 12) })),
      setWelcome: (seen, code) => set((s) => ({ welcomeSeen: seen, welcomeCode: code ?? s.welcomeCode })),
    }),
    { name: "sima-prefs" },
  ),
);

// ── Open/closed state of overlays, and toast messages ──
export interface Toast { id: number; text: string; tone: "ok" | "error" }
interface UiState {
  bagOpen: boolean; menuOpen: boolean; searchOpen: boolean;
  toasts: Toast[];
  setBag: (open: boolean) => void; setMenu: (open: boolean) => void; setSearch: (open: boolean) => void;
  toast: (text: string, tone?: Toast["tone"]) => void;
  dismiss: (id: number) => void;
}

let toastId = 0;
export const useUi = create<UiState>((set, get) => ({
  bagOpen: false, menuOpen: false, searchOpen: false, toasts: [],
  setBag: (bagOpen) => set({ bagOpen }),
  setMenu: (menuOpen) => set({ menuOpen }),
  setSearch: (searchOpen) => set({ searchOpen }),
  toast: (text, tone = "ok") => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, tone }] }));
    setTimeout(() => get().dismiss(id), 3800);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = (text: string, tone: Toast["tone"] = "ok") => useUi.getState().toast(text, tone);
