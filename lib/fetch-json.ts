export async function fetchJson<T = unknown>(
  url: string,
  options?: { method?: "POST" | "PUT" | "DELETE"; body?: unknown }
): Promise<T> {
  const res = await fetch(url, {
    method: options?.method ?? "GET",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  })

  const json = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(json?.error ?? "Terjadi kesalahan pada server")
  }
  return json?.data as T
}

export function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Terjadi kesalahan"
}