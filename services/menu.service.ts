import { ApiError } from "@/lib/api"
import { isMenuIconName } from "@/lib/menu-icon-names"
import {
  menuRepository,
  type ButtonInput,
} from "@/repositories/menu.repository"

export type MenuPayload = {
  // Kosong = menu utama. Terisi = sub menu dari menu utama itu. Tidak bisa diubah saat edit.
  parentId?: string | null
  nama: string
  url?: string
  // Nama ikon (lihat lib/menu-icon-names.ts), hanya untuk menu utama.
  // undefined = tidak diubah (saat edit), null atau kosong = tanpa ikon.
  icon?: string | null
  // Nomor urut di sidebar (bilangan bulat >= 1), diurutkan di antara menu yang satu induk.
  // undefined/null/kosong = saat buat: otomatis paling akhir, saat edit: tidak diubah.
  seq?: unknown
  // undefined = button tidak disentuh. Terisi = daftar button final: [{ id?, code }]
  buttons?: unknown
}

export interface ButtonDto {
  id: string
  code: string
}

export interface SubMenuDto {
  id: string
  namaSubMenu: string
  url: string
  urutan: number
  isAktif: boolean
  buttons: ButtonDto[]
}

export interface MenuDto {
  id: string
  namaMenu: string
  iconName: string | null
  url: string
  urutan: number
  isAktif: boolean
  subMenus: SubMenuDto[]
}

const MAX_NAMA = 100
const MAX_URL = 255
const MAX_BUTTONS = 30
const MAX_BUTTON_CODE = 50
const MAX_SEQ = 9999

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const URL_RE = /^\/[A-Za-z0-9/_-]*$/
const BUTTON_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)

function parseNama(raw: unknown): string {
  const nama = typeof raw === "string" ? raw.trim() : ""
  if (!nama) throw new ApiError(400, "Nama menu wajib diisi")
  if (nama.length > MAX_NAMA) {
    throw new ApiError(400, `Nama menu maksimal ${MAX_NAMA} karakter`)
  }
  return nama
}

// Menu utama: URL boleh kosong (disimpan '#'). Sub menu: wajib rute asli.
function parseUrl(raw: unknown, isSub: boolean): string {
  const url = typeof raw === "string" ? raw.trim() : ""

  if (!url || url === "#") {
    if (isSub) {
      throw new ApiError(
        400,
        "Sub menu wajib punya URL halaman, contoh: /dashboard/soal-ujian"
      )
    }
    return "#"
  }

  // Garis miring di akhir dibuang, kecuali rute root
  const normalized = url.length > 1 && url.endsWith("/") ? url.slice(0, -1) : url

  if (
    normalized.length > MAX_URL ||
    !URL_RE.test(normalized) ||
    normalized.includes("//")
  ) {
    throw new ApiError(
      400,
      "URL harus diawali '/' dan hanya berisi huruf, angka, tanda minus, garis bawah, dan garis miring"
    )
  }
  return normalized
}

// undefined = tidak dikirim. null atau kosong = tanpa ikon.
// Selain itu harus salah satu ikon yang tersedia.
function parseIcon(raw: unknown): string | null | undefined {
  if (raw === undefined) return undefined
  if (raw === null || raw === "") return null
  if (!isMenuIconName(raw)) throw new ApiError(400, "Ikon tidak dikenal")
  return raw
}

function parseSeq(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined
  const n = typeof raw === "string" ? Number(raw.trim()) : raw
  if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > MAX_SEQ) {
    throw new ApiError(
      400,
      `Urutan harus bilangan bulat antara 1 sampai ${MAX_SEQ}`
    )
  }
  return n
}

function parseParentId(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === "") return null
  if (typeof raw !== "string" || !UUID_RE.test(raw)) {
    throw new ApiError(400, "Menu induk tidak valid")
  }
  return raw
}

// Kode button dirapikan seperti di form: huruf kecil, spasi jadi tanda minus
function parseButtons(raw: unknown): ButtonInput[] | undefined {
  if (raw === undefined) return undefined
  if (!Array.isArray(raw)) throw new ApiError(400, "Daftar button tidak valid")
  if (raw.length > MAX_BUTTONS) {
    throw new ApiError(400, `Button maksimal ${MAX_BUTTONS} per menu`)
  }

  const codes = new Set<string>()
  const ids = new Set<string>()

  return raw.map((item: unknown): ButtonInput => {
    if (!isPlainObject(item)) throw new ApiError(400, "Data button tidak valid")

    const code =
      typeof item.code === "string"
        ? item.code.trim().toLowerCase().replace(/\s+/g, "-")
        : ""
    if (!code) throw new ApiError(400, "Kode button wajib diisi")
    if (code.length > MAX_BUTTON_CODE || !BUTTON_RE.test(code)) {
      throw new ApiError(
        400,
        `Kode button "${code.slice(0, MAX_BUTTON_CODE)}" tidak valid. Pakai huruf kecil, angka, dan tanda minus, contoh: btn-save.`
      )
    }
    if (codes.has(code)) {
      throw new ApiError(400, `Kode button "${code}" muncul dua kali`)
    }
    codes.add(code)

    let id: string | null = null
    if (item.id !== undefined && item.id !== null) {
      if (typeof item.id !== "string" || !UUID_RE.test(item.id)) {
        throw new ApiError(400, "ID button tidak valid")
      }
      if (ids.has(item.id)) throw new ApiError(400, "ID button muncul dua kali")
      ids.add(item.id)
      id = item.id
    }

    return { id, code }
  })
}

export const menuService = {
  // Pohon menu untuk halaman pengaturan: menu utama, sub menu di dalamnya, dan button tiap sub menu
  async list(): Promise<MenuDto[]> {
    const [menus, functions] = await Promise.all([
      menuRepository.findAllMenus(),
      menuRepository.findAllFunctions(),
    ])

    const buttonsByMenu = new Map<string, ButtonDto[]>()
    for (const f of functions) {
      const list = buttonsByMenu.get(f.menu_id) ?? []
      list.push({ id: f.id, code: f.code })
      buttonsByMenu.set(f.menu_id, list)
    }

    const subsByParent = new Map<string, SubMenuDto[]>()
    for (const m of menus) {
      if (!m.parent_id) continue
      const list = subsByParent.get(m.parent_id) ?? []
      list.push({
        id: m.id,
        namaSubMenu: m.name,
        url: m.url ?? "",
        urutan: m.seq,
        isAktif: m.is_active,
        buttons: buttonsByMenu.get(m.id) ?? [],
      })
      subsByParent.set(m.parent_id, list)
    }

    return menus
      .filter((m) => !m.parent_id)
      .map((m) => ({
        id: m.id,
        namaMenu: m.name,
        iconName: m.icon,
        url: m.url ?? "#",
        urutan: m.seq,
        isAktif: m.is_active,
        subMenus: subsByParent.get(m.id) ?? [],
      }))
  },

  async create(payload: MenuPayload, actorId: string) {
    const nama = parseNama(payload.nama)
    const parentId = parseParentId(payload.parentId)

    if (parentId) {
      const parent = await menuRepository.findById(parentId)
      if (!parent) throw new ApiError(400, "Menu induk tidak ditemukan")
      if (parent.parent_id !== null) {
        throw new ApiError(
          400,
          "Menu induk harus menu utama. Sub menu tidak bisa punya sub menu lagi."
        )
      }
    }

    const url = parseUrl(payload.url, parentId !== null)

    // Ikon hanya untuk menu utama, dan boleh kosong
    const icon = parentId ? null : parseIcon(payload.icon) ?? null

    const seq = parseSeq(payload.seq)

    const buttons = parseButtons(payload.buttons)
    if (buttons?.some((b) => b.id !== null)) {
      throw new ApiError(400, "Button pada menu baru tidak boleh membawa id")
    }

    const id = await menuRepository.create(
      { parentId, name: nama, url, icon, seq, buttons },
      actorId
    )

    return { id }
  },

  async update(id: string, payload: MenuPayload, actorId: string) {
    const menu = await menuRepository.findById(id)
    if (!menu) throw new ApiError(404, "Menu tidak ditemukan")

    const nama = parseNama(payload.nama)
    const url = parseUrl(payload.url, menu.parent_id !== null)

    // Ikon hanya bisa diubah di menu utama. Untuk sub menu, nilainya diabaikan.
    const icon = menu.parent_id === null ? parseIcon(payload.icon) : undefined

    const seq = parseSeq(payload.seq)

    const buttons = parseButtons(payload.buttons)

    // Setiap id button yang dikirim harus milik menu ini
    if (buttons) {
      const own = new Set(await menuRepository.findFunctionIds(id))
      for (const b of buttons) {
        if (b.id && !own.has(b.id)) {
          throw new ApiError(400, "Ada button yang tidak ditemukan pada menu ini")
        }
      }
    }

    const updated = await menuRepository.update(
      id,
      { name: nama, url, icon, seq, buttons },
      actorId
    )
    if (!updated) throw new ApiError(404, "Menu tidak ditemukan")
  },
}