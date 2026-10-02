export type ElementType =
  | "heading"
  | "textbox"
  | "section"
  | "kop_sekolah"
  | "tabel_nilai"
  | "tabel_absensi"
  | "catatan_wali"
  | "ttd_block"

export const ELEMENT_TYPES: ElementType[] = [
  "heading",
  "textbox",
  "section",
  "kop_sekolah",
  "tabel_nilai",
  "tabel_absensi",
  "catatan_wali",
  "ttd_block",
]

export const PAPER_SIZES = ["A4", "F4"] as const
export type PaperSize = (typeof PAPER_SIZES)[number]

export const TEMPLATE_JENIS = ["SEMESTER", "TENGAH_SEMESTER"] as const
export type TemplateJenis = (typeof TEMPLATE_JENIS)[number]

export interface TemplateElement {
  id: string
  type: ElementType
  order: number
  label: string
  // heading dan textbox memakai props.text
  props: Record<string, unknown>
}

export interface TemplatePage {
  size: PaperSize
  orientation: "portrait" | "landscape"
  margin: { top: number; right: number; bottom: number; left: number }
}

export interface TemplateContent {
  schemaVersion: 1
  page: TemplatePage
  elements: TemplateElement[]
}

export const DEFAULT_PAGE: TemplatePage = {
  size: "A4",
  orientation: "portrait",
  margin: { top: 15, right: 15, bottom: 15, left: 15 },
}

export function normalizeOrder(elements: TemplateElement[]): TemplateElement[] {
  return [...elements]
    .sort((a, b) => a.order - b.order)
    .map((el, i) => ({ ...el, order: i + 1 }))
}