"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeftIcon,
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
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

// Tipe Elemen Canvas
type ElementType =
  | "heading"
  | "textbox"
  | "section"
  | "kop_sekolah"
  | "tabel_nilai"
  | "tabel_absensi"
  | "catatan_wali"
  | "ttd_block"

interface CanvasElement {
  id: string
  type: ElementType
  title: string
  content?: string
}

// Daftar Komponen Palette yang Bisa Di-drag
const PALETTE_ITEMS = [
  { type: "heading", label: "Heading / Judul", icon: HeadingIcon, category: "Dasar" },
  { type: "textbox", label: "Text Box / Paragraf", icon: TypeIcon, category: "Dasar" },
  { type: "section", label: "Section Box", icon: LayoutTemplateIcon, category: "Dasar" },
  { type: "kop_sekolah", label: "Kop Surat Sekolah", icon: ImageIcon, category: "Header" },
  { type: "tabel_nilai", label: "Tabel Nilai Mapel", icon: TableIcon, category: "Dinamis" },
  { type: "tabel_absensi", label: "Tabel Kehadiran", icon: CheckSquareIcon, category: "Dinamis" },
  { type: "catatan_wali", label: "Box Catatan Wali", icon: FileTextIcon, category: "Dinamis" },
  { type: "ttd_block", label: "Area Tanda Tangan", icon: PenToolIcon, category: "Footer" },
]

export default function TemplateBuilderPage() {
  const [templateName, setTemplateName] = React.useState("Template Rapor Akhir Semester")
  const [templateType, setTemplateType] = React.useState("SEMESTER")
  const [paperSize, setPaperSize] = React.useState("A4")

  // State Komponen yang ada di Canvas
  const [canvasElements, setCanvasElements] = React.useState<CanvasElement[]>([
    { id: "1", type: "kop_sekolah", title: "Kop Sekolah Resmi" },
    { id: "2", type: "heading", title: "RAPOR HASIL BELAJAR (HASIL ASESMEN)", content: "Judul Utama" },
    { id: "3", type: "section", title: "Identitas Siswa (Nama, NIS, Kelas)" },
    { id: "4", type: "tabel_nilai", title: "Tabel Nilai Capaian Pembelajaran" },
    { id: "5", type: "catatan_wali", title: "Catatan Akademik & Karakter" },
    { id: "6", type: "ttd_block", title: "Blok TTD Orang Tua, Wali Kelas & Kepsek" },
  ])

  const [selectedElementId, setSelectedElementId] = React.useState<string | null>("2")

  // Drag & Drop Handlers (HTML5 Native DnD)
  const handleDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData("application/react-dnd-type", type)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDropOnCanvas = (e: React.DragEvent) => {
    e.preventDefault()
    const type = e.dataTransfer.getData("application/react-dnd-type") as ElementType
    if (!type) return

    const newItem: CanvasElement = {
      id: Date.now().toString(),
      type: type,
      title: PALETTE_ITEMS.find((item) => item.type === type)?.label || "Komponen Baru",
      content: "Isi teks default...",
    }

    setCanvasElements([...canvasElements, newItem])
    setSelectedElementId(newItem.id)
  }

  const handleDeleteElement = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setCanvasElements(canvasElements.filter((el) => el.id !== id))
    if (selectedElementId === id) setSelectedElementId(null)
  }

  const selectedElement = canvasElements.find((el) => el.id === selectedElementId)

  return (
    <div className="flex flex-col h-screen w-full bg-muted/30 overflow-hidden">
      {/* 1. TOP NAVBAR / HEADER BUILDER */}
      <header className="h-14 border-b bg-background px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/master/template-rapor">
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
          </Button>
          <div className="h-4 w-[1px] bg-border" />
          <Input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="h-8 font-semibold w-64 text-sm"
          />
          <Badge variant="outline">{templateType === "SEMESTER" ? "Rapor Semester" : "Rapor PTS"}</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <EyeIcon className="h-3.5 w-3.5" /> Preview PDF
          </Button>
          <Button size="sm" className="gap-1.5 text-xs">
            <SaveIcon className="h-3.5 w-3.5" /> Simpan Template
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
                      onDragStart={(e) => handleDragStart(e, item.type)}
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

        {/* B. CENTER CANVAS: A4 PRINT PREVIEW */}
        <main
          className="flex-1 overflow-y-auto p-8 flex justify-center bg-muted/40"
          onDragOver={handleDragOver}
          onDrop={handleDropOnCanvas}
        >
          {/* Simulated A4 Paper */}
          <div className="w-[210mm] min-h-[297mm] bg-background shadow-lg border rounded-sm p-[15mm] flex flex-col gap-4 relative transition-all">
            <div className="absolute top-2 right-2 text-[10px] text-muted-foreground border px-1.5 py-0.5 rounded">
              Ukuran: {paperSize}
            </div>

            {canvasElements.length === 0 ? (
              <div className="flex-1 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <MoveIcon className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm font-medium">Canvas Masih Kosong</p>
                <p className="text-xs">Tarik komponen dari sidebar kiri ke dalam kertas ini.</p>
              </div>
            ) : (
              canvasElements.map((el) => {
                const isSelected = selectedElementId === el.id

                return (
                  <div
                    key={el.id}
                    onClick={() => setSelectedElementId(el.id)}
                    className={`group relative p-3 border rounded-md cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-transparent hover:border-border hover:bg-muted/20"
                    }`}
                  >
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
                          {el.content || el.title}
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

                    {el.type === "textbox" && (
                      <p className="text-xs">{el.content}</p>
                    )}

                    {/* Action Bar Hover */}
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-6 w-6"
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
                      value={selectedElement.title}
                      onChange={(e) => {
                        const val = e.target.value
                        setCanvasElements(
                          canvasElements.map((el) =>
                            el.id === selectedElement.id ? { ...el, title: val } : el
                          )
                        )
                      }}
                      className="h-8 text-xs mt-1"
                    />
                  </div>

                  {(selectedElement.type === "heading" || selectedElement.type === "textbox") && (
                    <div>
                      <Label className="text-xs">Isi Teks</Label>
                      <Input
                        value={selectedElement.content || ""}
                        onChange={(e) => {
                          const val = e.target.value
                          setCanvasElements(
                            canvasElements.map((el) =>
                              el.id === selectedElement.id ? { ...el, content: val } : el
                            )
                          )
                        }}
                        className="h-8 text-xs mt-1"
                      />
                    </div>
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
                <Select value={templateType} onValueChange={setTemplateType}>
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
                <Select value={paperSize} onValueChange={setPaperSize}>
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