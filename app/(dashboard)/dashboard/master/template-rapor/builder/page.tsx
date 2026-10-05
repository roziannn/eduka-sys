"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  ArrowLeftIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  SaveIcon,
  EyeIcon,
  HeadingIcon,
  TypeIcon,
  TableIcon,
  ImageIcon,
  FileTextIcon,
  CheckSquareIcon,
  PenToolIcon,
  GripVerticalIcon,
  Trash2Icon,
  LayoutTemplateIcon,
  MoveIcon,
  Loader2,
} from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QueryProvider } from "@/components/query-provider"
import RichTextEditor, { type RichTextFeatures } from "@/components/rich-text-editor"
import { fetchJson, getErrorMessage } from "@/lib/fetch-json"
import {
  DEFAULT_PAGE,
  normalizeOrder,
  type ElementType,
  type PaperSize,
  type TemplateContent,
  type TemplateElement,
  type TemplatePage,
} from "@/types/rapor-template"

const LIST_PATH = "/dashboard/master/template-rapor"
const BUILDER_PATH = `${LIST_PATH}/builder`
const API_PATH = "/api/template-rapor"
const TEMPLATE_KEY = ["template-rapor"]

// Tipe data drag: dari palette (komponen baru) atau dari canvas (pindah urutan)
const PALETTE_DRAG_TYPE = "application/react-dnd-type"
const CANVAS_DRAG_TYPE = "application/x-canvas-element"

const PAPER_DIMENSIONS: Record<PaperSize, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  F4: { width: 215, height: 330 },
}

const JENIS_LABEL: Record<string, string> = {
  SEMESTER: "Rapor Semester",
  TENGAH_SEMESTER: "Rapor PTS",
}

// Editor teks langsung di kotak canvas: tanpa undo/redo, heading, tabel, gambar, dan rumus
// (gambar disimpan base64 sehingga membengkakkan JSON template)
const TEXTBOX_EDITOR_FEATURES: RichTextFeatures = {
  history: false,
  heading: false,
  table: false,
  image: false,
  math: false,
}

// Gaya tampilan HTML rich text di canvas
const RICH_CONTENT_CLASS =
  "text-xs [&_p]:m-0 [&_p]:min-h-[1em] [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_th]:border [&_td]:p-1 [&_th]:p-1 [&_th]:bg-muted/30"

interface TemplateDetail {
  id: string
  nama: string
  jenis: string
  konten: TemplateContent
}

const PALETTE_ITEMS: {
  type: ElementType
  label: string
  icon: typeof HeadingIcon
  category: string
}[] = [
  { type: "heading", label: "Heading / Judul", icon: HeadingIcon, category: "Dasar" },
  { type: "textbox", label: "Text Box / Paragraf", icon: TypeIcon, category: "Dasar" },
  { type: "section", label: "Section Box", icon: LayoutTemplateIcon, category: "Dasar" },
  { type: "kop_sekolah", label: "Kop Surat Sekolah", icon: ImageIcon, category: "Header" },
  { type: "tabel_nilai", label: "Tabel Nilai Mapel", icon: TableIcon, category: "Dinamis" },
  { type: "tabel_absensi", label: "Tabel Kehadiran", icon: CheckSquareIcon, category: "Dinamis" },
  { type: "catatan_wali", label: "Box Catatan Wali", icon: FileTextIcon, category: "Dinamis" },
  { type: "ttd_block", label: "Area Tanda Tangan", icon: PenToolIcon, category: "Footer" },
]

const DEFAULT_ELEMENTS: TemplateElement[] = [
  { id: "1", type: "kop_sekolah", order: 1, label: "Kop Sekolah Resmi", props: {} },
  { id: "2", type: "heading", order: 2, label: "RAPOR HASIL BELAJAR (HASIL ASESMEN)", props: { text: "Judul Utama" } },
  { id: "3", type: "section", order: 3, label: "Identitas Siswa (Nama, NIS, Kelas)", props: {} },
  { id: "4", type: "tabel_nilai", order: 4, label: "Tabel Nilai Capaian Pembelajaran", props: {} },
  { id: "5", type: "catatan_wali", order: 5, label: "Catatan Akademik & Karakter", props: {} },
  { id: "6", type: "ttd_block", order: 6, label: "Blok TTD Orang Tua, Wali Kelas & Kepsek", props: {} },
]

const newId = () =>
  `el_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

const textOf = (el: TemplateElement) =>
  typeof el.props.text === "string" ? el.props.text : ""

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

// Isi Text Box sebagai HTML. Template lama yang hanya punya `text` dibungkus jadi paragraf.
const htmlOf = (el: TemplateElement) =>
  typeof el.props.html === "string" ? el.props.html : `<p>${escapeHtml(textOf(el))}</p>`

export default function TemplateBuilderPage() {
  return (
    <QueryProvider>
      <React.Suspense
        fallback={
          <div className="flex h-screen w-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat...
          </div>
        }
      >
        <TemplateBuilder />
      </React.Suspense>
    </QueryProvider>
  )
}

function TemplateBuilder() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient()

  // Ada ?id=... berarti mode edit, tanpa id berarti template baru
  const templateId = searchParams.get("id")
  const isEdit = templateId !== null

  const [templateName, setTemplateName] = React.useState("Template Rapor Akhir Semester")
  const [templateType, setTemplateType] = React.useState("SEMESTER")
  const [pageSetup, setPageSetup] = React.useState<TemplatePage>(DEFAULT_PAGE)

  const [canvasElements, setCanvasElements] = React.useState<TemplateElement[]>(DEFAULT_ELEMENTS)
  const [selectedElementId, setSelectedElementId] = React.useState<string | null>("2")

  // Elemen canvas yang sedang digeser, dan posisi sisip tujuan (0..jumlah elemen)
  const [draggingId, setDraggingId] = React.useState<string | null>(null)
  const [dropIndex, setDropIndex] = React.useState<number | null>(null)

  const [hydrated, setHydrated] = React.useState(false)

  const {
    data: template,
    isLoading,
    error: loadError,
  } = useQuery<TemplateDetail>({
    queryKey: [...TEMPLATE_KEY, templateId],
    queryFn: () => fetchJson<TemplateDetail>(`${API_PATH}/${templateId}`),
    enabled: isEdit,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

  React.useEffect(() => {
    if (!template || hydrated) return
    setHydrated(true)
    setTemplateName(template.nama)
    setTemplateType(template.jenis)
    setPageSetup(template.konten.page)
    const elements = normalizeOrder(template.konten.elements)
    setCanvasElements(elements)
    setSelectedElementId(elements[0]?.id ?? null)
  }, [template, hydrated])

  const saveMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      fetchJson<{ id: string }>(isEdit ? `${API_PATH}/${templateId}` : API_PATH, {
        method: isEdit ? "PUT" : "POST",
        body,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TEMPLATE_KEY }),
  })

  // ---------- ELEMEN CANVAS ----------
  // Semua perubahan elemen lewat sini, supaya `order` selalu 1..n sesuai urutan di canvas
  const updateElements = (fn: (prev: TemplateElement[]) => TemplateElement[]) =>
    setCanvasElements((prev) => fn(prev).map((el, i) => ({ ...el, order: i + 1 })))

  // Pindahkan elemen ke posisi sisip `insertIndex` (posisi sebelum elemen dibuang dari urutan lama)
  const moveElementTo = (id: string, insertIndex: number) => {
    updateElements((prev) => {
      const from = prev.findIndex((el) => el.id === id)
      if (from < 0) return prev

      const to = from < insertIndex ? insertIndex - 1 : insertIndex
      if (to === from) return prev

      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  // ---------- DRAG & DROP (HTML5 Native DnD) ----------
  const clearDrag = () => {
    setDraggingId(null)
    setDropIndex(null)
  }

  // Dari palette: komponen baru
  const handlePaletteDragStart = (e: React.DragEvent, type: ElementType) => {
    e.dataTransfer.setData(PALETTE_DRAG_TYPE, type)
    e.dataTransfer.effectAllowed = "copy"
  }

  // Dari canvas: pindah urutan
  const handleElementDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData(CANVAS_DRAG_TYPE, id)
    e.dataTransfer.effectAllowed = "move"
    setDraggingId(id)
  }

  // Di atas sebuah elemen: tentukan sisip di atas atau di bawahnya (berdasarkan separuh tinggi)
  const handleElementDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = draggingId ? "move" : "copy"

    const rect = e.currentTarget.getBoundingClientRect()
    const after = e.clientY > rect.top + rect.height / 2
    setDropIndex(after ? index + 1 : index)
  }

  // Di atas kertas: area kosong di bawah elemen terakhir berarti sisip di akhir
  const handlePaperDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = draggingId ? "move" : "copy"
    if (e.target === e.currentTarget) setDropIndex(canvasElements.length)
  }

  const handlePaperDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropIndex(null)
  }

  const handleMainDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDropOnCanvas = (e: React.DragEvent) => {
    e.preventDefault()
    const targetIndex = Math.min(dropIndex ?? canvasElements.length, canvasElements.length)

    const movedId = e.dataTransfer.getData(CANVAS_DRAG_TYPE)
    if (movedId) {
      moveElementTo(movedId, targetIndex)
      setSelectedElementId(movedId)
      clearDrag()
      return
    }

    const type = e.dataTransfer.getData(PALETTE_DRAG_TYPE)
    const palette = PALETTE_ITEMS.find((item) => item.type === type)
    if (!palette) {
      clearDrag()
      return
    }

    const newItem: TemplateElement = {
      id: newId(),
      type: palette.type,
      order: 0,
      label: palette.label,
      props:
        palette.type === "heading"
          ? { text: "Judul Baru" }
          : palette.type === "textbox"
          ? { html: "<p>Isi teks...</p>" }
          : {},
    }

    updateElements((prev) => {
      const next = [...prev]
      next.splice(Math.min(targetIndex, prev.length), 0, newItem)
      return next
    })
    setSelectedElementId(newItem.id)
    clearDrag()
  }

  const handleDeleteElement = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    updateElements((prev) => prev.filter((el) => el.id !== id))
    if (selectedElementId === id) setSelectedElementId(null)
  }

  const handleMoveElement = (id: string, direction: -1 | 1, e: React.MouseEvent) => {
    e.stopPropagation()
    updateElements((prev) => {
      const index = prev.findIndex((el) => el.id === id)
      const target = index + direction
      if (index < 0 || target < 0 || target >= prev.length) return prev

      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const handleChangeLabel = (id: string, label: string) => {
    updateElements((prev) => prev.map((el) => (el.id === id ? { ...el, label } : el)))
  }

  const handleChangeText = (id: string, text: string) => {
    updateElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, props: { ...el.props, text } } : el))
    )
  }

  const handleChangeHtml = (id: string, html: string) => {
    updateElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, props: { ...el.props, html } } : el))
    )
  }

  // ---------- SIMPAN ----------
  const handleSave = () => {
    if (!templateName.trim()) {
      toast.error("Nama template wajib diisi!")
      return
    }

    const konten: TemplateContent = {
      schemaVersion: 1,
      page: pageSetup,
      elements: normalizeOrder(canvasElements),
    }

    saveMutation.mutate(
      { nama: templateName.trim(), jenis: templateType, konten },
      {
        onSuccess: (res) => {
          toast.success(`Template berhasil ${isEdit ? "diperbarui" : "disimpan"}!`)
          if (!isEdit) {
            // Pindah ke mode edit tanpa memuat ulang isi canvas
            setHydrated(true)
            router.replace(`${BUILDER_PATH}?id=${res.id}`)
          }
        },
        onError: (err) => {
          toast.error(`Gagal menyimpan template: ${getErrorMessage(err)}`)
        },
      }
    )
  }

  const selectedElement = canvasElements.find((el) => el.id === selectedElementId)
  const paper = PAPER_DIMENSIONS[pageSetup.size] ?? PAPER_DIMENSIONS.A4

  // Garis penanda tujuan sisip. Disembunyikan kalau posisinya sama dengan posisi asal (tidak ada perubahan)
  const draggingIndex = draggingId
    ? canvasElements.findIndex((el) => el.id === draggingId)
    : -1
  const indicatorIndex =
    dropIndex !== null &&
    !(draggingIndex >= 0 && (dropIndex === draggingIndex || dropIndex === draggingIndex + 1))
      ? dropIndex
      : null

  if (isEdit && isLoading && !hydrated) {
    return (
      <div className="flex h-screen w-full items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Memuat template...
      </div>
    )
  }

  if (isEdit && loadError && !hydrated) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        <p>Gagal memuat template: {getErrorMessage(loadError)}</p>
        <Link href={LIST_PATH} className="underline underline-offset-4">
          Kembali ke daftar template
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen w-full bg-muted/30 overflow-hidden">
      {/* 1. TOP NAVBAR / HEADER BUILDER */}
      <header className="h-14 border-b bg-background px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={LIST_PATH}
            aria-label="Kembali ke daftar template"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
          <div className="h-4 w-[1px] bg-border" />
          <Input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            maxLength={150}
            className="h-8 font-semibold w-64 text-sm"
          />
          <Badge variant="outline">{JENIS_LABEL[templateType] ?? templateType}</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" disabled title="Belum tersedia">
            <EyeIcon className="h-3.5 w-3.5" /> Preview PDF
          </Button>
          <Button size="sm" className="gap-1.5 text-xs" onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <SaveIcon className="h-3.5 w-3.5" />
            )}
            Simpan Template
          </Button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE (SIDEBAR - CANVAS - PROPERTIES) */}
      <div className="flex flex-1 overflow-hidden">

        {/* A. LEFT SIDEBAR: PALETTE COMPONENTS */}
        <aside className="w-64 border-r bg-background flex flex-col shrink-0">
          <div className="p-3 border-b bg-muted/10 font-semibold text-xs text-muted-foreground uppercase tracking-wider">
            Komponen & Elemen
          </div>
          <div className="p-3 space-y-4 overflow-y-auto flex-1">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Tarik & Lepas ke Canvas</p>
              <div className="grid grid-cols-1 gap-2">
                {PALETTE_ITEMS.map((item) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={item.type}
                      draggable
                      onDragStart={(e) => handlePaletteDragStart(e, item.type)}
                      onDragEnd={clearDrag}
                      className="flex items-center gap-2.5 p-2.5 rounded-md border bg-card hover:bg-accent hover:border-primary/50 cursor-grab active:cursor-grabbing transition-colors text-xs font-medium"
                    >
                      <GripVerticalIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      <Icon className="h-4 w-4 text-primary" />
                      <span>{item.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* B. CENTER CANVAS: PRINT PREVIEW */}
        <main
          className="flex-1 overflow-y-auto p-8 flex justify-center bg-muted/40"
          onDragOver={handleMainDragOver}
          onDrop={handleDropOnCanvas}
        >
          {/* Simulated Paper */}
          <div
            style={{ width: `${paper.width}mm`, minHeight: `${paper.height}mm` }}
            className="bg-background shadow-lg border rounded-sm p-[15mm] flex flex-col gap-4 relative transition-all"
            onDragOver={handlePaperDragOver}
            onDragLeave={handlePaperDragLeave}
          >
            <div className="absolute top-2 right-2 text-[10px] text-muted-foreground border px-1.5 py-0.5 rounded">
              Ukuran: {pageSetup.size}
            </div>

            {canvasElements.length === 0 ? (
              <div className="flex-1 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <MoveIcon className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm font-medium">Canvas Masih Kosong</p>
                <p className="text-xs">Tarik komponen dari sidebar kiri ke dalam kertas ini.</p>
              </div>
            ) : (
              canvasElements.map((el, index) => {
                const isSelected = selectedElementId === el.id
                const isDragging = draggingId === el.id

                return (
                  <div
                    key={el.id}
                    // Text Box yang sedang diedit tidak bisa digeser dari kotaknya (menghalangi seleksi teks),
                    // geser lewat handle di toolbar
                    draggable={!(isSelected && el.type === "textbox")}
                    onDragStart={(e) => handleElementDragStart(e, el.id)}
                    onDragEnd={clearDrag}
                    onDragOver={(e) => handleElementDragOver(e, index)}
                    onClick={() => setSelectedElementId(el.id)}
                    className={`group relative p-3 border rounded-md cursor-grab active:cursor-grabbing transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-transparent hover:border-border hover:bg-muted/20"
                    } ${isDragging ? "opacity-40" : ""}`}
                  >
                    {/* Garis tujuan sisip: di atas elemen ini */}
                    {indicatorIndex === index && (
                      <div className="pointer-events-none absolute -top-[9px] left-0 right-0 h-0.5 rounded bg-primary" />
                    )}
                    {/* Garis tujuan sisip: di bawah elemen terakhir */}
                    {indicatorIndex === canvasElements.length &&
                      index === canvasElements.length - 1 && (
                        <div className="pointer-events-none absolute -bottom-[9px] left-0 right-0 h-0.5 rounded bg-primary" />
                      )}

                    {/* Handle geser */}
                    <div className="pointer-events-none absolute -left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      <GripVerticalIcon className="h-4 w-4" />
                    </div>

                    {/* Render Visual Sesuai Tipe */}
                    {el.type === "kop_sekolah" && (
                      <div className="border-b-2 border-black pb-2 text-center">
                        <p className="font-bold text-sm uppercase">Pemerintah Kota / Yayasan Pendidikan</p>
                        <p className="font-extrabold text-base">SMA NEGERI 1 EDUKA</p>
                        <p className="text-[10px] text-muted-foreground">Jl. Pendidikan No. 123, Jakarta Selatan</p>
                      </div>
                    )}

                    {el.type === "heading" && (
                      <div className="text-center my-1">
                        <h2 className="font-bold text-base uppercase tracking-wide">
                          {textOf(el) || el.label}
                        </h2>
                      </div>
                    )}

                    {el.type === "section" && (
                      <div className="grid grid-cols-2 gap-2 text-xs border p-2 bg-muted/10 rounded">
                        <div>Nama Siswa: <b>[Nama Siswa]</b></div>
                        <div>Kelas: <b>[Nama Kelas]</b></div>
                        <div>NISN: <b>[NISN Siswa]</b></div>
                        <div>Semester: <b>[Ganjil/Genap]</b></div>
                      </div>
                    )}

                    {el.type === "tabel_nilai" && (
                      <div className="space-y-1">
                        <span className="text-xs font-semibold">Tabel Capaian Nilai Akademik</span>
                        <table className="w-full text-[11px] border-collapse border border-foreground/20">
                          <thead>
                            <tr className="bg-muted/30">
                              <th className="border p-1 text-left">Mata Pelajaran</th>
                              <th className="border p-1 w-12 text-center">Nilai</th>
                              <th className="border p-1 text-left">Capaian Kompetensi</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border p-1">Matematika</td>
                              <td className="border p-1 text-center">88</td>
                              <td className="border p-1">Menunjukkan penguasaan baik dalam Aljabar</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}

                    {el.type === "catatan_wali" && (
                      <div className="border p-2 rounded text-xs space-y-1">
                        <span className="font-semibold">Catatan Wali Kelas:</span>
                        <p className="italic text-muted-foreground">
                          "Pertahankan prestasi yang sangat baik ini di semester depan."
                        </p>
                      </div>
                    )}

                    {el.type === "ttd_block" && (
                      <div className="grid grid-cols-3 text-center text-[11px] pt-4 mt-2">
                        <div>Orang Tua / Wali<br /><br /><br />( ............................ )</div>
                        <div>Wali Kelas<br /><br /><br />( ............................ )</div>
                        <div>Kepala Sekolah<br /><br /><br />( ............................ )</div>
                      </div>
                    )}

                    {el.type === "textbox" &&
                      (isSelected ? (
                        // key = id elemen, supaya editor dimuat ulang saat pindah elemen
                        <RichTextEditor
                          key={el.id}
                          floating
                          value={htmlOf(el)}
                          onChange={(html) => handleChangeHtml(el.id, html)}
                          features={TEXTBOX_EDITOR_FEATURES}
                          contentClassName={RICH_CONTENT_CLASS}
                          toolbarLead={
                            <div
                              draggable
                              onDragStart={(e) => handleElementDragStart(e, el.id)}
                              onDragEnd={clearDrag}
                              className="flex h-8 w-6 cursor-grab items-center justify-center text-muted-foreground active:cursor-grabbing"
                              title="Geser elemen"
                            >
                              <GripVerticalIcon className="h-4 w-4" />
                            </div>
                          }
                        />
                      ) : (
                        <div
                          className={RICH_CONTENT_CLASS}
                          // HTML berasal dari editor teks dan dibersihkan lagi oleh server saat disimpan
                          dangerouslySetInnerHTML={{ __html: htmlOf(el) }}
                        />
                      ))}

                    {/* Action Bar Hover */}
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-6 w-6"
                        title="Naikkan"
                        disabled={index === 0}
                        onClick={(e) => handleMoveElement(el.id, -1, e)}
                      >
                        <ArrowUpIcon className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-6 w-6"
                        title="Turunkan"
                        disabled={index === canvasElements.length - 1}
                        onClick={(e) => handleMoveElement(el.id, 1, e)}
                      >
                        <ArrowDownIcon className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-6 w-6"
                        title="Hapus"
                        onClick={(e) => handleDeleteElement(el.id, e)}
                      >
                        <Trash2Icon className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </main>

        {/* C. RIGHT SIDEBAR: PROPERTIES & SETTINGS */}
        <aside className="w-72 border-l bg-background flex flex-col shrink-0">
          <Tabs defaultValue="properti" className="w-full flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2 rounded-none border-b">
              <TabsTrigger value="properti">Elemen</TabsTrigger>
              <TabsTrigger value="halaman">Halaman</TabsTrigger>
            </TabsList>

            <TabsContent value="properti" className="p-4 space-y-4 flex-1 overflow-y-auto">
              {selectedElement ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs">Tipe Elemen</Label>
                    <Input value={selectedElement.type} disabled className="h-8 text-xs mt-1" />
                  </div>

                  <div>
                    <Label className="text-xs">Label / Judul Komponen</Label>
                    <Input
                      value={selectedElement.label}
                      onChange={(e) => handleChangeLabel(selectedElement.id, e.target.value)}
                      maxLength={200}
                      className="h-8 text-xs mt-1"
                    />
                  </div>

                  {selectedElement.type === "heading" && (
                    <div>
                      <Label className="text-xs">Isi Teks</Label>
                      <Input
                        value={textOf(selectedElement)}
                        onChange={(e) => handleChangeText(selectedElement.id, e.target.value)}
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                  )}

                  {selectedElement.type === "textbox" && (
                    <p className="text-xs text-muted-foreground">
                      Klik kotak teks di canvas untuk mengedit isinya langsung. Toolbar format muncul di atas kotak.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center pt-8">
                  Pilih salah satu elemen di canvas untuk mengubah propertinya.
                </p>
              )}
            </TabsContent>

            <TabsContent value="halaman" className="p-4 space-y-4 flex-1 overflow-y-auto">
              <div className="space-y-3">
                <Label className="text-xs">Jenis Rapor</Label>
                <Select
                  value={templateType}
                  onValueChange={(v) => { if (v) setTemplateType(v) }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEMESTER">Akhir Semester</SelectItem>
                    <SelectItem value="TENGAH_SEMESTER">Tengah Semester (PTS)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-xs">Ukuran Kertas</Label>
                <Select
                  value={pageSetup.size}
                  onValueChange={(v) => {
                    if (v) setPageSetup((prev) => ({ ...prev, size: v as PaperSize }))
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4 (210 x 297 mm)</SelectItem>
                    <SelectItem value="F4">F4 / Folio (215 x 330 mm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>
        </aside>

      </div>
    </div>
  )
}