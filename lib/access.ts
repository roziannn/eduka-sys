import type { SessionAccess } from "@/lib/auth"

// Dipakai juga oleh middleware (edge), jadi file ini tidak boleh mengimpor modul Node.
// Hanya tipe dari lib/auth yang diimpor, dan itu hilang saat dikompilasi.

export const FORBIDDEN_PATH = "/forbidden"

// Halaman yang selalu boleh dibuka siapa pun yang sudah login
const ALWAYS_ALLOWED = ["/", FORBIDDEN_PATH]

// Admin tidak boleh terkunci dari pengaturan akses, apa pun isi hak aksesnya
const ADMIN_ALWAYS_ALLOWED = [
  "/pengaturan/hak-akses",
  "/pengaturan/menu-aplikasi",
]

const isUnder = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`)

// URL menu utama yang diizinkan ('#' dilewati) dan URL sub menu, urut seperti di sidebar
const mainUrls = (access: SessionAccess) =>
  access.menus.map((m) => m.url).filter((u) => u && u !== "#")
const subUrls = (access: SessionAccess) =>
  access.menus.flatMap((m) => m.subs.map((s) => s.url))

export const allowedUrls = (access: SessionAccess): string[] => [
  ...mainUrls(access),
  ...subUrls(access),
]

// Menu utama dicocokkan persis, karena /dashboard adalah awalan dari hampir semua rute
// dan tidak boleh ikut membuka menu lain. Sub menu membawa rute di bawahnya,
// contoh: /dashboard/soal-ujian/create.
export function isPathAllowed(
  access: SessionAccess,
  role: string,
  pathname: string
): boolean {
  if (ALWAYS_ALLOWED.some((p) => pathname === p)) return true
  if (role === "ADMIN" && ADMIN_ALWAYS_ALLOWED.some((p) => isUnder(pathname, p))) {
    return true
  }
  if (mainUrls(access).includes(pathname)) return true
  return subUrls(access).some((url) => isUnder(pathname, url))
}

// Halaman tujuan setelah login: /dashboard kalau boleh, kalau tidak halaman pertama
// yang boleh, kalau tidak ada sama sekali halaman "tidak punya akses".
export function landingUrl(access: SessionAccess): string {
  if (isPathAllowed(access, "", "/dashboard")) return "/dashboard"
  return allowedUrls(access)[0] ?? FORBIDDEN_PATH
}
