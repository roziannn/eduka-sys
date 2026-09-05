"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { driver } from "driver.js"
import "driver.js/dist/driver.css"

import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  HelpCircle,
  CheckCircle2,
  HelpCircleIcon,
  Eye,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

// --- TYPES ---
interface OpsiJawaban {
  id: string
  teks: string
  isBenar: boolean
}

interface SoalItem {
  id: string
  pertanyaan: string
  tipe: "Pilihan Ganda" | "Essai"
  bobot: number
  opsi: OpsiJawaban[]
}

const listMapel = ["Matematika", "Bahasa Indonesia", "Bahasa Inggris", "Fisika", "Kimia", "Biologi"]
const listKelas = ["X IPA", "X IPS", "XI IPA", "XI IPS", "XII IPA", "XII IPS"]

export default function CreateKuisPage() {
  const router = useRouter()

  // --- STATE KUIS ---
  const [judulKuis, setJudulKuis] = React.useState("")
  const [deskripsi, setDeskripsi] = React.useState("")
  const [mataPelajaran, setMataPelajaran] = React.useState(listMapel[0])
  const [targetKelas, setTargetKelas] = React.useState<string[]>(["X IPA"])
  const [durasiMenit, setDurasiMenit] = React.useState(15)
  const [acakSoal, setAcakSoal] = React.useState(true)
  const [tampilkanHasil, setTampilkanHasil] = React.useState(true)

  // --- STATE ACCORDION TERBUKA ---
  const [openItems, setOpenItems] = React.useState<string[]>(["s-1"])

  // --- STATE SOAL ---
  const [soalList, setSoalList] = React.useState<SoalItem[]>([
    {
      id: "s-1",
      pertanyaan: "",
      tipe: "Pilihan Ganda",
      bobot: 10,
      opsi: [
        { id: "o-1", teks: "", isBenar: true },
        { id: "o-2", teks: "", isBenar: false },
        { id: "o-3", teks: "", isBenar: false },
        { id: "o-4", teks: "", isBenar: false },
      ],
    },
  ])

  // --- KONFIGURASI DRIVER.JS (GUIDED TOUR) ---
  const startTour = React.useCallback(() => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      showButtons: ["next", "previous", "close"],
      nextBtnText: "Lanjut",
      prevBtnText: "Kembali",
      doneBtnText: "Selesai",
      steps: [
        {
          element: "#tour-card-info",
          popover: {
            title: "Informasi Kuis",
            description: "Isi judul kuis, deskripsi instruksi, mata pelajaran, dan durasi pengerjaan di bagian ini.",
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-distribusi-kelas",
          popover: {
            title: "Distribusi Kelas",
            description: "Pilih satu atau beberapa kelas yang diperbolehkan mengakses kuis ini.",
            side: "right",
            align: "start",
          },
        },
        {
          element: "#tour-tombol-tambah-soal",
          popover: {
            title: "Tambah Pertanyaan",
            description: "Gunakan tombol ini untuk menambah pertanyaan baru bertipe Pilihan Ganda atau Isian/Essai.",
            side: "bottom",
            align: "end",
          },
        },
        {
          element: "#tour-daftar-soal",
          popover: {
            title: "Daftar Soal Kuis",
            description: "Atur pertanyaan, poin/bobot nilai, opsi pilihan jawaban, serta pilih kunci jawaban yang benar.",
            side: "left",
            align: "start",
          },
        },
        {
          element: "#tour-action-buttons",
          popover: {
            title: "Aksi Simpan & Publikasi",
            description: "Anda dapat melihat preview kuis, menyimpan draft untuk diedit lagi nanti, atau langsung mempublikasikannya.",
            side: "bottom",
            align: "end",
          },
        },
      ],
    })

    driverObj.drive()
  }, [])

  // Jalankan Tour Otomatis SETIAP KALI Halaman Dimuat / Di-refresh
  React.useEffect(() => {
    const timer = setTimeout(() => {
      startTour()
    }, 500)
    return () => clearTimeout(timer)
  }, [startTour])

  // Total Poin Keseluruhan
  const totalBobot = React.useMemo(() => {
    return soalList.reduce((acc, curr) => acc + (Number(curr.bobot) || 0), 0)
  }, [soalList])

  // --- HANDLER MULTIPLE KELAS ---
  const handleToggleKelas = (itemKelas: string) => {
    setTargetKelas((prev) =>
      prev.includes(itemKelas)
        ? prev.filter((k) => k !== itemKelas)
        : [...prev, itemKelas]
    )
  }

  // --- HANDLERS SOAL ---
  const handleAddSoal = (tipe: "Pilihan Ganda" | "Essai") => {
    const newId = `s-${Date.now()}`
    const newSoal: SoalItem = {
      id: newId,
      pertanyaan: "",
      tipe,
      bobot: 10,
      opsi:
        tipe === "Pilihan Ganda"
          ? [
              { id: `o-${Date.now()}-1`, teks: "", isBenar: true },
              { id: `o-${Date.now()}-2`, teks: "", isBenar: false },
              { id: `o-${Date.now()}-3`, teks: "", isBenar: false },
              { id: `o-${Date.now()}-4`, teks: "", isBenar: false },
            ]
          : [],
    }
    setSoalList([...soalList, newSoal])
    setOpenItems((prev) => [...prev, newId])
  }

  const handleRemoveSoal = (index: number) => {
    const targetId = soalList[index].id
    setSoalList(soalList.filter((_, i) => i !== index))
    setOpenItems((prev) => prev.filter((id) => id !== targetId))
  }

  const handleUpdateSoalPertanyaan = (index: number, teks: string) => {
    const updated = [...soalList]
    updated[index].pertanyaan = teks
    setSoalList(updated)
  }

  const handleUpdateBobot = (index: number, bobot: number) => {
    const updated = [...soalList]
    updated[index].bobot = bobot
    setSoalList(updated)
  }

  const handleUpdateOpsiTeks = (soalIdx: number, opsiIdx: number, teks: string) => {
    const updated = [...soalList]
    updated[soalIdx].opsi[opsiIdx].teks = teks
    setSoalList(updated)
  }

  const handleSetOpsiBenar = (soalIdx: number, opsiIdx: number) => {
    const updated = [...soalList]
    updated[soalIdx].opsi = updated[soalIdx].opsi.map((o, i) => ({
      ...o,
      isBenar: i === opsiIdx,
    }))
    setSoalList(updated)
  }

  const handleOpenPreviewPage = () => {
    const previewData = {
      judulKuis,
      deskripsi,
      mataPelajaran,
      targetKelas,
      durasiMenit,
      soalList,
    }
    sessionStorage.setItem("previewKuisData", JSON.stringify(previewData))
    window.open("/dashboard/soal-kuis/create/preview-soal", "_blank")
  }

  const handleSave = (status: "Draft" | "Dipublikasikan") => {
    const payload = {
      judulKuis,
      deskripsi,
      mataPelajaran,
      targetKelas,
      durasiMenit,
      acakSoal,
      tampilkanHasil,
      status,
      jumlahSoal: soalList.length,
      totalBobot,
      soalList,
    }

    console.log("Saving Kuis Payload:", payload)
    router.push("/dashboard/soal-kuis")
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header & Navigasi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <HelpCircleIcon className="h-5 w-5" /> Buat Kuis Baru
            </h1>
            <p className="text-sm text-muted-foreground">
              Atur informasi kuis dan buat daftar pertanyaan latihan.
            </p>
          </div>
        </div>

        <div id="tour-action-buttons" className="flex items-center gap-2">
          {/* Tombol Pemicu Tour */}
          <Button variant="ghost" size="icon" title="Bantuan Tour" onClick={startTour}>
            <HelpCircle className="h-5 w-5 text-muted-foreground" />
          </Button>

          <Button variant="outline" onClick={handleOpenPreviewPage}>
            <Eye className="mr-2 h-4 w-4" /> Preview Kuis
          </Button>
          <Button variant="outline" onClick={() => handleSave("Draft")}>
            <Save className="mr-2 h-4 w-4" /> Simpan Draft
          </Button>
          <Button onClick={() => handleSave("Dipublikasikan")}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> Publikasikan Kuis
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Kolom Kiri: Sticky Card Pengaturan Kuis */}
        <div className="lg:col-span-1 lg:sticky lg:top-6 self-start space-y-6">
          <Card id="tour-card-info">
            <CardHeader>
              <CardTitle className="text-lg">Informasi Kuis</CardTitle>
              <CardDescription>
                Pengaturan dan informasi kuis. <span className="text-destructive">*</span> 
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="judulKuis">
                  Judul Kuis <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="judulKuis"
                  placeholder="Contoh: Kuis Matematika - Persamaan Kuadrat"
                  value={judulKuis}
                  onChange={(e) => setJudulKuis(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="deskripsi">Deskripsi Kuis (Opsional)</Label>
                <Textarea
                  id="deskripsi"
                  placeholder="Instruksi singkat pengerjaan kuis..."
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  className="min-h-[70px]"
                />
              </div>

              {/* MAPEL */}
              <div className="grid gap-2">
                <Label>
                  Mata Pelajaran <span className="text-destructive">*</span>
                </Label>
                <Select value={mataPelajaran} onValueChange={(v) => v && setMataPelajaran(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih Mapel" />
                  </SelectTrigger>
                  <SelectContent>
                    {listMapel.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* DISTRIBUSI KELAS (MULTIPLE SELECTION) */}
              <div id="tour-distribusi-kelas" className="grid gap-2">
                <Label>
                  Distribusi Kelas <span className="text-destructive">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-2 bg-muted/30 p-3 rounded-lg border">
                  {listKelas.map((k) => {
                    const isChecked = targetKelas.includes(k)
                    return (
                      <div key={k} className="flex items-center space-x-2">
                        <Checkbox
                          id={`kelas-${k}`}
                          checked={isChecked}
                          onCheckedChange={() => handleToggleKelas(k)}
                        />
                        <Label
                          htmlFor={`kelas-${k}`}
                          className="text-xs font-normal cursor-pointer select-none"
                        >
                          {k}
                        </Label>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* DURASI */}
              <div className="grid gap-2 pt-1">
                <Label htmlFor="durasi">
                  Durasi Pengerjaan (Menit) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="durasi"
                  type="number"
                  min={1}
                  value={durasiMenit}
                  onChange={(e) => setDurasiMenit(Number(e.target.value))}
                  required
                />
              </div>

              {/* SWITCH ATURAN */}
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Acak Urutan Soal</Label>
                    <p className="text-xs text-muted-foreground">Urutan soal diacak untuk tiap peserta.</p>
                  </div>
                  <Switch checked={acakSoal} onCheckedChange={setAcakSoal} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Tampilkan Hasil Langsung</Label>
                    <p className="text-xs text-muted-foreground">Siswa dapat melihat skor setelah selesai.</p>
                  </div>
                  <Switch checked={tampilkanHasil} onCheckedChange={setTampilkanHasil} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Kolom Kanan: Scrollable Area untuk Soal Kuis */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 bg-background z-10 py-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <HelpCircle className="h-5 w-5" /> Pertanyaan Kuis ({soalList.length})
            </h2>
            <div id="tour-tombol-tambah-soal" className="flex items-center gap-2">
              <Button size="sm" onClick={() => handleAddSoal("Pilihan Ganda")}>
                <Plus className="mr-1 h-3.5 w-3.5" /> PG Baru
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleAddSoal("Essai")}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Isian / Essai
              </Button>
            </div>
          </div>

          <div id="tour-daftar-soal" className="max-h-[calc(100vh-180px)] overflow-y-auto pr-2 space-y-4 rounded-md">
            <Accordion
              {...({
                type: "multiple",
                value: openItems,
                onValueChange: setOpenItems,
              } as React.ComponentProps<typeof Accordion>)}
              className="space-y-4"
            >
              {soalList.map((soal, sIdx) => (
                <AccordionItem
                  key={soal.id}
                  value={soal.id}
                  className="border rounded-lg bg-card px-4 py-1"
                >
                  <div className="flex items-center justify-between w-full">
                    <AccordionTrigger className="hover:no-underline py-3 flex-1">
                      <div className="flex items-center gap-2 text-left">
                        <Badge variant="outline">No. {sIdx + 1}</Badge>
                        <Badge>{soal.tipe}</Badge>
                        <span className="text-sm font-normal text-muted-foreground line-clamp-1 max-w-[150px] sm:max-w-[240px]">
                          {soal.pertanyaan || "Pertanyaan belum diisi..."}
                        </span>
                      </div>
                    </AccordionTrigger>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md border">
                        <Label htmlFor={`bobot-${soal.id}`} className="text-xs text-muted-foreground whitespace-nowrap">
                          Poin <span className="text-destructive">*</span>:
                        </Label>
                        <Input
                          id={`bobot-${soal.id}`}
                          type="number"
                          min={0}
                          value={soal.bobot}
                          onChange={(e) => handleUpdateBobot(sIdx, Number(e.target.value))}
                          onClick={(e) => e.stopPropagation()}
                          className="w-16 h-7 text-xs px-2 text-center bg-background"
                          required
                        />
                      </div>

                      {soalList.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveSoal(sIdx)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <AccordionContent className="pt-2 pb-4 space-y-4 border-t mt-1">
                    <div className="grid gap-2 pt-1 px-1">
                      <Label>
                        Pertanyaan Soal <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        placeholder="Tuliskan pertanyaan kuis di sini..."
                        value={soal.pertanyaan}
                        onChange={(e) => handleUpdateSoalPertanyaan(sIdx, e.target.value)}
                        className="min-h-[90px]"
                        required
                      />
                    </div>

                    {soal.tipe === "Pilihan Ganda" && (
                      <div className="space-y-3 pt-2">
                        <Label className="text-xs text-muted-foreground">
                          Opsi Jawaban <span className="text-destructive">*</span>
                        </Label>
                        <div className="space-y-2">
                          {soal.opsi.map((opsi, oIdx) => {
                            const labelOpsi = String.fromCharCode(65 + oIdx)
                            return (
                              <div key={opsi.id} className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={opsi.isBenar ? "default" : "outline"}
                                  className={`w-9 h-9 p-0 shrink-0 ${
                                    opsi.isBenar ? "bg-emerald-600 hover:bg-emerald-700" : ""
                                  }`}
                                  onClick={() => handleSetOpsiBenar(sIdx, oIdx)}
                                >
                                  {labelOpsi}
                                </Button>
                                <Input
                                  placeholder={`Pilihan ${labelOpsi}...`}
                                  value={opsi.teks}
                                  onChange={(e) => handleUpdateOpsiTeks(sIdx, oIdx, e.target.value)}
                                  required
                                />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </div>
  )
}