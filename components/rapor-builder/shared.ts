import type { PaperSize, TemplateElement } from "@/types/rapor-template"

export const LIST_PATH = "/dashboard/master/template-rapor"
export const BUILDER_PATH = `${LIST_PATH}/builder`
export const PREVIEW_PATH = `${LIST_PATH}/preview`
export const API_PATH = "/api/template-rapor"

// Draft template dari builder untuk dibuka di halaman preview tanpa harus disimpan dulu
export const DRAFT_STORAGE_KEY = "rapor-template-draft"

export const PAPER_DIMENSIONS: Record<PaperSize, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  F4: { width: 215, height: 330 },
}

// Gaya tampilan HTML rich text di canvas dan di preview
export const RICH_CONTENT_CLASS =
  "text-xs [&_p]:m-0 [&_p]:min-h-[1em] [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_th]:border [&_td]:p-1 [&_th]:p-1 [&_th]:bg-muted/30"

const textOf = (el: TemplateElement) =>
  typeof el.props.text === "string" ? el.props.text : ""

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

// Isi Text Box sebagai HTML. Template lama yang hanya punya `text` dibungkus jadi paragraf.
export const htmlOf = (el: TemplateElement) =>
  typeof el.props.html === "string" ? el.props.html : `<p>${escapeHtml(textOf(el))}</p>`
