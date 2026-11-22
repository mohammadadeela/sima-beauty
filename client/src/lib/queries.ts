import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import type { Brand, Category, Product, Quote, Review, Settings, User } from "@shared/types";
import { api, queryClient } from "./api";
import { useBag } from "./store";

interface Bootstrap { settings: Settings; categories: Category[]; brands: Brand[] }

/** Store settings, categories and brands. Loaded once and shared by every page. */
export function useBootstrap() {
  return useQuery<Bootstrap>({ queryKey: ["/api/bootstrap"], staleTime: 5 * 60_000 });
}
export function useSettings(): Settings | undefined {
  return useBootstrap().data?.settings;
}

export function useProducts(params: Record<string, string | number | boolean | undefined | null>, enabled = true) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "" || v === false) continue;
    qs.set(k, v === true ? "1" : String(v));
  }
  return useQuery<Product[]>({ queryKey: [`/api/products?${qs}`], enabled, placeholderData: keepPreviousData });
}

export function useProduct(slug: string) {
  return useQuery<{ product: Product; reviews: Review[]; related: Product[] }>({ queryKey: [`/api/products/${slug}`], retry: false });
}

/** Live prices, stock and offers for whatever is in the bag. */
export function useQuote(zoneId?: string) {
  const lines = useBag((s) => s.lines);
  const code = useBag((s) => s.code);
  return useQuery<Quote>({
    queryKey: ["quote", lines, code, zoneId || ""],
    queryFn: () => api("/api/quote", { body: { lines, code, zoneId } }),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export function useMe() {
  return useQuery<User | null>({ queryKey: ["/api/auth/me"], staleTime: 5 * 60_000 });
}

export function useLogout() {
  return useMutation({
    mutationFn: () => api("/api/auth/logout", { method: "POST" }),
    onSuccess: () => {
      // Drop everything private from memory the moment someone signs out.
      queryClient.removeQueries({ predicate: (q) => /^\/api\/(admin|auth\/orders)/.test(String(q.queryKey[0])) });
      queryClient.setQueryData(["/api/auth/me"], null);
    },
  });
}
