import { QueryClient } from "@tanstack/react-query";

export class ApiError extends Error {
  constructor(message: string, public status: number, public field?: string) {
    super(message);
  }
}

/** One small wrapper for every request to the server. */
export async function api<T = any>(url: string, options: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: options.method || (options.body || options.form ? "POST" : "GET"),
      headers: options.body ? { "Content-Type": "application/json" } : undefined,
      body: options.form ?? (options.body ? JSON.stringify(options.body) : undefined),
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError("No connection. Check your internet and try again.", 0);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.message || "Something went wrong. Please try again.", res.status, data?.field);
  return data as T;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: ({ queryKey }) => api(queryKey[0] as string),
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
