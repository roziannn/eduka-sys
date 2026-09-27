"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { driver } from "driver.js"
import "driver.js/dist/driver.css"
import { z } from "zod"
import { toast } from "sonner"
import { ArrowLeft, Save, Plus, Trash2, HelpCircle, CheckCircle2, Eye } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import RichTextEditor from "@/components/rich-text-editor"

// --- TYPES & CONSTANTS ---
// Opsi menggunakan ID numerik (1, 2, 3, 4) sesuai desain database mst_soal_ujian
interface OpsiJawaban {
  id: number
  label: string
  teks: string
  isBenar: boolean
}

interface SoalItem {
  id: string
  pertanyaan: string
  tipe: "Pilihan Ganda" | "Essai"
  isMultipleChoice?: boolean
  bobot: number
  opsi: OpsiJawaban[]
}

const LIST_MAPEL = ["Matematika", "Bahasa Indonesia", "Bahasa Inggris", "Fisika", "Kimia", "Biologi"]
const LIST_JENIS = ["UH", "UTS", "UAS", "US"]
const LIST_KELAS = ["X IPA", "X IPS", "XI IPA", "XI IPS", "XII IPA", "XII IPS"]

const stripHtml = (html: string) => html?.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() || ""

// --- ZOD VALIDATION SCHEMAS ---
const opsiSchema = z.object({
  id: z.number(),
  label: z.string(),
  teks: z.string().trim().min(1, { message: "Teks pilihan jawaban tidak boleh kosong." }),
  isBenar: z.boolean(),
})

const soalSchema = z.object({
  id: z.string(),
  pertanyaan: z.string().refine((val) => stripHtml(val).length > 0, {
    message: "Pertanyaan soal tidak boleh kosong.",
  }),
  tipe: z.enum(["Pilihan Ganda", "Essai"]),
  isMultipleChoice: z.boolean().optional(),
  bobot: z.number().min(1, { message: "Bobot minimal bernilai 1." }),
  opsi: z.array(opsiSchema),
}).superRefine((soal, ctx) => {
  if (soal.tipe === "Pilihan Ganda") {
    soal.opsi.forEach((o, idx) => {
      if (!o.teks.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Opsi ${o.label} wajib diisi.`,
          path: ["opsi", idx, "teks"],
        })
      }
    })

    const hasCorrectAnswer = soal.opsi.some((o) => o.isBenar)
    if (!hasCorrectAnswer) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimal harus memilih 1 kunci jawaban benar.",
        path: ["opsi"],
      })
    }
  }
})

const ujianSchema = z.object({
  namaUjian: z.string().trim().min(1, { message: "Nama Ujian wajib diisi." }),
  mataPelajaran: z.string().min(1, { message: "Mata Pelajaran wajib dipilih." }),
  jenisUjian: z.string().min(1, { message: "Jenis Ujian wajib dipilih." }),
  targetKelas: z.array(z.string()).min(1, { message: "Pilih minimal 1 Distribusi Kelas." }),
  tahunAjaran: z.string().trim().min(1, { message: "Tahun Ajaran wajib diisi." }),
  semester: z.string().trim().min(1, { message: "Semester wajib diisi." }),
  durasiMenit: z.number().min(1, { message: "Durasi ujian minimal 1 menit." }),
  kkm: z.number().min(0, { message: "KKM minimal 0." }).max(100, { message: "KKM maksimal 100." }),
  acakSoal: z.boolean(),
  tampilkanHasil: z.boolean(),
  soalList: z.array(soalSchema).min(1, { message: "Ujian harus memiliki minimal 1 butir soal." }),
})

const TOUR_STEPS = [
  { element: "#tour-card-info", popover: { title: "Konfigurasi Ujian", description: "Isi informasi dasar ujian di sini.", side: "right", align: "start" } },
  { element: "#tour-distribusi-kelas", popover: { title: "Distribusi Kelas", description: "Pilih kelas target ujian.", side: "right", align: "start" } },
  { element: "#tour-tombol-tambah-soal", popover: { title: "Tambah Butir Soal", description: "Tambah soal Pilihan Ganda atau Essai.", side: "bottom", align: "end" } },
  { element: "#tour-daftar-soal", popover: { title: "Editor Soal", description: "Kelola pertanyaan dan opsi jawaban.", side: "left", align: "start" } },
  { element: "#tour-action-buttons", popover: { title: "Aksi Ujian", description: "Preview, simpan draft, atau terbitkan.", side: "bottom", align: "end" } },
]

export default function CreateUjianPage() {
  const router = useRouter()

  const [infoUjian, setInfoUjian] = React.useState({
    namaUjian: "",
    mataPelajaran: LIST_MAPEL[0],
    jenisUjian: "UTS",
    targetKelas: ["X IPA"],
    tahunAjaran: "2025/2026",
    semester: "Genap",
    durasiMenit: 90,
    kkm: 75,
    acakSoal: true,
    tampilkanHasil: false,
  })

  const [openItems, setOpenItems] = React.useState<string[]>(["s-1"])
  const [soalList, setSoalList] = React.useState<SoalItem[]>([
    {
      id: "s-1",
      pertanyaan: "",
      tipe: "Pilihan Ganda",
      isMultipleChoice: false,
      bobot: 10,
      opsi: Array.from({ length: 4 }, (_, i) => ({
        id: i + 1,
        label: String.fromCharCode(65 + i),
        teks: "",
        isBenar: i === 0,
      })),
    },
  ])

  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const clearError = (key: string) => {
    setErrors((prev) => {
      if (!prev[key]) return prev
      const newErr = { ...prev }
      delete newErr[key]
      return newErr
    })
  }

  const handleInfoChange = (field: string, value: any) => {
    setInfoUjian((prev) => ({ ...prev, [field]: value }))
    clearError(field)
  }

  const startTour = React.useCallback(() => {
    driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      steps: TOUR_STEPS as any,
    }).drive()
  }, [])

  React.useEffect(() => {
    const timer = setTimeout(startTour, 500)
    return () => clearTimeout(timer)
  }, [startTour])

  const handleAddSoal = (tipe: "Pilihan Ganda" | "Essai") => {
    const newId = `s-${Date.now()}`
    const newSoal: SoalItem = {
      id: newId,
      pertanyaan: "",
      tipe,
      isMultipleChoice: false,
      bobot: 10,
      opsi:
        tipe === "Pilihan Ganda"
          ? Array.from({ length: 4 }, (_, i) => ({
              id: i + 1,
              label: String.fromCharCode(65 + i),
              teks: "",
              isBenar: i === 0,
            }))
          : [],
    }
    setSoalList((prev) => [...prev, newSoal])
    setOpenItems((prev) => [...prev, newId])
  }

  const handleRemoveSoal = (index: number) => {
    const targetId = soalList[index].id
    setSoalList((prev) => prev.filter((_, i) => i !== index))
    setOpenItems((prev) => prev.filter((id) => id !== targetId))
  }

  const handleUpdateSoal = (index: number, updatedFields: Partial<SoalItem>) => {
    setSoalList((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], ...updatedFields }
      return copy
    })
  }

  // --- HANDLER SIMPAN & PAYLOAD DATABASE MATCHING ---
  const handleSave = async (status: "Draft" | "Siap Ujian") => {
    if (status === "Siap Ujian") {
      const validationResult = ujianSchema.safeParse({
        ...infoUjian,
        soalList,
      })

      if (!validationResult.success) {
        const formattedErrors: Record<string, string> = {}

        validationResult.error.issues.forEach((issue) => {
          const pathKey = issue.path.join(".")
          formattedErrors[pathKey] = issue.message
        })

        setErrors(formattedErrors)

        const errorSoalIds = validationResult.error.issues
          .filter((issue) => issue.path[0] === "soalList")
          .map((issue) => soalList[Number(issue.path[1])]?.id)
          .filter(Boolean)

        if (errorSoalIds.length > 0) {
          setOpenItems((prev) => Array.from(new Set([...prev, ...errorSoalIds])))
        }

        toast.error("Gagal menerbitkan ujian. Lengkapi semua data bertanda merah.")
        return
      }
    }

    setErrors({})
    const totalBobot = soalList.reduce((acc, curr) => acc + (Number(curr.bobot) || 0), 0)

    // Payload dipetakan sesuai kolom tabel mst_ujian & mst_soal_ujian
    const payload = {
      mst_ujian: {
        nama_ujian: infoUjian.namaUjian,
        mata_pelajaran: infoUjian.mataPelajaran,
        jenis_ujian: infoUjian.jenisUjian,
        target_kelas: infoUjian.targetKelas,
        tahun_ajaran: infoUjian.tahunAjaran,
        semester: infoUjian.semester,
        durasi_menit: infoUjian.durasiMenit,
        kkm: infoUjian.kkm,
        acak_soal: infoUjian.acakSoal,
        tampilkan_hasil: infoUjian.tampilkanHasil,
        status,
        total_soal: soalList.length,
        total_bobot: totalBobot,
      },
      mst_soal_ujian: soalList.map((soal, idx) => ({
        urutan: idx + 1,
        pertanyaan: soal.pertanyaan,
        tipe: soal.tipe,
        is_multiple_choice: !!soal.isMultipleChoice,
        bobot: soal.bobot,
        opsi: soal.opsi, // Array JSONB langsung
      })),
    }

    console.log("Saving Payload (Matching DB Schema):", payload)

    if (status === "Draft") {
      toast.success("Draft ujian berhasil disimpan.")
    } else {
      toast.success("Ujian berhasil diterbitkan!")
    }

    router.push("/dashboard/soal-ujian")
  }

  const handleOpenPreview = () => {
    sessionStorage.setItem("previewUjianData", JSON.stringify({ ...infoUjian, soalList }))
    window.open("/dashboard/soal-ujian/create/preview-soal", "_blank")
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button size="icon" variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Buat Soal Ujian Baru</h1>
            <p className="text-sm text-muted-foreground">Lengkapi konfigurasi dan butir soal.</p>
          </div>
        </div>

        <div id="tour-action-buttons" className="flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={startTour}>
            <HelpCircle className="h-5 w-5" />
          </Button>
          <Button variant="outline" onClick={handleOpenPreview}>
            <Eye className="mr-2 h-4 w-4" /> Preview
          </Button>
          <Button variant="outline" onClick={() => handleSave("Draft")}>
            <Save className="mr-2 h-4 w-4" /> Draft
          </Button>
          <Button onClick={() => handleSave("Siap Ujian")}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> Terbitkan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Panel Kiri: Form Config */}
        <Card className="lg:col-span-1 lg:sticky lg:top-6" id="tour-card-info">
          <CardHeader>
            <CardTitle className="text-lg">Informasi Ujian</CardTitle>
            <CardDescription>Pengaturan dasar ujian.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Nama Ujian <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Contoh: UTS Matematika X"
                value={infoUjian.namaUjian}
                onChange={(e) => handleInfoChange("namaUjian", e.target.value)}
                className={errors["namaUjian"] ? "border-destructive" : ""}
              />
              {errors["namaUjian"] && <p className="text-xs text-destructive">{errors["namaUjian"]}</p>}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 grid gap-2">
                <Label>Mapel <span className="text-destructive">*</span></Label>
                <Select value={infoUjian.mataPelajaran} onValueChange={(v) => handleInfoChange("mataPelajaran", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LIST_MAPEL.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Jenis <span className="text-destructive">*</span></Label>
                <Select value={infoUjian.jenisUjian} onValueChange={(v) => handleInfoChange("jenisUjian", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LIST_JENIS.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div id="tour-distribusi-kelas" className="grid gap-2">
              <Label>Distribusi Kelas <span className="text-destructive">*</span></Label>
              <div className={`grid grid-cols-2 gap-2 bg-muted/30 p-3 rounded-lg border ${errors["targetKelas"] ? "border-destructive" : ""}`}>
                {LIST_KELAS.map((k) => (
                  <div key={k} className="flex items-center space-x-2">
                    <Checkbox
                      id={`kelas-${k}`}
                      checked={infoUjian.targetKelas.includes(k)}
                      onCheckedChange={(checked) => {
                        const updated = checked
                          ? [...infoUjian.targetKelas, k]
                          : infoUjian.targetKelas.filter((item) => item !== k)
                        handleInfoChange("targetKelas", updated)
                      }}
                    />
                    <Label className="text-xs font-normal cursor-pointer" htmlFor={`kelas-${k}`}>{k}</Label>
                  </div>
                ))}
              </div>
              {errors["targetKelas"] && <p className="text-xs text-destructive">{errors["targetKelas"]}</p>}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-2">
                <Label>Tahun Ajaran <span className="text-destructive">*</span></Label>
                <Input
                  value={infoUjian.tahunAjaran}
                  onChange={(e) => handleInfoChange("tahunAjaran", e.target.value)}
                  className={errors["tahunAjaran"] ? "border-destructive" : ""}
                />
                {errors["tahunAjaran"] && <p className="text-xs text-destructive">{errors["tahunAjaran"]}</p>}
              </div>
              <div className="grid gap-2">
                <Label>Semester <span className="text-destructive">*</span></Label>
                <Input
                  value={infoUjian.semester}
                  onChange={(e) => handleInfoChange("semester", e.target.value)}
                  className={errors["semester"] ? "border-destructive" : ""}
                />
                {errors["semester"] && <p className="text-xs text-destructive">{errors["semester"]}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
              <div className="grid gap-2">
                <Label>Durasi (Menit) <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  value={infoUjian.durasiMenit}
                  onChange={(e) => handleInfoChange("durasiMenit", Number(e.target.value))}
                  className={errors["durasiMenit"] ? "border-destructive" : ""}
                />
                {errors["durasiMenit"] && <p className="text-xs text-destructive">{errors["durasiMenit"]}</p>}
              </div>
              <div className="grid gap-2">
                <Label>Nilai KKM <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  value={infoUjian.kkm}
                  onChange={(e) => handleInfoChange("kkm", Number(e.target.value))}
                  className={errors["kkm"] ? "border-destructive" : ""}
                />
                {errors["kkm"] && <p className="text-xs text-destructive">{errors["kkm"]}</p>}
              </div>
            </div>

            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between">
                <Label>Acak Urutan Soal</Label>
                <Switch checked={infoUjian.acakSoal} onCheckedChange={(v) => handleInfoChange("acakSoal", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Tampilkan Hasil Langsung</Label>
                <Switch checked={infoUjian.tampilkanHasil} onCheckedChange={(v) => handleInfoChange("tampilkanHasil", v)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Panel Kanan: List Soal */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between sticky top-0 bg-background z-10 py-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <HelpCircle className="h-5 w-5" /> Daftar Butir Soal ({soalList.length})
            </h2>
            <div id="tour-tombol-tambah-soal" className="flex items-center gap-2">
              <Button size="sm" onClick={() => handleAddSoal("Pilihan Ganda")}>
                <Plus className="mr-1 h-3.5 w-3.5" /> PG Baru
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleAddSoal("Essai")}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Essai Baru
              </Button>
            </div>
          </div>

          <div id="tour-daftar-soal" className="max-h-[calc(100vh-180px)] overflow-y-auto pr-2 space-y-4">
            <Accordion className="space-y-4" type="multiple" value={openItems} onValueChange={setOpenItems}>
              {soalList.map((soal, sIdx) => (
                <SoalItemCard
                  key={soal.id}
                  soal={soal}
                  index={sIdx}
                  errors={errors}
                  clearError={clearError}
                  canDelete={soalList.length > 1}
                  onRemove={() => handleRemoveSoal(sIdx)}
                  onUpdate={(fields) => handleUpdateSoal(sIdx, fields)}
                />
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- SUB-COMPONENT CARD SOAL ---
interface SoalItemCardProps {
  soal: SoalItem
  index: number
  errors: Record<string, string>
  clearError: (key: string) => void
  canDelete: boolean
  onRemove: () => void
  onUpdate: (fields: Partial<SoalItem>) => void
}

function SoalItemCard({ soal, index, errors, clearError, canDelete, onRemove, onUpdate }: SoalItemCardProps) {
  const plainPertanyaan = stripHtml(soal.pertanyaan)

  const handleToggleMultipleChoice = (checked: boolean) => {
    let newOpsi = soal.opsi
    if (!checked) {
      let foundFirst = false
      newOpsi = soal.opsi.map((o) => {
        if (o.isBenar && !foundFirst) {
          foundFirst = true
          return o
        }
        return { ...o, isBenar: false }
      })
    }
    onUpdate({ isMultipleChoice: checked, opsi: newOpsi })
  }

  const handleToggleOpsiBenar = (oIdx: number) => {
    const updatedOpsi = soal.opsi.map((o, i) => {
      if (soal.isMultipleChoice) {
        return i === oIdx ? { ...o, isBenar: !o.isBenar } : o
      }
      return { ...o, isBenar: i === oIdx }
    })

    if (updatedOpsi.some((o) => o.isBenar)) {
      clearError(`soalList.${index}.opsi`)
    }

    onUpdate({ opsi: updatedOpsi })
  }

  const handleUpdateOpsiTeks = (oIdx: number, teks: string) => {
    const updatedOpsi = [...soal.opsi]
    updatedOpsi[oIdx].teks = teks

    if (teks.trim().length > 0) {
      clearError(`soalList.${index}.opsi.${oIdx}.teks`)
    }

    onUpdate({ opsi: updatedOpsi })
  }

  const handlePertanyaanChange = (html: string) => {
    onUpdate({ pertanyaan: html })

    if (stripHtml(html).length > 0) {
      clearError(`soalList.${index}.pertanyaan`)
    }
  }

  const pertErr = errors[`soalList.${index}.pertanyaan`]
  const opsiKeyErr = errors[`soalList.${index}.opsi`]

  return (
    <AccordionItem className="border rounded-lg bg-card px-4 py-1" value={soal.id}>
      <div className="flex items-center justify-between w-full">
        <AccordionTrigger className="hover:no-underline py-3 flex-1">
          <div className="flex items-center gap-2 text-left">
            <Badge variant="outline">Nomor {index + 1}</Badge>
            <Badge>{soal.tipe}</Badge>
            {soal.tipe === "Pilihan Ganda" && (
              <Badge variant={soal.isMultipleChoice ? "secondary" : "outline"} className="text-[10px]">
                {soal.isMultipleChoice ? "Jawaban Banyak" : "1 Jawaban"}
              </Badge>
            )}
            <span className="text-sm font-normal text-muted-foreground line-clamp-1 max-w-[200px]">
              {plainPertanyaan || "Pertanyaan belum diisi..."}
            </span>
          </div>
        </AccordionTrigger>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md border">
            <Label className="text-xs text-muted-foreground">Bobot *:</Label>
            <Input
              type="number"
              min={0}
              value={soal.bobot}
              onChange={(e) => onUpdate({ bobot: Number(e.target.value) })}
              onClick={(e) => e.stopPropagation()}
              className="w-16 h-7 text-xs px-2 text-center"
            />
          </div>

          {canDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <AccordionContent className="pt-2 pb-4 space-y-4 border-t mt-1">
        <div className="grid gap-2 pt-1">
          <Label>Pertanyaan Soal <span className="text-destructive">*</span></Label>
          <RichTextEditor
            isError={!!pertErr}
            value={soal.pertanyaan}
            placeholder="Tuliskan pertanyaan soal di sini..."
            onChange={handlePertanyaanChange}
          />
          {pertErr && <p className="text-xs text-destructive">{pertErr}</p>}
        </div>

        {soal.tipe === "Pilihan Ganda" && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between bg-muted/40 p-2 rounded-md border">
              <div className="space-y-0.5">
                <Label className="text-xs font-medium cursor-pointer" htmlFor={`mode-jawaban-${soal.id}`}>
                  Lebih dari satu jawaban benar
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Aktifkan jika soal ini memiliki lebih dari satu kunci jawaban benar.
                </p>
              </div>
              <Switch
                id={`mode-jawaban-${soal.id}`}
                checked={!!soal.isMultipleChoice}
                onCheckedChange={handleToggleMultipleChoice}
              />
            </div>

            <Label className="text-xs text-muted-foreground flex items-center justify-between">
              <span>Opsi Jawaban <span className="text-destructive">*</span></span>
              <span className="text-[11px] text-primary">
                {soal.isMultipleChoice ? "(Bisa pilih >1 jawaban)" : "(Pilih 1 jawaban benar)"}
              </span>
            </Label>
            {opsiKeyErr && <p className="text-xs text-destructive">{opsiKeyErr}</p>}

            <div className="space-y-2">
              {soal.opsi.map((opsi, oIdx) => {
                const opsiTxtErr = errors[`soalList.${index}.opsi.${oIdx}.teks`]

                return (
                  <div key={opsi.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={opsi.isBenar ? "default" : "outline"}
                        className={`w-9 h-9 p-0 shrink-0 ${
                          opsi.isBenar ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                        }`}
                        onClick={() => handleToggleOpsiBenar(oIdx)}
                      >
                        {opsi.label}
                      </Button>
                      <Input
                        placeholder={`Pilihan ${opsi.label}...`}
                        value={opsi.teks}
                        onChange={(e) => handleUpdateOpsiTeks(oIdx, e.target.value)}
                        className={opsiTxtErr ? "border-destructive" : ""}
                      />
                    </div>
                    {opsiTxtErr && <p className="text-xs text-destructive pl-11">{opsiTxtErr}</p>}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  )
}