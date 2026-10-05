"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import type { SessionAccess } from "@/lib/auth"

const AccessContext = React.createContext<SessionAccess>({ menus: [] })

// Membagikan hak akses dari sesi ke semua komponen di dalam dashboard
export function AccessProvider({
  access,
  children,
}: {
  access: SessionAccess
  children: React.ReactNode
}) {
  return <AccessContext.Provider value={access}>{children}</AccessContext.Provider>
}

// Kode button yang diizinkan di halaman sekarang: sub menu dengan URL terpanjang
// yang cocok dengan alamat halaman (rute turunan ikut, contoh /create).
export function useCan() {
  const access = React.useContext(AccessContext)
  const pathname = usePathname()

  return React.useCallback(
    (code: string) => {
      let best: { url: string; fns: string[] } | null = null
      for (const menu of access.menus) {
        for (const sub of menu.subs) {
          const match = pathname === sub.url || pathname.startsWith(`${sub.url}/`)
          if (match && (!best || sub.url.length > best.url.length)) best = sub
        }
      }
      return best?.fns.includes(code) ?? false
    },
    [access, pathname]
  )
}

// Tampilkan isinya hanya kalau button dengan kode ini diizinkan di halaman ini
export function Can({
  code,
  children,
}: {
  code: string
  children: React.ReactNode
}) {
  const can = useCan()
  return can(code) ? <>{children}</> : null
}
