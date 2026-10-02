import { ApiError } from "@/lib/api"
import { sanitizeRichText } from "@/lib/sanitize-rich-text"
import {
  templateRaporRepository,
  type TemplateRaporListRecord,
  type TemplateRaporRecord,
} from "@/repositories/template-rapor.repository"
import {
  ELEMENT_TYPES,
  PAPER_SIZES,
  TEMPLATE_JENIS,
  normalizeOrder,
  type ElementType,
  type PaperSize,
  type TemplateContent,
  type TemplateElement,
  type TemplateJenis,
} from "@/types/rapor-template"

export type TemplateRaporPayload = {
  nama: string
  jenis: string
  konten: unknown
}

const MAX_ELEMENTS = 200
const MAX_PROPS_LENGTH = 50000 // batas kasar sebelum dibersihkan
const MAX_HTML_LENGTH = 20000 // batas isi teks setelah dibersihkan

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)

function parseMargin(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new ApiError(400, "Margin harus berupa angka 0 sampai 100 mm")
  }
  return value
}

function parseProps(type: ElementType, raw: unknown): Record<string, unknown> {
  const props = raw ?? {}
  if (!isPlainObject(props) || JSON.stringify(props).length > MAX_PROPS_LENGTH) {
    throw new ApiError(400, "Properti elemen tidak valid")
  }

  // Isi teks rich text: bersihkan HTML-nya sebelum disimpan
  if (type === "textbox" && typeof props.html === "string") {
    const html = sanitizeRichText(props.html)
    if (html.length > MAX_HTML_LENGTH) {
      throw new ApiError(400, "Isi teks terlalu panjang")
    }
    return { ...props, html }
  }

  return props
}

function parseKonten(raw: unknown): TemplateContent {
  if (!isPlainObject(raw)) throw new ApiError(400, "Konten template tidak valid")

  // ----- halaman -----
  const rawPage = raw.page
  if (!isPlainObject(rawPage)) throw new ApiError(400, "Pengaturan halaman tidak valid")

  const size = rawPage.size as PaperSize
  if (!PAPER_SIZES.includes(size)) throw new ApiError(400, "Ukuran kertas tidak valid")

  const orientation = rawPage.orientation
  if (orientation !== "portrait" && orientation !== "landscape") {
    throw new ApiError(400, "Orientasi halaman tidak valid")
  }

  const rawMargin = rawPage.margin
  if (!isPlainObject(rawMargin)) throw new ApiError(400, "Margin halaman tidak valid")
  const margin = {
    top: parseMargin(rawMargin.top),
    right: parseMargin(rawMargin.right),
    bottom: parseMargin(rawMargin.bottom),
    left: parseMargin(rawMargin.left),
  }

  // ----- elemen -----
  if (!Array.isArray(raw.elements)) throw new ApiError(400, "Daftar elemen tidak valid")
  if (raw.elements.length > MAX_ELEMENTS) {
    throw new ApiError(400, `Elemen maksimal ${MAX_ELEMENTS} buah`)
  }

  const ids = new Set<string>()
  const elements: TemplateElement[] = raw.elements.map((item: unknown) => {
    if (!isPlainObject(item)) throw new ApiError(400, "Elemen tidak valid")

    const id = typeof item.id === "string" ? item.id.trim() : ""
    if (!id || id.length > 50) throw new ApiError(400, "ID elemen tidak valid")
    if (ids.has(id)) throw new ApiError(400, "ID elemen duplikat")
    ids.add(id)

    const type = item.type as ElementType
    if (!ELEMENT_TYPES.includes(type)) throw new ApiError(400, "Tipe elemen tidak dikenal")

    const label = typeof item.label === "string" ? item.label.trim() : ""
    if (label.length > 200) throw new ApiError(400, "Label elemen maksimal 200 karakter")

    const props = parseProps(type, item.props)

    const order = typeof item.order === "number" && Number.isFinite(item.order) ? item.order : 0

    return { id, type, order, label, props }
  })

  return {
    schemaVersion: 1,
    page: { size, orientation, margin },
    elements: normalizeOrder(elements),
  }
}

function parse(payload: TemplateRaporPayload) {
  const nama = typeof payload.nama === "string" ? payload.nama.trim() : ""
  if (!nama) throw new ApiError(400, "Nama template wajib diisi")
  if (nama.length > 150) throw new ApiError(400, "Nama template maksimal 150 karakter")

  if (!TEMPLATE_JENIS.includes(payload.jenis as TemplateJenis)) {
    throw new ApiError(400, "Jenis rapor tidak valid")
  }

  return { nama, jenis: payload.jenis, konten: parseKonten(payload.konten) }
}

const formatListItem = (r: TemplateRaporListRecord) => ({
  id: r.id,
  nama: r.nama,
  jenis: r.jenis,
  isAktif: r.is_active,
  paperSize: r.paper_size ?? "A4",
  jumlahElemen: r.jumlah_elemen,
  createdAt: new Date(r.created_at).toISOString(),
  updatedAt: new Date(r.updated_at).toISOString(),
  createdBy: r.created_by_name ?? "-",
})

const formatDetail = (r: TemplateRaporRecord) => ({
  id: r.id,
  nama: r.nama,
  jenis: r.jenis,
  isAktif: r.is_active,
  konten: r.konten,
})

export const templateRaporService = {
  async list() {
    return (await templateRaporRepository.findAll()).map(formatListItem)
  },

  async get(id: string) {
    const record = await templateRaporRepository.findById(id)
    if (!record) throw new ApiError(404, "Template tidak ditemukan")
    return formatDetail(record)
  },

  async create(payload: TemplateRaporPayload, userId: string) {
    const id = await templateRaporRepository.create(parse(payload), userId)
    return { id }
  },

  async update(id: string, payload: TemplateRaporPayload, userId: string) {
    const updated = await templateRaporRepository.update(id, parse(payload), userId)
    if (!updated) throw new ApiError(404, "Template tidak ditemukan")
  },
}