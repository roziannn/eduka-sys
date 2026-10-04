"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { driver } from "driver.js"
import "driver.js/dist/driver.css"
import { z } from "zod"
import { toast } from "sonner"
import { ArrowLeft, Save, Plus, Trash2, HelpCircle, CheckCircle2, Eye, Loader2 } from "lucide-react"

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
import { fetchJson, getErrorMessage } from "@/lib/fetch-json"
import {
  JENIS_UJIAN,
  type ReferensiUjian,
  type SoalDb,
  type StatusUjian,
  type UjianDetail,
} from "@/types/soal-ujian"

// --- TYPES & CONSTANTS ---
// Opsi menggunakan ID numerik (1, 2, 3, 4) di sisi UI. Di database disimpan sebagai string.
interface OpsiJawaban {
  id: number
  label: string
  teks: string
  isBenar: boolean
}

type TipeUI = "Pilihan Ganda" | "Essai"

interface SoalItem {
  id: string
  pertanyaan: string
  tipe: TipeUI
  isMultipleChoice?: boolean
  bobot: number
  opsi: OpsiJawaban[]
}

const LIST_PATH = "/dashboard/soal-ujian"
const UJIAN_KEY = ["soal-ujian"]

const stripHtml = (html: string) => html?.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() || ""

const createSoal = (tipe: TipeUI, id: string): SoalItem => ({
  id,
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
})

// UI -> bentuk JSON di database. Nomor urut (seq) diisi server berdasarkan urutan array.
const soalToPayload = (list: SoalItem[]) =>
  list.map((s) =>
    s.tipe === "Pilihan Ganda"
      ? {
          id: s.id,
          tipe: "PG",
          pertanyaan: s.pertanyaan,
          bobot: Number(s.bobot) || 0,
          multiJawaban: !!s.isMultipleChoice,
          opsi: s.opsi.map((o) => ({ id: String(o.id), teks: o.teks, benar: o.isBenar })),
        }
      : {
          id: s.id,
          tipe: "ESSAI",
          pertanyaan: s.pertanyaan,
          bobot: Number(s.bobot) || 0,
        }
  )

// JSON database -> UI
const soalFromDb = (list: SoalDb[]): SoalItem[] =>
  [...list]
    .sort((a, b) => a.seq - b.seq)
    .map(
      (s): SoalItem => ({
        id: s.id,
        pertanyaan: s.pertanyaan,
        tipe: s.tipe === "PG" ? "Pilihan Ganda" : "Essai",
        isMultipleChoice: !!s.multiJawaban,
        bobot: s.bobot,
        opsi: [...(s.opsi ?? [])]
          .sort((a, b) => a.seq - b.seq)
          .map((o, i) => ({
            id: Number(o.id) || i + 1,
            label: String.fromCharCode(65 + i),
            teks: o.teks,
            isBenar: o.benar,
          })),
      })
    )

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
  mapelId: z.string().min(1, { message: "Mata Pelajaran wajib dipilih." }),
  jenisUjian: z.string().min(1, { message: "Jenis Ujian wajib dipilih." }),
  kelasIds: z.array(z.string()).min(1, { message: "Pilih minimal 1 Distribusi Kelas." }),
  tahunAjaran: z.string().trim().min(1, { message: "Tahun Ajaran wajib dipilih." }),
  semester: z.string().trim().min(1, { message: "Semester wajib dipilih." }),
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

// Suspense wajib karena UjianFormRoot memakai useSearchParams
export default function CreateUjianPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Memuat...
        </div>
      }
    >
      <UjianFormRoot />
    </React.Suspense>
  )
}

// Satu halaman untuk create dan edit: ada ?id=... berarti edit, tanpa id berarti ujian baru.
// key = id supaya seluruh state di-reset saat pindah antar ujian atau dari edit ke baru
// (Next.js tidak me-mount ulang komponen kalau hanya query string yang berubah).
function UjianFormRoot() {
  const searchParams = useSearchParams()
  const ujianId = searchParams.get("id")

  return <UjianLoader key={ujianId ?? "baru"} ujianId={ujianId} />
}

// Mode edit: data diambil DULU, form baru dibuat setelah data siap.
// State form diisi dari data itu saat dibuat (bukan lewat efek), jadi editor teks
// langsung dibuat dengan isi yang benar. Editor hanya membaca isinya sekali saat dibuat.
function UjianLoader({ ujianId }: { ujianId: string | null }) {
  const {
    data: detail,
    isLoading,
    error,
  } = useQuery<UjianDetail>({
    queryKey: [...UJIAN_KEY, ujianId],
    queryFn: () => fetchJson<UjianDetail>(`/api/soal-ujian/${ujianId}`),
    enabled: ujianId !== null,
    // Selalu ambil data segar saat halaman dibuka, dan tidak ada refetch di belakang layar
    // yang bisa menumpuk dengan editan yang sedang berjalan
    gcTime: 0,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  if (ujianId === null) {
    return <UjianForm ujianId={null} initial={null} />
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Memuat ujian...
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-sm text-muted-foreground">
        <p>Gagal memuat ujian: {error ? getErrorMessage(error) : "Data tidak ditemukan"}</p>
        <Link href={LIST_PATH} className="underline underline-offset-4">
          Kembali ke daftar ujian
        </Link>
      </div>
    )
  }

  return <UjianForm ujianId={ujianId} initial={detail} />
}

interface UjianFormProps {
  ujianId: string | null
  initial: UjianDetail | null
}

function UjianForm({ ujianId, initial }: UjianFormProps) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const isEdit = ujianId !== null

  // State awal diisi langsung dari data server (mode edit) atau default (ujian baru)
  const [infoUjian, setInfoUjian] = React.useState(() =>
    initial
      ? {
          namaUjian: initial.nama,
          mapelId: initial.mapelId,
          jenisUjian: initial.jenis as string,
          kelasIds: initial.kelasIds,
          tahunAjaran: initial.tahunAjaran,
          semester: initial.semester,
          durasiMenit: initial.durasiMenit,
          kkm: initial.kkm,
          acakSoal: initial.acakSoal,
          tampilkanHasil: initial.tampilkanHasil,
        }
      : {
          namaUjian: "",
          mapelId: "",
          jenisUjian: "UTS" as string,
          kelasIds: [] as string[],
          tahunAjaran: "",
          semester: "",
          durasiMenit: 90,
          kkm: 75,
          acakSoal: true,
          tampilkanHasil: false,
        }
  )

  const [soalList, setSoalList] = React.useState<SoalItem[]>(() => {
    if (!initial) return [createSoal("Pilihan Ganda", "s-1")]

    const list = soalFromDb(initial.soal)
    // Ujian lama tanpa soal: sediakan satu soal kosong (dirender di client saja, setelah data siap)
    return list.length > 0 ? list : [createSoal("Pilihan Ganda", `s-${Date.now()}`)]
  })

  const [openItems, setOpenItems] = React.useState<string[]>(() =>
    soalList.slice(0, 1).map((s) => s.id)
  )
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  // Ujian baru: default mapel dan periode sudah diterapkan
  const defaultsApplied = React.useRef(false)

  // ---------- DATA ----------
  const { data: referensi, error: referensiError } = useQuery<ReferensiUjian>({
    queryKey: [...UJIAN_KEY, "referensi"],
    queryFn: () => fetchJson<ReferensiUjian>("/api/soal-ujian/referensi"),
  })

  const saveMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      fetchJson<{ id: string }>(isEdit ? `/api/soal-ujian/${ujianId}` : "/api/soal-ujian", {
        method: isEdit ? "PUT" : "POST",
        body,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: UJIAN_KEY }),
  })

  React.useEffect(() => {
    if (referensiError) {
      toast.error(`Gagal memuat data referensi: ${getErrorMessage(referensiError)}`)
    }
  }, [referensiError])

  // Ujian baru: isi default mapel pertama dan periode yang sedang aktif
  React.useEffect(() => {
    if (!referensi || isEdit || defaultsApplied.current) return
    defaultsApplied.current = true

    const periode = referensi.tahunAjaran.find((t) => t.isAktif) ?? referensi.tahunAjaran[0]
    const mapel = referensi.mapel.find((m) => m.isAktif)

    setInfoUjian((prev) => ({
      ...prev,
      mapelId: prev.mapelId || mapel?.id || "",
      tahunAjaran: periode?.tahun ?? "",
      semester: periode?.semester ?? "",
    }))
  }, [referensi, isEdit])

  // ---------- OPSI PILIHAN DARI MASTER DATA ----------
  // Mapel/kelas nonaktif tetap muncul kalau sudah terpilih (saat edit ujian lama)
  const mapelOptions =
    referensi?.mapel.filter((m) => m.isAktif || m.id === infoUjian.mapelId) ?? []
  const kelasOptions =
    referensi?.kelas.filter((k) => k.isAktif || infoUjian.kelasIds.includes(k.id)) ?? []
  const tahunOptions = Array.from(new Set(referensi?.tahunAjaran.map((t) => t.tahun) ?? []))
  const semesterOptions =
    referensi?.tahunAjaran.filter((t) => t.tahun === infoUjian.tahunAjaran).map((t) => t.semester) ?? []

  const mapelNama = referensi?.mapel.find((m) => m.id === infoUjian.mapelId)?.nama ?? ""

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

  // Ganti tahun ajaran: semester ikut menyesuaikan dengan yang tersedia untuk tahun itu
  const handleTahunChange = (tahun: string) => {
    const semesters =
      referensi?.tahunAjaran.filter((t) => t.tahun === tahun).map((t) => t.semester) ?? []

    setInfoUjian((prev) => ({
      ...prev,
      tahunAjaran: tahun,
      semester: semesters.includes(prev.semester) ? prev.semester : semesters[0] ?? "",
    }))
    clearError("tahunAjaran")
    clearError("semester")
  }

  const startTour = React.useCallback(() => {
    driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      steps: TOUR_STEPS as any,
    }).drive()
  }, [])

  // Tour otomatis hanya saat membuat ujian baru. Di mode edit tetap bisa lewat tombol (?)
  React.useEffect(() => {
    if (isEdit) return
    const timer = setTimeout(startTour, 500)
    return () => clearTimeout(timer)
  }, [startTour, isEdit])

  const handleAddSoal = (tipe: TipeUI) => {
    const newId = `s-${Date.now()}`
    setSoalList((prev) => [...prev, createSoal(tipe, newId)])
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

  // --- HANDLER SIMPAN ---
  const handleSave = (status: StatusUjian) => {
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
    } else if (!infoUjian.namaUjian.trim()) {
      // Draft boleh belum lengkap, tapi butuh nama untuk dikenali
      setErrors({ namaUjian: "Nama Ujian wajib diisi." })
      toast.error("Isi nama ujian terlebih dahulu untuk menyimpan draft.")
      return
    }

    setErrors({})

    const body = {
      nama: infoUjian.namaUjian,
      mapelId: infoUjian.mapelId,
      jenis: infoUjian.jenisUjian,
      tahunAjaran: infoUjian.tahunAjaran,
      semester: infoUjian.semester,
      kelasIds: infoUjian.kelasIds,
      durasiMenit: infoUjian.durasiMenit,
      kkm: infoUjian.kkm,
      acakSoal: infoUjian.acakSoal,
      tampilkanHasil: infoUjian.tampilkanHasil,
      status,
      soal: soalToPayload(soalList),
    }

    saveMutation.mutate(body, {
      onSuccess: () => {
        toast.success(status === "Draft" ? "Draft ujian berhasil disimpan." : "Ujian berhasil diterbitkan!")
        router.push(LIST_PATH)
      },
      onError: (err) => {
        toast.error(`Gagal menyimpan ujian: ${getErrorMessage(err)}`)
      },
    })
  }

  const handleOpenPreview = () => {
    // Halaman preview membaca nama mapel dan nama kelas, bukan id
    const kelasNames =
      referensi?.kelas.filter((k) => infoUjian.kelasIds.includes(k.id)).map((k) => k.namaKelas) ?? []

    sessionStorage.setItem(
      "previewUjianData",
      JSON.stringify({
        ...infoUjian,
        mataPelajaran: mapelNama,
        targetKelas: kelasNames,
        soalList,
      })
    )
    window.open("/dashboard/soal-ujian/create/preview-soal", "_blank")
  }

  const isSaving = saveMutation.isPending

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button size="icon" variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{isEdit ? "Edit Soal Ujian" : "Buat Soal Ujian Baru"}</h1>
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
          <Button variant="outline" onClick={() => handleSave("Draft")} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Draft
          </Button>
          <Button onClick={() => handleSave("Siap Ujian")} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} Terbitkan
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
                maxLength={150}
                onChange={(e) => handleInfoChange("namaUjian", e.target.value)}
                className={errors["namaUjian"] ? "border-destructive" : ""}
              />
              {errors["namaUjian"] && <p className="text-xs text-destructive">{errors["namaUjian"]}</p>}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 grid gap-2">
                <Label>Mapel <span className="text-destructive">*</span></Label>
                <Select
                  value={infoUjian.mapelId}
                  onValueChange={(v) => { if (v) handleInfoChange("mapelId", v) }}
                >
                  <SelectTrigger className={errors["mapelId"] ? "border-destructive" : ""}>
                    <SelectValue>{mapelNama || "Pilih mapel"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {mapelOptions.map((m) => <SelectItem key={m.id} value={m.id}>{m.nama}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors["mapelId"] && <p className="text-xs text-destructive">{errors["mapelId"]}</p>}
              </div>
              <div className="grid gap-2">
                <Label>Jenis <span className="text-destructive">*</span></Label>
                <Select
                  value={infoUjian.jenisUjian}
                  onValueChange={(v) => { if (v) handleInfoChange("jenisUjian", v) }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{JENIS_UJIAN.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div id="tour-distribusi-kelas" className="grid gap-2">
              <Label>Distribusi Kelas <span className="text-destructive">*</span></Label>
              <div className={`grid grid-cols-2 gap-2 bg-muted/30 p-3 rounded-lg border ${errors["kelasIds"] ? "border-destructive" : ""}`}>
                {kelasOptions.length === 0 && (
                  <p className="col-span-2 text-xs text-muted-foreground">
                    Belum ada data kelas. Tambahkan dulu di Master Data &gt; Data Kelas.
                  </p>
                )}
                {kelasOptions.map((k) => (
                  <div key={k.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`kelas-${k.id}`}
                      checked={infoUjian.kelasIds.includes(k.id)}
                      onCheckedChange={(checked) => {
                        const updated = checked
                          ? [...infoUjian.kelasIds, k.id]
                          : infoUjian.kelasIds.filter((item) => item !== k.id)
                        handleInfoChange("kelasIds", updated)
                      }}
                    />
                    <Label className="text-xs font-normal cursor-pointer" htmlFor={`kelas-${k.id}`}>{k.namaKelas}</Label>
                  </div>
                ))}
              </div>
              {errors["kelasIds"] && <p className="text-xs text-destructive">{errors["kelasIds"]}</p>}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-2">
                <Label>Tahun Ajaran <span className="text-destructive">*</span></Label>
                <Select
                  value={infoUjian.tahunAjaran}
                  onValueChange={(v) => { if (v) handleTahunChange(v) }}
                >
                  <SelectTrigger className={errors["tahunAjaran"] ? "border-destructive" : ""}>
                    <SelectValue>{infoUjian.tahunAjaran || "Pilih tahun ajaran"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {tahunOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors["tahunAjaran"] && <p className="text-xs text-destructive">{errors["tahunAjaran"]}</p>}
              </div>
              <div className="grid gap-2">
                <Label>Semester <span className="text-destructive">*</span></Label>
                <Select
                  value={infoUjian.semester}
                  onValueChange={(v) => { if (v) handleInfoChange("semester", v) }}
                >
                  <SelectTrigger className={errors["semester"] ? "border-destructive" : ""}>
                    <SelectValue>{infoUjian.semester || "Pilih semester"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {semesterOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors["semester"] && <p className="text-xs text-destructive">{errors["semester"]}</p>}
              </div>
              {referensi && tahunOptions.length === 0 && (
                <p className="col-span-2 text-xs text-muted-foreground">
                  Belum ada tahun ajaran. Tambahkan dulu di Master Data &gt; Tahun Ajaran.
                </p>
              )}
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
          {errors["soalList"] && <p className="text-xs text-destructive">{errors["soalList"]}</p>}

          <div id="tour-daftar-soal" className="max-h-[calc(100vh-180px)] overflow-y-auto pr-2 space-y-4">
            <Accordion className="space-y-4" value={openItems} onValueChange={setOpenItems}>
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
    const updatedOpsi = soal.opsi.map((o, i) => (i === oIdx ? { ...o, teks } : o))

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
                        maxLength={1000}
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